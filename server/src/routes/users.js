import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { authorize } from '../middleware/auth.js';
import { parse, toId } from '../utils/validate.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { logActivity } from '../utils/activity.js';
import { ROLES } from '../config.js';
import { publicUser } from './auth.js';

const router = Router();

const USER_COLS = `u.id, u.name, u.email, u.role, u.status, u.job_title, u.last_login_at, u.created_at,
  (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status != 'done') AS open_tasks,
  (SELECT COUNT(*) FROM projects p WHERE p.owner_id = u.id OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = u.id)) AS project_count`;

// Admins and managers can list users (managers need it to build teams and assign tasks)
router.get('/', authorize('admin', 'manager'), (req, res) => {
  const { search = '', role, status } = req.query;
  const where = ['1=1'];
  const params = [];
  if (search) {
    where.push('(u.name LIKE ? OR u.email LIKE ? OR u.job_title LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (role && ROLES.includes(role)) { where.push('u.role = ?'); params.push(role); }
  if (status === 'active' || status === 'inactive') { where.push('u.status = ?'); params.push(status); }
  if (req.user.role !== 'admin') where.push("u.status = 'active'");
  const users = db.prepare(`SELECT ${USER_COLS} FROM users u WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC, u.id DESC`).all(...params);
  res.json({ users });
});

router.get('/:id', authorize('admin'), (req, res) => {
  const user = db.prepare(`SELECT ${USER_COLS} FROM users u WHERE u.id = ?`).get(toId(req.params.id));
  if (!user) throw notFound('User not found');
  res.json({ user });
});

const baseSchema = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Enter a valid email'),
  role: z.enum(ROLES),
  status: z.enum(['active', 'inactive']).default('active'),
  job_title: z.string().trim().max(80).optional().nullable(),
};

router.post('/', authorize('admin'), (req, res) => {
  const data = parse(z.object({ ...baseSchema, password: z.string().min(8, 'Password must be at least 8 characters').max(100) }), req.body);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) throw conflict('An account with this email already exists');
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role, status, job_title) VALUES (?, ?, ?, ?, ?, ?)')
    .run(data.name, data.email, bcrypt.hashSync(data.password, 10), data.role, data.status, data.job_title || null);
  logActivity({ userId: req.user.id, action: 'create', entityType: 'user', entityId: info.lastInsertRowid, message: `${req.user.name} created user ${data.name} (${data.role})` });
  res.status(201).json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)) });
});

router.put('/:id', authorize('admin'), (req, res) => {
  const id = toId(req.params.id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) throw notFound('User not found');
  const data = parse(z.object({ ...baseSchema, password: z.string().min(8).max(100).optional().or(z.literal('')) }), req.body);
  if (id === req.user.id && (data.role !== 'admin' || data.status !== 'active')) {
    throw badRequest('You cannot demote or deactivate your own account');
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(data.email, id)) throw conflict('Email is already in use');
  db.prepare(
    "UPDATE users SET name = ?, email = ?, role = ?, status = ?, job_title = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(data.name, data.email, data.role, data.status, data.job_title || null, id);
  if (data.password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(data.password, 10), id);
  logActivity({ userId: req.user.id, action: 'update', entityType: 'user', entityId: id, message: `${req.user.name} updated user ${data.name}` });
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
});

router.delete('/:id', authorize('admin'), (req, res) => {
  const id = toId(req.params.id);
  if (id === req.user.id) throw badRequest('You cannot delete your own account');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) throw notFound('User not found');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  logActivity({ userId: req.user.id, action: 'delete', entityType: 'user', entityId: id, message: `${req.user.name} deleted user ${user.name}` });
  res.status(204).end();
});

export default router;
