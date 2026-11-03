import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, FolderKanban, LayoutGrid, List, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ProjectForm from '../components/ProjectForm';
import { AvatarStack, Badge, EmptyState, PageHeader, PageLoader, ProgressBar } from '../components/ui';
import { PROJECT_STATUS, formatDate, cx } from '../utils';

export default function Projects() {
  const { hasRole } = useAuth();
  const [projects, setProjects] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState('grid');
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(() => {
    api.projects({ search, status }).then((d) => setProjects(d.projects)).catch((e) => toast.error(e.message));
  }, [search, status]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const canCreate = hasRole('admin', 'manager');

  return (
    <div>
      <PageHeader title="Projects" description={hasRole('admin') ? 'All projects across the organization.' : 'Projects you own or are a member of.'}
        actions={canCreate && <button className="btn-primary" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New project</button>} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
          {[['', 'All'], ...Object.entries(PROJECT_STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
            <button key={k} onClick={() => setStatus(k)}
              className={cx('whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition', status === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 sm:ml-auto">
          <button onClick={() => setView('grid')} className={cx('rounded-md p-1.5', view === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400')} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setView('list')} className={cx('rounded-md p-1.5', view === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400')} aria-label="List view"><List className="h-4 w-4" /></button>
        </div>
      </div>

      {!projects ? <PageLoader /> : projects.length === 0 ? (
        <div className="card"><EmptyState icon={FolderKanban} title="No projects found"
          description={canCreate ? 'Get started by creating your first project.' : 'You haven’t been added to any projects yet.'}
          action={canCreate && <button className="btn-primary" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New project</button>} /></div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">{p.name.slice(0, 2).toUpperCase()}</div>
                <Badge className={PROJECT_STATUS[p.status].color}>{PROJECT_STATUS[p.status].label}</Badge>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 group-hover:text-brand-700">{p.name}</h3>
              <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{p.description || 'No description'}</p>
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs"><span className="text-slate-500">{p.done_count}/{p.task_count} tasks</span><span className="font-medium text-slate-700">{p.progress}%</span></div>
                <ProgressBar value={p.progress} />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <AvatarStack users={p.members} />
                <span className="flex items-center gap-1 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(p.due_date)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="table-th">Project</th><th className="table-th">Owner</th><th className="table-th">Status</th>
              <th className="table-th w-48">Progress</th><th className="table-th">Team</th><th className="table-th">Due</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="table-td"><Link to={`/projects/${p.id}`} className="font-medium text-slate-900 hover:text-brand-600">{p.name}</Link></td>
                  <td className="table-td">{p.owner_name || '—'}</td>
                  <td className="table-td"><Badge className={PROJECT_STATUS[p.status].color}>{PROJECT_STATUS[p.status].label}</Badge></td>
                  <td className="table-td"><div className="flex items-center gap-2"><ProgressBar value={p.progress} /><span className="w-9 text-xs text-slate-500">{p.progress}%</span></div></td>
                  <td className="table-td"><AvatarStack users={p.members} /></td>
                  <td className="table-td whitespace-nowrap">{formatDate(p.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProjectForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
    </div>
  );
}
