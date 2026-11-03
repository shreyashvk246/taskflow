import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db.js';
import { forbidden, unauthorized } from '../utils/errors.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

const getUser = db.prepare('SELECT id, name, email, role, status, job_title FROM users WHERE id = ?');

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = getUser.get(payload.sub);
    if (!user) return next(unauthorized('User no longer exists'));
    if (user.status !== 'active') return next(unauthorized('Your account has been deactivated'));
    req.user = user;
    next();
  } catch {
    next(unauthorized('Invalid or expired session'));
  }
}

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};
