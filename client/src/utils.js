export const TASK_STATUS = {
  todo: { label: 'To Do', color: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  review: { label: 'In Review', color: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  done: { label: 'Done', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
};

export const PRIORITY = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600 ring-slate-200' },
  medium: { label: 'Medium', color: 'bg-sky-50 text-sky-700 ring-sky-200' },
  high: { label: 'High', color: 'bg-orange-50 text-orange-700 ring-orange-200' },
  urgent: { label: 'Urgent', color: 'bg-red-50 text-red-700 ring-red-200' },
};

export const PROJECT_STATUS = {
  planning: { label: 'Planning', color: 'bg-violet-50 text-violet-700 ring-violet-200' },
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  on_hold: { label: 'On Hold', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export const ROLE = {
  admin: { label: 'Admin', color: 'bg-brand-50 text-brand-700 ring-brand-200' },
  manager: { label: 'Manager', color: 'bg-teal-50 text-teal-700 ring-teal-200' },
  member: { label: 'Member', color: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

const parseDate = (d) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d.replace(' ', 'T') + (d.includes('Z') || d.includes('T') ? '' : 'Z')) : null);

export function formatDate(d, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const date = parseDate(d);
  return date ? date.toLocaleDateString('en-US', opts) : '—';
}

export function timeAgo(d) {
  const date = parseDate(d);
  if (!date) return '';
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  const units = [[31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [secs, label] of units) if (s >= secs) return `${Math.floor(s / secs)}${label} ago`;
  return 'just now';
}

export function isOverdue(task) {
  if (!task.due_date || task.status === 'done') return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

export const cx = (...c) => c.filter(Boolean).join(' ');
