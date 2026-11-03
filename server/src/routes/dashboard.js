import { Router } from 'express';
import { db } from '../db.js';
import { isAdmin, visibleProjectsClause } from '../utils/access.js';

const router = Router();

router.get('/', (req, res) => {
  const user = req.user;
  const vis = visibleProjectsClause(user);
  const scope = (sql) => db.prepare(sql);

  const projectStats = scope(
    `SELECT COUNT(*) AS total,
      SUM(p.status = 'active') AS active, SUM(p.status = 'completed') AS completed,
      SUM(p.status = 'planning') AS planning, SUM(p.status = 'on_hold') AS on_hold
     FROM projects p WHERE ${vis.sql}`
  ).get(...vis.params);

  const taskStats = scope(
    `SELECT COUNT(*) AS total,
      SUM(t.status = 'todo') AS todo, SUM(t.status = 'in_progress') AS in_progress,
      SUM(t.status = 'review') AS review, SUM(t.status = 'done') AS done,
      SUM(t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < date('now')) AS overdue,
      SUM(t.priority = 'low') AS low, SUM(t.priority = 'medium') AS medium,
      SUM(t.priority = 'high') AS high, SUM(t.priority = 'urgent') AS urgent
     FROM tasks t JOIN projects p ON p.id = t.project_id WHERE ${vis.sql}`
  ).get(...vis.params);

  const myTasks = scope(
    `SELECT COUNT(*) AS total, SUM(t.status != 'done') AS open,
      SUM(t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < date('now')) AS overdue,
      SUM(t.status = 'done') AS done
     FROM tasks t WHERE t.assignee_id = ?`
  ).get(user.id);

  const upcoming = scope(
    `SELECT t.id, t.title, t.status, t.priority, t.due_date, p.name AS project_name, p.id AS project_id
     FROM tasks t JOIN projects p ON p.id = t.project_id
     WHERE t.assignee_id = ? AND t.status != 'done'
     ORDER BY t.due_date IS NULL, t.due_date LIMIT 6`
  ).all(user.id);

  const projectProgress = scope(
    `SELECT p.id, p.name, p.status,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS total,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS done
     FROM projects p WHERE ${vis.sql} AND p.status != 'completed' ORDER BY p.updated_at DESC LIMIT 6`
  ).all(...vis.params);

  const actVis = isAdmin(user)
    ? { sql: '1=1', params: [] }
    : { sql: `(a.user_id = ? OR a.project_id IN (SELECT p.id FROM projects p WHERE ${vis.sql}))`, params: [user.id, ...vis.params] };
  const recentActivity = scope(
    `SELECT a.*, u.name AS user_name FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
     WHERE ${actVis.sql} AND a.action != 'login' ORDER BY a.created_at DESC, a.id DESC LIMIT 8`
  ).all(...actVis.params);

  const payload = { projectStats, taskStats, myTasks, upcoming, projectProgress, recentActivity };

  if (isAdmin(user)) {
    payload.userStats = scope(
      `SELECT COUNT(*) AS total, SUM(status = 'active') AS active, SUM(status = 'inactive') AS inactive,
        SUM(role = 'admin') AS admins, SUM(role = 'manager') AS managers, SUM(role = 'member') AS members
       FROM users`
    ).get();
    payload.workload = scope(
      `SELECT u.id, u.name,
        SUM(t.status != 'done') AS open, SUM(t.status = 'done') AS done
       FROM users u JOIN tasks t ON t.assignee_id = u.id
       GROUP BY u.id ORDER BY open DESC LIMIT 8`
    ).all();
  }
  res.json(payload);
});

export default router;
