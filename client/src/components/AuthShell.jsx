import { CheckCircle2, CheckSquare } from 'lucide-react';

const FEATURES = [
  'Role-based access for admins, managers and members',
  'Kanban boards with real-time progress tracking',
  'Task assignments, priorities, due dates & comments',
  'Org-wide dashboards and full activity audit trail',
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-500 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/30"><CheckSquare className="h-5 w-5" strokeWidth={2.5} /></span>
          <span className="text-xl font-semibold tracking-tight">TaskFlow</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Manage projects and teams in one place.</h2>
          <p className="mt-4 text-brand-100">Plan work, assign tasks, track progress and keep everyone aligned with a clean, focused workspace.</p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-brand-50"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />{f}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-200">© {new Date().getFullYear()} TaskFlow Inc. All rights reserved.</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600"><CheckSquare className="h-4 w-4 text-white" strokeWidth={2.5} /></span>
            <span className="text-lg font-semibold">TaskFlow</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
