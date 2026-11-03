import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, UserCircle } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Field, PageHeader, Spinner } from '../components/ui';
import { ROLE, formatDate } from '../utils';

const PERMISSIONS = {
  admin: ['Full access to all projects and tasks', 'Create, edit, deactivate and delete users', 'Assign roles and project owners', 'View the complete activity audit log'],
  manager: ['Create new projects', 'Manage projects you own and their team', 'Create, assign and edit tasks in your projects', 'Comment on and track all project tasks'],
  member: ['View projects you are a member of', 'Update the status of tasks assigned to you', 'Comment on tasks in your projects', 'Track your personal workload'],
};

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user.name, email: user.email, job_title: user.job_title || '' });
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { const { user: u } = await api.updateProfile(profile); setUser(u); toast.success('Profile updated'); }
    catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm) return toast.error('New passwords do not match');
    setSavingPwd(true);
    try {
      await api.changePassword({ current_password: pwd.current_password, new_password: pwd.new_password });
      toast.success('Password changed');
      setPwd({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.error(err.message); } finally { setSavingPwd(false); }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile and account security." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card h-fit p-6 text-center">
          <Avatar name={user.name} size="xl" className="mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{user.name}</h2>
          <p className="text-sm text-slate-500">{user.job_title || user.email}</p>
          <Badge className={`mt-3 ${ROLE[user.role].color}`}>{ROLE[user.role].label}</Badge>
          <p className="mt-4 text-xs text-slate-400">Member since {formatDate(user.created_at)}</p>
          <div className="mt-6 border-t border-slate-100 pt-5 text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Your permissions</p>
            <ul className="space-y-2">
              {PERMISSIONS[user.role].map((p) => <li key={p} className="flex gap-2 text-sm text-slate-600"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{p}</li>)}
            </ul>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <form onSubmit={saveProfile} className="card">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
              <UserCircle className="h-5 w-5 text-slate-400" />
              <div><h3 className="text-sm font-semibold text-slate-900">Personal information</h3><p className="text-xs text-slate-500">Update your name, email and job title.</p></div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <Field label="Full name"><input className="input" required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
              <Field label="Job title"><input className="input" value={profile.job_title} onChange={(e) => setProfile({ ...profile, job_title: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Email address"><input className="input" type="email" required value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field></div>
            </div>
            <div className="flex justify-end rounded-b-xl border-t border-slate-100 bg-slate-50 px-6 py-3">
              <button className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />}Save changes</button>
            </div>
          </form>

          <form onSubmit={savePassword} className="card">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
              <KeyRound className="h-5 w-5 text-slate-400" />
              <div><h3 className="text-sm font-semibold text-slate-900">Change password</h3><p className="text-xs text-slate-500">Use at least 8 characters.</p></div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Current password"><input className="input" type="password" required value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} autoComplete="current-password" /></Field></div>
              <Field label="New password"><input className="input" type="password" required minLength={8} value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} autoComplete="new-password" /></Field>
              <Field label="Confirm new password"><input className="input" type="password" required minLength={8} value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} autoComplete="new-password" /></Field>
            </div>
            <div className="flex justify-end rounded-b-xl border-t border-slate-100 bg-slate-50 px-6 py-3">
              <button className="btn-primary" disabled={savingPwd}>{savingPwd && <Spinner className="h-4 w-4 text-white" />}Update password</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
