import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { authorize } from '../middleware/auth.js';
import { parse, toId } from '../utils/validate.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { logActivity } from '../utils/activity.js';
import { canManageProject, canViewProject, isAdmin, visibleProjectsClause } from '../utils/access.js';
import { PROJECT_STATUSES } from '../config.js';

const router = Router();

const PROJECT_SELECT = `
  SELECT p.*, o.name AS owner_name,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS done_count,
    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count
  FROM projects p LEFT JOIN users o ON o.id = p.owner_id`;

const withProgress = (p) => ({ ...p, progress: p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0 });

export function loadProject(id) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

router.get('/', (req, res) => {
  const { search = '', status } = req.query;
  const vis = visibleProjectsClause(req.user);
  const where = [vis.sql];
  const params = [...vis.params];
  if (search) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (status && PROJECT_STATUSES.includes(status)) { where.push('p.status = ?'); params.push(status); }
  const rows = db.prepare(`${PROJECT_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.updated_at DESC, p.id DESC`).all(...params);
  const memberStmt = db.prepare(
    'SELECT u.id, u.name FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ? ORDER BY u.name LIMIT 5'
  );
  res.json({
    projects: rows.map((p) => ({ ...withProgress(p), members: memberStmt.all(p.id), can_manage: canManageProject(req.user, p) })),
  });
});

router.get('/:id', (req, res) => {
  const id = toId(req.params.id);
  const project = db.prepare(`${PROJECT_SELECT} WHERE p.id = ?`).get(id);
  if (!project) throw notFound('Project not found');
  if (!canViewProject(req.user, project)) throw forbidden('You are not a member of this project');
  const members = db.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.job_title,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = ? AND t.assignee_id = u.id AND t.status != 'done') AS open_tasks
     FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ? ORDER BY u.name`
  ).all(id, id);
  res.json({ project: { ...withProgress(project), members, can_manage: canManageProject(req.user, project) } });
});

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional().nullable().or(z.literal(''));
const projectSchema = z
  .object({
    name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(120),
    description: z.string().trim().max(2000).optional().nullable(),
    status: z.enum(PROJECT_STATUSES).default('planning'),
    start_date: dateStr,
    due_date: dateStr,
    owner_id: z.number().int().positive().optional().nullable(),
    member_ids: z.array(z.number().int().positive()).default([]),
  })
  .refine((d) => !d.start_date || !d.due_date || d.start_date <= d.due_date, { message: 'Due date must be after start date', path: ['due_date'] });

function resolveOwner(user, ownerId, fallback) {
  if (!isAdmin(user)) return fallback;
  if (!ownerId) return fallback;
  const owner = db.prepare("SELECT id, role FROM users WHERE id = ? AND status = 'active'").get(ownerId);
  if (!owner || owner.role === 'member') throw badRequest('Project owner must be an active admin or manager');
  return owner.id;
}

const setMembers = (projectId, ids) => {
  db.prepare('DELETE FROM project_members WHERE project_id = ?').run(projectId);
  const ins = db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) SELECT ?, id FROM users WHERE id = ?');
  [...new Set(ids)].forEach((uid) => ins.run(projectId, uid));
};

router.post('/', authorize('admin', 'manager'), (req, res) => {
  const data = parse(projectSchema, req.body);
  const ownerId = resolveOwner(req.user, data.owner_id, req.user.id);
  const id = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO projects (name, description, status, start_date, due_date, owner_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(data.name, data.description || null, data.status, data.start_date || null, data.due_date || null, ownerId);
    setMembers(info.lastInsertRowid, data.member_ids);
    return info.lastInsertRowid;
  })();
  logActivity({ userId: req.user.id, projectId: id, action: 'create', entityType: 'project', entityId: id, message: `${req.user.name} created project "${data.name}"` });
  res.status(201).json({ project: loadProject(id) });
});

router.put('/:id', (req, res) => {
  const id = toId(req.params.id);
  const project = loadProject(id);
  if (!project) throw notFound('Project not found');
  if (!canManageProject(req.user, project)) throw forbidden('Only the project owner or an admin can edit this project');
  const data = parse(projectSchema, req.body);
  const ownerId = resolveOwner(req.user, data.owner_id, project.owner_id);
  db.transaction(() => {
    db.prepare(
      "UPDATE projects SET name = ?, description = ?, status = ?, start_date = ?, due_date = ?, owner_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(data.name, data.description || null, data.status, data.start_date || null, data.due_date || null, ownerId, id);
    setMembers(id, data.member_ids);
  })();
  logActivity({ userId: req.user.id, projectId: id, action: 'update', entityType: 'project', entityId: id, message: `${req.user.name} updated project "${data.name}"` });
  res.json({ project: loadProject(id) });
});

router.delete('/:id', (req, res) => {
  const id = toId(req.params.id);
  const project = loadProject(id);
  if (!project) throw notFound('Project not found');
  if (!canManageProject(req.user, project)) throw forbidden('Only the project owner or an admin can delete this project');
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  logActivity({ userId: req.user.id, action: 'delete', entityType: 'project', entityId: id, message: `${req.user.name} deleted project "${project.name}"` });
  res.status(204).end();
});

export default router;
