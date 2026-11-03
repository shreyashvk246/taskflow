import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity as ActivityIcon, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { api } from '../api/client';
import { Avatar, Badge, EmptyState, PageHeader, PageLoader } from '../components/ui';
import { ROLE, timeAgo } from '../utils';

const ACTION_STYLE = {
  create: 'bg-emerald-50 text-emerald-700 ring-emerald-200', update: 'bg-sky-50 text-sky-700 ring-sky-200',
  delete: 'bg-red-50 text-red-700 ring-red-200', status: 'bg-amber-50 text-amber-700 ring-amber-200',
  comment: 'bg-violet-50 text-violet-700 ring-violet-200', login: 'bg-slate-100 text-slate-600 ring-slate-200',
};
const PAGE = 20;

export default function Activity() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ search: '', entity_type: '', action: '' });
  const [offset, setOffset] = useState(0);

  const load = useCallback(() => {
    api.activity({ ...filters, limit: PAGE, offset }).then(setData).catch((e) => toast.error(e.message));
  }, [filters, offset]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const set = (k) => (e) => { setOffset(0); setFilters({ ...filters, [k]: e.target.value }); };

  return (
    <div>
      <PageHeader title="Activity Logs" description="A complete audit trail of actions performed in the system." />
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search activity..." value={filters.search} onChange={set('search')} />
          </div>
          <select className="input sm:w-40" value={filters.entity_type} onChange={set('entity_type')}>
            <option value="">All entities</option><option value="project">Projects</option><option value="task">Tasks</option><option value="user">Users</option>
          </select>
          <select className="input sm:w-40" value={filters.action} onChange={set('action')}>
            <option value="">All actions</option>
            {['create', 'update', 'delete', 'status', 'comment', 'login'].map((a) => <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>)}
          </select>
        </div>
        {!data ? <PageLoader /> : data.logs.length === 0 ? <EmptyState icon={ActivityIcon} title="No activity found" /> : (
          <>
            <ul className="divide-y divide-slate-100">
              {data.logs.map((log) => (
                <li key={log.id} className="flex items-center gap-4 px-5 py-3.5">
                  <Avatar name={log.user_name || 'System'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800">{log.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {log.user_name || 'System'}{log.user_role && ` · ${ROLE[log.user_role].label}`} · {new Date(log.created_at.replace(' ', 'T') + 'Z').toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge className={ACTION_STYLE[log.action] || 'bg-slate-100 text-slate-600 ring-slate-200'}>{log.action}</Badge>
                    <span className="hidden w-16 text-right text-xs text-slate-400 sm:block">{timeAgo(log.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
              <span>Showing {offset + 1}–{Math.min(offset + PAGE, data.total)} of {data.total}</span>
              <div className="flex gap-2">
                <button className="btn-secondary px-2.5" disabled={offset === 0} onClick={() => setOffset(offset - PAGE)}><ChevronLeft className="h-4 w-4" /></button>
                <button className="btn-secondary px-2.5" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
