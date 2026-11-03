import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, FolderKanban, MessageSquare, Pencil, Send, Trash2, User } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, ConfirmDialog, Modal, PageLoader, Spinner } from './ui';
import { PRIORITY, ROLE, TASK_STATUS, cx, formatDate, isOverdue, timeAgo } from '../utils';

export default function TaskDetail({ taskId, onClose, onEdit, onChanged }) {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    setTask(null);
    Promise.all([api.task(taskId), api.comments(taskId)])
      .then(([t, c]) => { setTask(t.task); setComments(c.comments); })
      .catch((e) => { toast.error(e.message); onClose(); });
  }, [taskId, onClose]);

  const changeStatus = async (status) => {
    try {
      const { task: updated } = await api.updateTaskStatus(task.id, status);
      setTask(updated);
      onChanged?.();
      toast.success(`Moved to ${TASK_STATUS[status].label}`);
    } catch (e) { toast.error(e.message); }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const { comment } = await api.addComment(task.id, body);
      setComments((c) => [...c, comment]);
      setBody('');
      onChanged?.();
    } catch (err) { toast.error(err.message); } finally { setPosting(false); }
  };

  const removeComment = async (id) => {
    try {
      await api.deleteComment(task.id, id);
      setComments((c) => c.filter((x) => x.id !== id));
    } catch (e) { toast.error(e.message); }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.deleteTask(task.id);
      toast.success('Task deleted');
      onChanged?.();
      onClose();
    } catch (e) { toast.error(e.message); } finally { setDeleting(false); setConfirm(false); }
  };

  return (
    <Modal open={!!taskId} onClose={onClose} size="xl" title={task ? task.title : 'Loading task...'}
      description={task && <span className="flex items-center gap-1.5"><FolderKanban className="h-3.5 w-3.5" /><Link to={`/projects/${task.project_id}`} onClick={onClose} className="hover:text-brand-600">{task.project_name}</Link></span>}>
      {!task ? <PageLoader /> : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Description</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{task.description || <span className="italic text-slate-400">No description provided.</span>}</p>
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><MessageSquare className="h-3.5 w-3.5" /> Comments ({comments.length})</h3>
              <ul className="space-y-4">
                {comments.map((c) => (
                  <li key={c.id} className="group flex gap-3">
                    <Avatar name={c.user_name || 'Deleted user'} size="sm" />
                    <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{c.user_name || 'Deleted user'} {c.user_role && <span className="ml-1 text-xs font-normal text-slate-400">· {ROLE[c.user_role]?.label}</span>}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                          {(c.user_id === user.id || user.role === 'admin') && (
                            <button onClick={() => removeComment(c.id)} className="text-slate-300 opacity-0 transition hover:text-red-600 group-hover:opacity-100" aria-label="Delete comment"><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
                    </div>
                  </li>
                ))}
                {comments.length === 0 && <li className="text-sm text-slate-400">No comments yet. Start the conversation.</li>}
              </ul>
              <form onSubmit={postComment} className="mt-4 flex gap-3">
                <Avatar name={user.name} size="sm" />
                <div className="flex flex-1 gap-2">
                  <input className="input" placeholder="Write a comment..." value={body} onChange={(e) => setBody(e.target.value)} />
                  <button className="btn-primary px-3" disabled={posting || !body.trim()} aria-label="Post comment">{posting ? <Spinner className="h-4 w-4 text-white" /> : <Send className="h-4 w-4" />}</button>
                </div>
              </form>
            </div>
          </div>

          <aside className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">Status</p>
              {task.can_update_status ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(TASK_STATUS).map(([k, v]) => (
                    <button key={k} onClick={() => changeStatus(k)}
                      className={cx('flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition',
                        task.status === k ? 'border-brand-500 bg-white text-brand-700 ring-1 ring-brand-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                      <span className={cx('h-1.5 w-1.5 rounded-full', v.dot)} />{v.label}
                    </button>
                  ))}
                </div>
              ) : <Badge className={TASK_STATUS[task.status].color} dot={TASK_STATUS[task.status].dot}>{TASK_STATUS[task.status].label}</Badge>}
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><dt className="text-slate-500">Priority</dt><dd><Badge className={PRIORITY[task.priority].color}>{PRIORITY[task.priority].label}</Badge></dd></div>
              <div className="flex items-center justify-between"><dt className="flex items-center gap-1.5 text-slate-500"><User className="h-3.5 w-3.5" />Assignee</dt>
                <dd className="flex items-center gap-2 font-medium text-slate-800">{task.assignee_name ? <><Avatar name={task.assignee_name} size="xs" />{task.assignee_name}</> : <span className="text-slate-400">Unassigned</span>}</dd></div>
              <div className="flex items-center justify-between"><dt className="flex items-center gap-1.5 text-slate-500"><CalendarDays className="h-3.5 w-3.5" />Due date</dt>
                <dd className={cx('font-medium', isOverdue(task) ? 'text-red-600' : 'text-slate-800')}>{formatDate(task.due_date)}{isOverdue(task) && ' · Overdue'}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-slate-500">Created by</dt><dd className="text-slate-800">{task.creator_name || '—'}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-slate-500">Created</dt><dd className="text-slate-800">{formatDate(task.created_at)}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-slate-500">Updated</dt><dd className="text-slate-800">{timeAgo(task.updated_at)}</dd></div>
            </dl>
            {task.can_manage && (
              <div className="flex gap-2 border-t border-slate-200 pt-4">
                <button className="btn-secondary flex-1" onClick={() => onEdit(task)}><Pencil className="h-4 w-4" /> Edit</button>
                <button className="btn-secondary text-red-600 hover:bg-red-50" onClick={() => setConfirm(true)} aria-label="Delete task"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </aside>
        </div>
      )}
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} loading={deleting} title="Delete task"
        message={`Are you sure you want to delete "${task?.title}"? This will also remove all comments and cannot be undone.`} />
    </Modal>
  );
}
