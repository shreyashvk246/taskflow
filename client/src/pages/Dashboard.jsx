import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, FolderKanban, ListTodo, Users, ArrowRight, CalendarDays } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, EmptyState, PageHeader, PageLoader, ProgressBar, StatCard } from '../components/ui';
import { PRIORITY, TASK_STATUS, formatDate, isOverdue, timeAgo, cx } from '../utils';

const STATUS_COLORS = { todo: '#94a3b8', in_progress: '#3b82f6', review: '#f59e0b', done: '#10b981' };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => { api.dashboard().then(setData).catch((e) => toast.error(e.message)); }, []);
  if (!data) return <PageLoader />;

  const { projectStats: ps, taskStats: ts, myTasks, upcoming, projectProgress, recentActivity, userStats, workload } = data;
  const isAdmin = user.role === 'admin';
  const statusData = Object.keys(STATUS_COLORS).map((k) => ({ key: k, name: TASK_STATUS[k].label, value: ts[k] || 0 })).filter((d) => d.value);
  const completion = ts.total ? Math.round(((ts.done || 0) / ts.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description={isAdmin ? 'Here’s an overview of everything happening across your organization.' : 'Here’s what’s happening with your projects today.'}
        actions={<Link to="/tasks?mine=1" className="btn-primary"><ListTodo className="h-4 w-4" /> My tasks</Link>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={isAdmin ? 'Total projects' : 'My projects'} value={ps.total} icon={FolderKanban} sub={`${ps.active || 0} active · ${ps.completed || 0} completed`} />
        <StatCard label="Tasks" value={ts.total} icon={ListTodo} tone="sky" sub={`${completion}% completed overall`} />
        {isAdmin
          ? <StatCard label="Team members" value={userStats.total} icon={Users} tone="violet" sub={`${userStats.active} active · ${userStats.managers} managers`} />
          : <StatCard label="Assigned to me" value={myTasks.open || 0} icon={Clock} tone="violet" sub={`${myTasks.done || 0} completed`} />}
        <StatCard label="Overdue tasks" value={ts.overdue || 0} icon={AlertCircle} tone="red" sub="Past due date and not done" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{isAdmin ? 'Team workload' : 'Project progress'}</h2>
              <p className="text-xs text-slate-500">{isAdmin ? 'Open vs. completed tasks per person' : 'Completion of your active projects'}</p>
            </div>
          </div>
          {isAdmin ? (
            workload.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workload.map((w) => ({ ...w, name: w.name.split(' ')[0] }))} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="open" name="Open" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="done" name="Done" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState title="No assignments yet" />
          ) : projectProgress.length ? (
            <ul className="space-y-4">
              {projectProgress.map((p) => {
                const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
                return (
                  <li key={p.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <Link to={`/projects/${p.id}`} className="font-medium text-slate-800 hover:text-brand-600">{p.name}</Link>
                      <span className="text-xs text-slate-500">{p.done}/{p.total} tasks · {pct}%</span>
                    </div>
                    <ProgressBar value={pct} className="h-2" />
                  </li>
                );
              })}
            </ul>
          ) : <EmptyState icon={FolderKanban} title="No active projects" description="You’ll see project progress here once you’re added to a project." />}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Tasks by status</h2>
          <p className="text-xs text-slate-500">Distribution across all visible tasks</p>
          {statusData.length ? (
            <>
              <div className="relative h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                      {statusData.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold text-slate-900">{completion}%</span>
                  <span className="text-xs text-slate-500">complete</span>
                </div>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {Object.keys(STATUS_COLORS).map((k) => (
                  <li key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <span className="flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[k] }} />{TASK_STATUS[k].label}</span>
                    <span className="font-semibold text-slate-900">{ts[k] || 0}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <EmptyState title="No tasks yet" />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">My upcoming tasks</h2>
              <p className="text-xs text-slate-500">Open tasks assigned to you, by due date</p>
            </div>
            <Link to="/tasks?mine=1" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {upcoming.length ? (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <Link to={`/tasks?task=${t.id}`} className="block truncate text-sm font-medium text-slate-800 hover:text-brand-600">{t.title}</Link>
                    <p className="truncate text-xs text-slate-500">{t.project_name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge className={PRIORITY[t.priority].color}>{PRIORITY[t.priority].label}</Badge>
                    <span className={cx('flex items-center gap-1 text-xs', isOverdue(t) ? 'font-medium text-red-600' : 'text-slate-500')}>
                      <CalendarDays className="h-3.5 w-3.5" />{formatDate(t.due_date, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={CheckCircle2} title="You’re all caught up" description="No open tasks are assigned to you right now." />}
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
              <p className="text-xs text-slate-500">Latest updates across your projects</p>
            </div>
            {isAdmin && <Link to="/activity" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
          </div>
          {recentActivity.length ? (
            <ul className="divide-y divide-slate-100">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <Avatar name={a.user_name || 'System'} size="xs" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">{a.message}</p>
                    <p className="text-xs text-slate-400">{timeAgo(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No activity yet" />}
        </div>
      </div>
    </div>
  );
}
