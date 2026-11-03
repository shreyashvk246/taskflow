import { CalendarDays, MessageSquare } from 'lucide-react';
import { Avatar, Badge } from './ui';
import { PRIORITY, TASK_STATUS, cx, formatDate, isOverdue } from '../utils';

export function TaskCard({ task, onOpen, draggable, onDragStart }) {
  return (
    <div draggable={draggable} onDragStart={onDragStart} onClick={() => onOpen(task.id)}
      className={cx('cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-300 hover:shadow', draggable && 'active:cursor-grabbing')}>
      <div className="mb-2 flex items-center justify-between">
        <Badge className={PRIORITY[task.priority].color}>{PRIORITY[task.priority].label}</Badge>
        {task.comment_count > 0 && <span className="flex items-center gap-1 text-xs text-slate-400"><MessageSquare className="h-3.5 w-3.5" />{task.comment_count}</span>}
      </div>
      <p className="text-sm font-medium leading-snug text-slate-900">{task.title}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className={cx('flex items-center gap-1 text-xs', isOverdue(task) ? 'font-medium text-red-600' : 'text-slate-500')}>
          <CalendarDays className="h-3.5 w-3.5" />{task.due_date ? formatDate(task.due_date, { month: 'short', day: 'numeric' }) : 'No date'}
        </span>
        {task.assignee_name ? <Avatar name={task.assignee_name} size="xs" /> : <span className="text-xs text-slate-400">Unassigned</span>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = TASK_STATUS[status];
  return <Badge className={s.color} dot={s.dot}>{s.label}</Badge>;
}
