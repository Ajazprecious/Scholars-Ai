import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { pool } from '../db.js';
import { hashToken, opaqueToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/tokens.js';
import { sendActionEmail } from '../services/email.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(254), password: z.string().min(10).max(128) });
const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/' };
function setSession(res, user) {
  res.cookie('ajazai_access', signAccessToken(user), { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  const refresh = signRefreshToken(user);
  res.cookie('ajazai_refresh', refresh, { ...cookieOptions, maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 86400000 });
  return pool.query('INSERT INTO refresh_sessions(user_id, token_hash, expires_at) VALUES($1,$2,now()+make_interval(days => $3::int))', [user.id, hashToken(refresh), Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30)]);
}
function publicUser(row) { return { id: row.id, name: row.name, email: row.email, role: row.role, emailVerified: Boolean(row.email_verified), avatarUrl: row.avatar_url || null }; }

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const created = await pool.query(`INSERT INTO users(name,email,password_hash,role) VALUES($1,lower($2),$3,'student') RETURNING id,name,email,role,email_verified,avatar_url`, [data.name, data.email, passwordHash]);
    const token = opaqueToken();
    await pool.query(`INSERT INTO email_verification_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '24 hours')`, [created.rows[0].id, hashToken(token)]);
    const url = `${process.env.APP_URL}/verify-email?token=${token}`;
    await sendActionEmail({ to: data.email, subject: 'Verify your AjazAI email', url, action: 'verify your email' });
    res.status(201).json({ message: 'Account created. Check your email to verify your account.', user: publicUser(created.rows[0]) });
  } catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'An account with this email already exists' }); next(e); }
});

router.post('/verify-email', async (req,res,next) => {
  try {
    const token = z.string().min(32).parse(req.body.token);
    const result = await pool.query(`UPDATE users SET email_verified=true WHERE id=(SELECT user_id FROM email_verification_tokens WHERE token_hash=$1 AND expires_at>now()) RETURNING id`, [hashToken(token)]);
    if (!result.rowCount) return res.status(400).json({ error: 'Verification link is invalid or expired' });
    await pool.query('DELETE FROM email_verification_tokens WHERE token_hash=$1', [hashToken(token)]);
    res.json({ message: 'Email verified. You can now sign in.' });
  } catch(e) { next(e); }
});

router.post('/login', async (req,res,next) => {
  try {
    const data = credentialsSchema.parse(req.body);
    const result = await pool.query('SELECT id,name,email,password_hash,role,email_verified,avatar_url FROM users WHERE email=lower($1)', [data.email]);
    const user = result.rows[0];
    if (!user || !user.password_hash || !(await bcrypt.compare(data.password,user.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.email_verified) return res.status(403).json({ error: 'Please verify your email before signing in', code: 'EMAIL_NOT_VERIFIED' });
    await setSession(res,user);
    res.json({ user: publicUser(user) });
  } catch(e) { next(e); }
});

router.post('/google', async (req,res,next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in is not configured yet' });
    const idToken = z.string().min(20).parse(req.body.credential);
    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const p = ticket.getPayload();
    if (!p?.email || !p.email_verified) return res.status(401).json({ error: 'Google account email is not verified' });
    const result = await pool.query(`INSERT INTO users(name,email,google_sub,email_verified,avatar_url,role) VALUES($1,lower($2),$3,true,$4,'student') ON CONFLICT(email) DO UPDATE SET google_sub=EXCLUDED.google_sub, email_verified=true, avatar_url=COALESCE(EXCLUDED.avatar_url,users.avatar_url) RETURNING id,name,email,role,email_verified,avatar_url`, [p.name || p.email.split('@')[0],p.email,p.sub,p.picture || null]);
    await setSession(res,result.rows[0]);
    res.json({ user: publicUser(result.rows[0]) });
  } catch(e) { next(e); }
});

router.get('/me', requireAuth, async (req,res,next) => {
  try { const r=await pool.query('SELECT id,name,email,role,email_verified,avatar_url FROM users WHERE id=$1',[req.auth.sub]); if(!r.rowCount) return res.status(401).json({error:'Account not found'}); res.json({user:publicUser(r.rows[0])}); } catch(e){next(e);}
});

router.post('/refresh', async (req,res,next) => {
  try {
    const token=req.cookies?.ajazai_refresh;
    if(!token) return res.status(401).json({error:'Refresh session missing'});
    const claims=verifyRefreshToken(token);
    const old=await pool.query('DELETE FROM refresh_sessions WHERE user_id=$1 AND token_hash=$2 RETURNING user_id',[claims.sub,hashToken(token)]);
    if(!old.rowCount) return res.status(401).json({error:'Refresh session revoked'});
    const u=await pool.query('SELECT id,name,email,role,email_verified,avatar_url FROM users WHERE id=$1',[claims.sub]);
    if(!u.rowCount) return res.status(401).json({error:'Account not found'});
    await setSession(res,u.rows[0]); res.json({user:publicUser(u.rows[0])});
  } catch(e){res.clearCookie('ajazai_access',cookieOptions);res.clearCookie('ajazai_refresh',cookieOptions);next(e);}
});

router.post('/logout', async (req,res,next) => {
  try { const token=req.cookies?.ajazai_refresh; if(token) await pool.query('DELETE FROM refresh_sessions WHERE token_hash=$1',[hashToken(token)]); res.clearCookie('ajazai_access',cookieOptions);res.clearCookie('ajazai_refresh',cookieOptions);res.status(204).end(); } catch(e){next(e);}
});

router.post('/forgot-password', async (req,res,next) => {
  try { const email=z.string().email().parse(req.body.email); const u=await pool.query('SELECT id,email FROM users WHERE email=lower($1)',[email]); if(u.rowCount){ const token=opaqueToken(); await pool.query(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')`,[u.rows[0].id,hashToken(token)]); await sendActionEmail({to:email,subject:'Reset your AjazAI password',url:`${process.env.APP_URL}/reset-password?token=${token}`,action:'reset your password'}); } res.json({message:'If an account exists for that email, a reset link has been sent.'}); } catch(e){next(e);}
});
router.post('/reset-password', async (req,res,next) => {
  try { const token=z.string().min(32).parse(req.body.token); const password=z.string().min(10).max(128).parse(req.body.password); const hash=await bcrypt.hash(password,12); const r=await pool.query(`UPDATE users SET password_hash=$1 WHERE id=(SELECT user_id FROM password_reset_tokens WHERE token_hash=$2 AND expires_at>now()) RETURNING id`,[hash,hashToken(token)]); if(!r.rowCount) return res.status(400).json({error:'Reset link is invalid or expired'}); await pool.query('DELETE FROM password_reset_tokens WHERE token_hash=$1',[hashToken(token)]); await pool.query('DELETE FROM refresh_sessions WHERE user_id=$1',[r.rows[0].id]); res.json({message:'Password updated. Please sign in again.'}); } catch(e){next(e);}
});
export default router;
