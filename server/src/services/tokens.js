import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' });
}
export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, typ: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: `${Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30)}d` });
}
export function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
export function opaqueToken() { return crypto.randomBytes(32).toString('hex'); }
export function verifyAccessToken(token) { return jwt.verify(token, process.env.JWT_ACCESS_SECRET); }
export function verifyRefreshToken(token) { return jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
