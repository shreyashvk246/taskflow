import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { parse, toId } from '../utils/validate.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { logActivity } from '../utils/activity.js';
import { canManageProject, canViewProject, visibleProjectsClause } from '../utils/access.js';
import { PRIORITIES, TASK_STATUSES } from '../config.js';
import { loadProject } from './projects.js';

const router = Router();

const TASK_SELECT = `
  SELECT t.*, p.name AS project_name, p.owner_id AS project_owner_id,
    a.name AS assignee_name, c.name AS creator_name,
    (SELECT COUNT(*) FROM comments cm WHERE cm.task_id = t.id) AS comment_count
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  LEFT JOIN users a ON a.id = t.assignee_id
  LEFT JOIN users c ON c.id = t.created_by`;

const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done' };

function decorate(user, task) {
  const project = { id: task.project_id, owner_id: task.project_owner_id };
  const canManage = canManageProject(user, project);
  return { ...task, can_manage: canManage, can_update_status: canManage || task.assignee_id === user.id };
}

function loadTask(id) {
  return db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(id);
}

function getVisibleTask(user, id) {
  const task = loadTask(id);
  if (!task) throw notFound('Task not found');
  if (!canViewProject(user, { id: task.project_id, owner_id: task.project_owner_id })) throw forbidden('You do not have access to this task');
  return task;
}

function assertAssignable(projectId, assigneeId) {
  if (!assigneeId) return;
  const project = loadProject(projectId);
  const ok =
    project.owner_id === assigneeId ||
    db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, assigneeId);
  if (!ok) throw badRequest('Assignee must be the project owner or a project member');
  const u = db.prepare('SELECT status FROM users WHERE id = ?').get(assigneeId);
  if (!u || u.status !== 'active') throw badRequest('Assignee must be an active user');
}

