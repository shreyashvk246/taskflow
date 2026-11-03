import { Router } from 'express';
import { db } from '../db.js';
import { authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authorize('admin'), (req, res) => {
  const { entity_type, action, user_id, search = '' } = req.query;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = ['1=1'];
  const params = [];
  if (entity_type) { where.push('a.entity_type = ?'); params.push(entity_type); }
  if (action) { where.push('a.action = ?'); params.push(action); }
  if (user_id) { where.push('a.user_id = ?'); params.push(Number(user_id)); }
  if (search) { where.push('a.message LIKE ?'); params.push(`%${search}%`); }
  const total = db.prepare(`SELECT COUNT(*) AS c FROM activity_logs a WHERE ${where.join(' AND ')}`).get(...params).c;
  const logs = db
    .prepare(
      `SELECT a.*, u.name AS user_name, u.role AS user_role FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
       WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  res.json({ logs, total, limit, offset });
});

export default router;
