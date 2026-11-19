import { verifyAccessToken } from '../services/tokens.js';
export function requireAuth(req, res, next) {
  const token = req.cookies?.ajazai_access || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.auth = verifyAccessToken(token); return next(); }
  catch { return res.status(401).json({ error: 'Session expired or invalid' }); }
}
