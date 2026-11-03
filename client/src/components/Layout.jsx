import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, CheckSquare, ChevronDown, FolderKanban, LayoutDashboard, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge } from './ui';
import { ROLE, cx } from '../utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
];
const ADMIN_NAV = [
  { to: '/users', label: 'User Management', icon: Users },
  { to: '/activity', label: 'Activity Logs', icon: Activity },
];

export function Logo({ className }) {
  return (
    <Link to="/" className={cx('flex items-center gap-2.5', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
        <CheckSquare className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-900">TaskFlow</span>
    </Link>
  );
}

function NavItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.end} onClick={onClick}
      className={({ isActive }) => cx(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
        isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}>
      {({ isActive }) => (<><Icon className={cx('h-[18px] w-[18px]', isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')} />{item.label}</>)}
    </NavLink>
  );
}

function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5"><Logo /></div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
          <div className="space-y-1">{NAV.map((i) => <NavItem key={i.to} item={i} onClick={onNavigate} />)}</div>
        </div>
        {user?.role === 'admin' && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Administration</p>
            <div className="space-y-1">{ADMIN_NAV.map((i) => <NavItem key={i.to} item={i} onClick={onNavigate} />)}</div>
          </div>
        )}
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Account</p>
          <NavItem item={{ to: '/profile', label: 'Settings', icon: Settings }} onClick={onNavigate} />
        </div>
      </nav>
      <div className="m-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-100">
        <Avatar name={user.name} size="sm" />
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-tight text-slate-900">{user.name}</p>
          <p className="text-xs leading-tight text-slate-500">{ROLE[user.role].label}</p>
        </div>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="p-1">
            <button onClick={() => { setOpen(false); navigate('/profile'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              <Settings className="h-4 w-4 text-slate-400" /> Profile settings
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const TITLES = { '/': 'Dashboard', '/projects': 'Projects', '/tasks': 'Tasks', '/users': 'User Management', '/activity': 'Activity Logs', '/profile': 'Settings' };

export default function Layout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const title = TITLES[pathname] || (pathname.startsWith('/projects/') ? 'Project details' : '');

  useEffect(() => { document.title = `${title ? `${title} · ` : ''}TaskFlow`; }, [title]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block"><Sidebar /></aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <button className="btn-icon absolute right-3 top-4" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="btn-icon lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <span className="text-sm font-medium text-slate-500">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={ROLE[user.role].color}>{ROLE[user.role].label} access</Badge>
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
