import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { parse } from '../utils/validate.js';
import { badRequest, conflict, unauthorized } from '../utils/errors.js';
import { logActivity } from '../utils/activity.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, status: u.status,
  job_title: u.job_title, last_login_at: u.last_login_at, created_at: u.created_at,
});

const password = z.string().min(8, 'Password must be at least 8 characters').max(100);

router.post('/login', limiter, (req, res) => {
  const { email, password: pwd } = parse(
    z.object({ email: z.string().trim().email('Enter a valid email'), password: z.string().min(1, 'Password is required') }),
    req.body
  );
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(pwd, user.password_hash)) throw unauthorized('Invalid email or password');
  if (user.status !== 'active') throw unauthorized('Your account has been deactivated. Contact an administrator.');
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  logActivity({ userId: user.id, action: 'login', entityType: 'user', entityId: user.id, message: `${user.name} signed in` });
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/register', limiter, (req, res) => {
  const data = parse(
    z.object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
      email: z.string().trim().email('Enter a valid email'),
      password,
    }),
    req.body
  );
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) throw conflict('An account with this email already exists');
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash, role, last_login_at) VALUES (?, ?, ?, 'member', datetime('now'))")
    .run(data.name, data.email, bcrypt.hashSync(data.password, 10));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  logActivity({ userId: user.id, action: 'register', entityType: 'user', entityId: user.id, message: `${user.name} created an account` });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

router.put('/me', authenticate, (req, res) => {
  const data = parse(
    z.object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().email('Enter a valid email'),
      job_title: z.string().trim().max(80).optional().nullable(),
    }),
    req.body
  );
  const clash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(data.email, req.user.id);
  if (clash) throw conflict('Email is already in use');
  db.prepare("UPDATE users SET name = ?, email = ?, job_title = ?, updated_at = datetime('now') WHERE id = ?")
    .run(data.name, data.email, data.job_title || null, req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

router.put('/me/password', authenticate, (req, res) => {
  const data = parse(z.object({ current_password: z.string().min(1, 'Current password is required'), new_password: password }), req.body);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(data.current_password, user.password_hash)) throw badRequest('Current password is incorrect');
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(bcrypt.hashSync(data.new_password, 10), user.id);
  logActivity({ userId: user.id, action: 'password_change', entityType: 'user', entityId: user.id, message: `${user.name} changed their password` });
  res.json({ message: 'Password updated successfully' });
});

export { publicUser };
export default router;
