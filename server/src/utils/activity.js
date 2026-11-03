import { db } from '../db.js';

const stmt = db.prepare(
  'INSERT INTO activity_logs (user_id, project_id, action, entity_type, entity_id, message) VALUES (?, ?, ?, ?, ?, ?)'
);

export function logActivity({ userId, projectId = null, action, entityType, entityId = null, message }) {
  stmt.run(userId ?? null, projectId, action, entityType, entityId, message);
}
