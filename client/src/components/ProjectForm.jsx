import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Avatar, Field, Modal, Spinner } from './ui';
import { PROJECT_STATUS, cx } from '../utils';

const empty = { name: '', description: '', status: 'planning', start_date: '', due_date: '', owner_id: null, member_ids: [] };

export default function ProjectForm({ open, onClose, project, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(project ? {
      name: project.name, description: project.description || '', status: project.status,
      start_date: project.start_date || '', due_date: project.due_date || '', owner_id: project.owner_id,
      member_ids: (project.members || []).map((m) => m.id),
    } : { ...empty, owner_id: user.id });
    api.users({ status: 'active' }).then((d) => setUsers(d.users)).catch(() => {});
  }, [open, project, user.id]);

  const toggleMember = (id) =>
    setForm((f) => ({ ...f, member_ids: f.member_ids.includes(id) ? f.member_ids.filter((m) => m !== id) : [...f.member_ids, id] }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { ...form, owner_id: form.owner_id ? Number(form.owner_id) : null };
      const res = project ? await api.updateProject(project.id, body) : await api.createProject(body);
      toast.success(project ? 'Project updated' : 'Project created');
      onSaved?.(res.project);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const owners = users.filter((u) => u.role !== 'member');

  return (
    <Modal open={open} onClose={onClose} size="lg" title={project ? 'Edit project' : 'Create new project'}
      description={project ? 'Update project details and team members.' : 'Set up a project and choose who works on it.'}
      footer={<>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="project-form" className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />}{project ? 'Save changes' : 'Create project'}</button>
      </>}>
      <form id="project-form" onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Project name"><input className="input" required value={form.name} onChange={set('name')} placeholder="e.g. Website Redesign" /></Field>
        <Field label="Description"><textarea className="input min-h-[80px]" value={form.description} onChange={set('description')} placeholder="What is this project about?" /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Status">
            <select className="input" value={form.status} onChange={set('status')}>
              {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Start date"><input type="date" className="input" value={form.start_date} onChange={set('start_date')} /></Field>
          <Field label="Due date"><input type="date" className="input" value={form.due_date} onChange={set('due_date')} /></Field>
        </div>
        {user.role === 'admin' && (
          <Field label="Project owner" hint="Owners (admins or managers) can manage the project and its tasks.">
            <select className="input" value={form.owner_id || ''} onChange={set('owner_id')}>
              {owners.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </Field>
        )}
        <Field label={`Team members (${form.member_ids.length} selected)`}>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 scrollbar-thin">
            {users.map((u) => {
              const selected = form.member_ids.includes(u.id);
              return (
                <button type="button" key={u.id} onClick={() => toggleMember(u.id)}
                  className={cx('flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-0 transition', selected ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                  <Avatar name={u.name} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{u.name}</p>
                    <p className="truncate text-xs text-slate-500">{u.job_title || u.email}</p>
                  </div>
                  <span className={cx('flex h-5 w-5 items-center justify-center rounded border', selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}>
                    {selected && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