router.get('/', (req, res) => {
  const { project_id, status, priority, assignee_id, search = '', mine, overdue } = req.query;
  const vis = visibleProjectsClause(req.user);
  const where = [vis.sql];
  const params = [...vis.params];
  if (project_id) { where.push('t.project_id = ?'); params.push(toId(project_id)); }
  if (status && TASK_STATUSES.includes(status)) { where.push('t.status = ?'); params.push(status); }
  if (priority && PRIORITIES.includes(priority)) { where.push('t.priority = ?'); params.push(priority); }
  if (assignee_id === 'unassigned') where.push('t.assignee_id IS NULL');
  else if (assignee_id) { where.push('t.assignee_id = ?'); params.push(toId(assignee_id)); }
  if (mine === '1' || mine === 'true') { where.push('t.assignee_id = ?'); params.push(req.user.id); }
  if (overdue === '1' || overdue === 'true') where.push("t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < date('now')");
  if (search) { where.push('(t.title LIKE ? OR t.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const tasks = db
    .prepare(
      `${TASK_SELECT} WHERE ${where.join(' AND ')}
       ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                t.due_date IS NULL, t.due_date, t.id DESC`
    )
    .all(...params);
  res.json({ tasks: tasks.map((t) => decorate(req.user, t)) });
});

router.get('/:id', (req, res) => {
  const task = getVisibleTask(req.user, toId(req.params.id));
  res.json({ task: decorate(req.user, task) });
});

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional().nullable().or(z.literal(''));
const taskSchema = z.object({
  project_id: z.number().int().positive(),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(TASK_STATUSES).default('todo'),
  priority: z.enum(PRIORITIES).default('medium'),
  assignee_id: z.number().int().positive().optional().nullable(),
  due_date: dateStr,
});

router.post('/', (req, res) => {
  const data = parse(taskSchema, req.body);
  const project = loadProject(data.project_id);
  if (!project) throw notFound('Project not found');
  if (!canManageProject(req.user, project)) throw forbidden('Only the project owner or an admin can create tasks');
  assertAssignable(project.id, data.assignee_id);
  const info = db
    .prepare(
      `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(project.id, data.title, data.description || null, data.status, data.priority, data.assignee_id || null, req.user.id,
      data.due_date || null, data.status === 'done' ? new Date().toISOString() : null);
  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(project.id);
  logActivity({ userId: req.user.id, projectId: project.id, action: 'create', entityType: 'task', entityId: info.lastInsertRowid, message: `${req.user.name} created task "${data.title}" in ${project.name}` });
  res.status(201).json({ task: decorate(req.user, loadTask(info.lastInsertRowid)) });
});

router.put('/:id', (req, res) => {
  const id = toId(req.params.id);
  const task = getVisibleTask(req.user, id);
  const project = loadProject(task.project_id);
  if (!canManageProject(req.user, project)) throw forbidden('Only the project owner or an admin can edit tasks');
  const data = parse(taskSchema.omit({ project_id: true }), req.body);
  assertAssignable(project.id, data.assignee_id);
  const completedAt = data.status === 'done' ? task.completed_at || new Date().toISOString() : null;
  db.prepare(
    `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, due_date = ?, completed_at = ?,
     updated_at = datetime('now') WHERE id = ?`
  ).run(data.title, data.description || null, data.status, data.priority, data.assignee_id || null, data.due_date || null, completedAt, id);
  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(project.id);
  logActivity({ userId: req.user.id, projectId: project.id, action: 'update', entityType: 'task', entityId: id, message: `${req.user.name} updated task "${data.title}"` });
  res.json({ task: decorate(req.user, loadTask(id)) });
});

router.patch('/:id/status', (req, res) => {
  const id = toId(req.params.id);
  const task = decorate(req.user, getVisibleTask(req.user, id));
  if (!task.can_update_status) throw forbidden('Only the assignee, project owner or an admin can change the status');
  const { status } = parse(z.object({ status: z.enum(TASK_STATUSES) }), req.body);
  if (status === task.status) return res.json({ task });
  const completedAt = status === 'done' ? new Date().toISOString() : null;
  db.prepare("UPDATE tasks SET status = ?, completed_at = ?, updated_at = datetime('now') WHERE id = ?").run(status, completedAt, id);
  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(task.project_id);
  logActivity({ userId: req.user.id, projectId: task.project_id, action: 'status', entityType: 'task', entityId: id, message: `${req.user.name} moved "${task.title}" to ${STATUS_LABEL[status]}` });
  res.json({ task: decorate(req.user, loadTask(id)) });
});

router.delete('/:id', (req, res) => {
  const id = toId(req.params.id);
  const task = getVisibleTask(req.user, id);
  if (!canManageProject(req.user, loadProject(task.project_id))) throw forbidden('Only the project owner or an admin can delete tasks');
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  logActivity({ userId: req.user.id, projectId: task.project_id, action: 'delete', entityType: 'task', entityId: id, message: `${req.user.name} deleted task "${task.title}"` });
  res.status(204).end();
});

// Comments
router.get('/:id/comments', (req, res) => {
  const task = getVisibleTask(req.user, toId(req.params.id));
  const comments = db
    .prepare('SELECT c.*, u.name AS user_name, u.role AS user_role FROM comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.task_id = ? ORDER BY c.created_at, c.id')
    .all(task.id);
  res.json({ comments });
});

router.post('/:id/comments', (req, res) => {
  const task = getVisibleTask(req.user, toId(req.params.id));
  const { body } = parse(z.object({ body: z.string().trim().min(1, 'Comment cannot be empty').max(2000) }), req.body);
  const info = db.prepare('INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)').run(task.id, req.user.id, body);
  logActivity({ userId: req.user.id, projectId: task.project_id, action: 'comment', entityType: 'task', entityId: task.id, message: `${req.user.name} commented on "${task.title}"` });
  const comment = db
    .prepare('SELECT c.*, u.name AS user_name, u.role AS user_role FROM comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = ?')
    .get(info.lastInsertRowid);
  res.status(201).json({ comment });
});

router.delete('/:id/comments/:commentId', (req, res) => {
  const task = getVisibleTask(req.user, toId(req.params.id));
  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND task_id = ?').get(toId(req.params.commentId), task.id);
  if (!comment) throw notFound('Comment not found');
  if (comment.user_id !== req.user.id && req.user.role !== 'admin') throw forbidden('You can only delete your own comments');
  db.prepare('DELETE FROM comments WHERE id = ?').run(comment.id);
  res.status(204).end();
});

export default router;
