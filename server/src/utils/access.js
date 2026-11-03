import { db } from '../db.js';

export const isAdmin = (user) => user.role === 'admin';

export function canViewProject(user, project) {
  if (!project) return false;
  if (isAdmin(user) || project.owner_id === user.id) return true;
  return !!db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(project.id, user.id);
}

export function canManageProject(user, project) {
  if (!project) return false;
  return isAdmin(user) || (user.role === 'manager' && project.owner_id === user.id);
}

/** SQL fragment restricting rows of alias `p` (projects) to those visible to the user. */
export function visibleProjectsClause(user, alias = 'p') {
  if (isAdmin(user)) return { sql: '1=1', params: [] };
  return {
    sql: `(${alias}.owner_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ${alias}.id AND pm.user_id = ?))`,
    params: [user.id, user.id],
  };
}
