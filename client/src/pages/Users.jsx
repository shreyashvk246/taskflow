import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Search, ShieldCheck, Trash2, UserCheck, UserX, Users as UsersIcon } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, ConfirmDialog, EmptyState, Field, Modal, PageHeader, PageLoader, Spinner, StatCard } from '../components/ui';
import { ROLE, formatDate, timeAgo } from '../utils';

const empty = { name: '', email: '', role: 'member', status: 'active', job_title: '', password: '' };

function UserForm({ open, onClose, user, onSaved }) {
  const { user: me } = useAuth();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(user ? { name: user.name, email: user.email, role: user.role, status: user.status, job_title: user.job_title || '', password: '' } : empty);
  }, [open, user]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isSelf = user?.id === me.id;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (user) await api.updateUser(user.id, form); else await api.createUser(form);
      toast.success(user ? 'User updated' : 'User created');
      onSaved();
      onClose();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Edit user' : 'Add new user'} description={user ? 'Update account details, role and access.' : 'Create an account and assign a role.'}
      footer={<>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="user-form" className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />}{user ? 'Save changes' : 'Create user'}</button>
      </>}>
      <form id="user-form" onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name"><input className="input" required value={form.name} onChange={set('name')} /></Field>
          <Field label="Job title"><input className="input" value={form.job_title} onChange={set('job_title')} placeholder="e.g. Designer" /></Field>
        </div>
        <Field label="Email address"><input className="input" type="email" required value={form.email} onChange={set('email')} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role" hint={isSelf ? 'You cannot change your own role' : undefined}>
            <select className="input" value={form.role} onChange={set('role')} disabled={isSelf}>
              <option value="admin">Admin — full access</option>
              <option value="manager">Manager — manage own projects</option>
              <option value="member">Member — work on tasks</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={set('status')} disabled={isSelf}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <Field label={user ? 'New password' : 'Password'} hint={user ? 'Leave blank to keep the current password' : 'At least 8 characters'}>
          <input className="input" type="password" required={!user} minLength={8} value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [form, setForm] = useState({ open: false, user: null });
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    api.users(filters).then((d) => setUsers(d.users)).catch((e) => toast.error(e.message));
  }, [filters]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const remove = async () => {
    setDeleting(true);
    try { await api.deleteUser(toDelete.id); toast.success('User deleted'); setToDelete(null); load(); }
    catch (e) { toast.error(e.message); } finally { setDeleting(false); }
  };

  const toggleStatus = async (u) => {
    try {
      await api.updateUser(u.id, { name: u.name, email: u.email, role: u.role, job_title: u.job_title, status: u.status === 'active' ? 'inactive' : 'active' });
      toast.success(u.status === 'active' ? 'User deactivated' : 'User activated');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const all = users || [];
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div>
      <PageHeader title="User Management" description="Manage accounts, roles and access across your organization."
        actions={<button className="btn-primary" onClick={() => setForm({ open: true, user: null })}><Plus className="h-4 w-4" /> Add user</button>} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={all.length} icon={UsersIcon} />
        <StatCard label="Admins" value={all.filter((u) => u.role === 'admin').length} icon={ShieldCheck} tone="violet" />
        <StatCard label="Active" value={all.filter((u) => u.status === 'active').length} icon={UserCheck} tone="emerald" />
        <StatCard label="Inactive" value={all.filter((u) => u.status === 'inactive').length} icon={UserX} tone="amber" />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by name, email, title..." value={filters.search} onChange={set('search')} />
          </div>
          <select className="input sm:w-40" value={filters.role} onChange={set('role')}>
            <option value="">All roles</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="member">Member</option>
          </select>
          <select className="input sm:w-40" value={filters.status} onChange={set('status')}>
            <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>
        {!users ? <PageLoader /> : users.length === 0 ? <EmptyState icon={UsersIcon} title="No users match your filters" /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr>
                <th className="table-th">User</th><th className="table-th">Role</th><th className="table-th">Status</th>
                <th className="table-th">Workload</th><th className="table-th">Last login</th><th className="table-th">Joined</th><th className="table-th text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{u.name}{u.id === me.id && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}</p>
                          <p className="truncate text-xs text-slate-500">{u.email}{u.job_title && ` · ${u.job_title}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td"><Badge className={ROLE[u.role].color}>{ROLE[u.role].label}</Badge></td>
                    <td className="table-td">
                      <Badge className={u.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'} dot={u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="table-td whitespace-nowrap text-xs text-slate-500">{u.open_tasks} open tasks · {u.project_count} projects</td>
                    <td className="table-td whitespace-nowrap text-slate-500">{u.last_login_at ? timeAgo(u.last_login_at) : 'Never'}</td>
                    <td className="table-td whitespace-nowrap text-slate-500">{formatDate(u.created_at)}</td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        {u.id !== me.id && (
                          <button className="btn-icon" title={u.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => toggleStatus(u)}>
                            {u.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        )}
                        <button className="btn-icon" title="Edit" onClick={() => setForm({ open: true, user: u })}><Pencil className="h-4 w-4" /></button>
                        {u.id !== me.id && <button className="btn-icon hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => setToDelete(u)}><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserForm open={form.open} user={form.user} onClose={() => setForm({ open: false, user: null })} onSaved={load} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} loading={deleting} title="Delete user"
        message={`Permanently delete ${toDelete?.name}? Their tasks will become unassigned. Consider deactivating instead.`} />
    </div>
  );
}
