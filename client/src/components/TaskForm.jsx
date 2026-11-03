import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { Field, Modal, Spinner } from './ui';
import { PRIORITY, TASK_STATUS } from '../utils';

const empty = { project_id: '', title: '', description: '', status: 'todo', priority: 'medium', assignee_id: '', due_date: '' };

/** Create/edit a task. `projects` limits the project picker to manageable projects. */
export default function TaskForm({ open, onClose, task, projectId, projects = [], onSaved }) {
  const [form, setForm] = useState(empty);
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(task ? {
      project_id: task.project_id, title: task.title, description: task.description || '', status: task.status,
      priority: task.priority, assignee_id: task.assignee_id || '', due_date: task.due_date || '',
    } : { ...empty, project_id: projectId || projects[0]?.id || '' });
  }, [open, task, projectId, projects]);

  useEffect(() => {
    if (!open || !form.project_id) return setMembers([]);
    api.project(form.project_id).then(({ project }) => {
      const list = [...project.members];
      if (project.owner_id && !list.some((m) => m.id === project.owner_id)) list.unshift({ id: project.owner_id, name: `${project.owner_name} (owner)` });
      setMembers(list);
    }).catch(() => setMembers([]));
  }, [open, form.project_id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { ...form, project_id: Number(form.project_id), assignee_id: form.assignee_id ? Number(form.assignee_id) : null };
      const res = task ? await api.updateTask(task.id, body) : await api.createTask(body);
      toast.success(task ? 'Task updated' : 'Task created');
      onSaved?.(res.task);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={task ? 'Edit task' : 'Create new task'}
      footer={<>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="task-form" className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />}{task ? 'Save changes' : 'Create task'}</button>
      </>}>
      <form id="task-form" onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {!task && !projectId && (
          <Field label="Project">
            <select className="input" required value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value, assignee_id: '' })}>
              {projects.length === 0 && <option value="">No projects available</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Title"><input className="input" required value={form.title} onChange={set('title')} placeholder="What needs to be done?" /></Field>
        <Field label="Description"><textarea className="input min-h-[100px]" value={form.description} onChange={set('description')} placeholder="Add more details..." /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select className="input" value={form.status} onChange={set('status')}>
              {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className="input" value={form.priority} onChange={set('priority')}>
              {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Assignee">
            <select className="input" value={form.assignee_id} onChange={set('assignee_id')}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Due date"><input type="date" className="input" value={form.due_date} onChange={set('due_date')} /></Field>
        </div>
      </form>
    </Modal>
  );
}
