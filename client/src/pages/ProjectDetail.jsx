import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CalendarDays, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { api } from '../api/client';
import ProjectForm from '../components/ProjectForm';
import TaskForm from '../components/TaskForm';
import TaskDetail from '../components/TaskDetail';
import { TaskCard } from '../components/TaskRow';
import { Avatar, Badge, ConfirmDialog, PageLoader, ProgressBar } from '../components/ui';
import { PROJECT_STATUS, ROLE, TASK_STATUS, cx, formatDate } from '../utils';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ open: false, task: null });
  const [openTask, setOpenTask] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([api.project(id), api.tasks({ project_id: id })]);
      setProject(p.project);
      setTasks(t.tasks);
    } catch (e) {
      toast.error(e.message);
      navigate('/projects');
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);
  const closeTask = useCallback(() => setOpenTask(null), []);

  if (!project) return <PageLoader />;

  const onDrop = async (status, e) => {
    e.preventDefault();
    setDragOver(null);
    const taskId = Number(e.dataTransfer.getData('text/plain'));
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    if (!task.can_update_status) return toast.error('You can only move tasks assigned to you');
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      await api.updateTaskStatus(taskId, status);
      load();
    } catch (err) {
      toast.error(err.message);
      load();
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.deleteProject(project.id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (e) { toast.error(e.message); setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Back to projects</Link>

      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{project.name}</h1>
              <Badge className={PROJECT_STATUS[project.status].color}>{PROJECT_STATUS[project.status].label}</Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">{project.description || 'No description'}</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <span className="flex items-center gap-2"><Avatar name={project.owner_name || '?'} size="xs" />Owner: <strong className="font-medium text-slate-800">{project.owner_name || '—'}</strong></span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" />{formatDate(project.start_date)} → {formatDate(project.due_date)}</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-slate-400" />{project.members.length} members</span>
            </div>
          </div>
          {project.can_manage && (
            <div className="flex shrink-0 gap-2">
              <button className="btn-secondary" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</button>
              <button className="btn-secondary text-red-600 hover:bg-red-50" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" /> Delete</button>
              <button className="btn-primary" onClick={() => setTaskForm({ open: true, task: null })}><Plus className="h-4 w-4" /> Add task</button>
            </div>
          )}
        </div>
        <div className="mt-6 flex items-center gap-4">
          <ProgressBar value={project.progress} className="h-2" />
          <span className="shrink-0 text-sm font-medium text-slate-700">{project.progress}% complete</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Task board</h2>
            <p className="text-xs text-slate-500">Drag cards between columns to update status</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(TASK_STATUS).map(([status, meta]) => {
              const col = tasks.filter((t) => t.status === status);
              return (
                <div key={status}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(status); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => onDrop(status, e)}
                  className={cx('flex min-h-[200px] flex-col rounded-xl border bg-slate-100/70 p-3 transition', dragOver === status ? 'border-brand-400 bg-brand-50' : 'border-transparent')}>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600"><span className={cx('h-2 w-2 rounded-full', meta.dot)} />{meta.label}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{col.length}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    {col.map((t) => (
                      <TaskCard key={t.id} task={t} onOpen={setOpenTask} draggable={t.can_update_status}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(t.id))} />
                    ))}
                    {col.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No tasks</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card h-fit">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Team</h2></div>
          <ul className="divide-y divide-slate-100">
            {project.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={m.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="truncate text-xs text-slate-500">{m.job_title || ROLE[m.role].label}</p>
                </div>
                <span className="text-xs text-slate-500" title="Open tasks">{m.open_tasks} open</span>
              </li>
            ))}
            {project.members.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-400">No members yet</li>}
          </ul>
        </div>
      </div>

      <ProjectForm open={editOpen} onClose={() => setEditOpen(false)} project={project} onSaved={load} />
      <TaskForm open={taskForm.open} onClose={() => setTaskForm({ open: false, task: null })} task={taskForm.task} projectId={project.id} onSaved={load} />
      <TaskDetail taskId={openTask} onClose={closeTask} onChanged={load} onEdit={(t) => { setOpenTask(null); setTaskForm({ open: true, task: t }); }} />
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} loading={deleting} title="Delete project"
        message={`Delete "${project.name}" and all of its ${tasks.length} tasks? This action cannot be undone.`} />
    </div>
  );
}
