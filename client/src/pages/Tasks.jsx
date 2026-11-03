import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckSquare, MessageSquare, Plus, Search, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TaskForm from '../components/TaskForm';
import TaskDetail from '../components/TaskDetail';
import { StatusBadge } from '../components/TaskRow';
import { Avatar, Badge, EmptyState, PageHeader, PageLoader } from '../components/ui';
import { PRIORITY, TASK_STATUS, cx, formatDate, isOverdue } from '../utils';

export default function Tasks() {
  const { user, hasRole } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState(null);
  const [projects, setProjects] = useState([]);
  const [taskForm, setTaskForm] = useState({ open: false, task: null });

  const filters = {
    search: params.get('search') || '', status: params.get('status') || '', priority: params.get('priority') || '',
    project_id: params.get('project_id') || '', mine: params.get('mine') || '', overdue: params.get('overdue') || '',
  };
  const openTask = params.get('task') ? Number(params.get('task')) : null;

  const setFilter = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const key = JSON.stringify(filters);
  const load = useCallback(() => {
    api.tasks(JSON.parse(key)).then((d) => setTasks(d.tasks)).catch((e) => toast.error(e.message));
  }, [key]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.projects().then((d) => setProjects(d.projects)).catch(() => {}); }, []);

  const closeTask = useCallback(() => setFilter('task', ''), [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const manageable = useMemo(() => projects.filter((p) => p.can_manage), [projects]);
  const hasFilters = Object.values(filters).some(Boolean);

  const quickStatus = async (task, status) => {
    try { await api.updateTaskStatus(task.id, status); load(); toast.success('Status updated'); } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <PageHeader title="Tasks" description={filters.mine ? 'Tasks assigned to you.' : hasRole('admin') ? 'All tasks across every project.' : 'Tasks in projects you belong to.'}
        actions={manageable.length > 0 && <button className="btn-primary" onClick={() => setTaskForm({ open: true, task: null })}><Plus className="h-4 w-4" /> New task</button>} />

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {[['', 'All tasks'], ['1', 'Assigned to me']].map(([v, label]) => (
          <button key={label} onClick={() => setFilter('mine', v)}
            className={cx('-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition', filters.mine === v ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>{label}</button>
        ))}
      </div>

      <div className="mb-5 flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search tasks..." value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />
        </div>
        <select className="input sm:w-44" value={filters.project_id} onChange={(e) => setFilter('project_id', e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input sm:w-36" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">Any status</option>
          {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input sm:w-36" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
          <option value="">Any priority</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={!!filters.overdue} onChange={(e) => setFilter('overdue', e.target.checked ? '1' : '')} /> Overdue only
        </label>
        {hasFilters && <button className="btn-ghost" onClick={() => setParams({}, { replace: true })}><X className="h-4 w-4" /> Clear</button>}
      </div>

      {!tasks ? <PageLoader /> : tasks.length === 0 ? (
        <div className="card"><EmptyState icon={CheckSquare} title="No tasks found" description={hasFilters ? 'Try adjusting your filters.' : 'Tasks will appear here once they are created.'} /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="table-th">Task</th><th className="table-th">Project</th><th className="table-th">Status</th>
              <th className="table-th">Priority</th><th className="table-th">Assignee</th><th className="table-th">Due</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setFilter('task', String(t.id))}>
                  <td className="table-td max-w-xs">
                    <p className="truncate font-medium text-slate-900">{t.title}</p>
                    {t.comment_count > 0 && <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400"><MessageSquare className="h-3 w-3" />{t.comment_count} comments</span>}
                  </td>
                  <td className="table-td whitespace-nowrap text-slate-500">{t.project_name}</td>
                  <td className="table-td" onClick={(e) => t.can_update_status && e.stopPropagation()}>
                    {t.can_update_status ? (
                      <select value={t.status} onChange={(e) => quickStatus(t, e.target.value)}
                        className="rounded-md border border-slate-200 bg-white py-1 pl-2 pr-7 text-xs font-medium text-slate-700 focus:border-brand-500 focus:ring-brand-500/20">
                        {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    ) : <StatusBadge status={t.status} />}
                  </td>
                  <td className="table-td"><Badge className={PRIORITY[t.priority].color}>{PRIORITY[t.priority].label}</Badge></td>
                  <td className="table-td whitespace-nowrap">
                    {t.assignee_name ? <span className="flex items-center gap-2"><Avatar name={t.assignee_name} size="xs" />{t.assignee_id === user.id ? 'You' : t.assignee_name}</span> : <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className={cx('table-td whitespace-nowrap', isOverdue(t) && 'font-medium text-red-600')}>{formatDate(t.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing {tasks.length} task{tasks.length !== 1 && 's'}</div>
        </div>
      )}

      <TaskForm open={taskForm.open} onClose={() => setTaskForm({ open: false, task: null })} task={taskForm.task}
        projects={manageable} projectId={filters.project_id && manageable.some((p) => String(p.id) === filters.project_id) ? Number(filters.project_id) : undefined} onSaved={load} />
      <TaskDetail taskId={openTask} onClose={closeTask} onChanged={load} onEdit={(t) => { closeTask(); setTaskForm({ open: true, task: t }); }} />
    </div>
  );
}
