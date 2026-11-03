import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, User, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from '../components/AuthShell';
import { Field, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const DEMO = [
  { role: 'Admin', email: 'admin@taskflow.com', password: 'Admin@123', icon: Shield },
  { role: 'Manager', email: 'manager@taskflow.com', password: 'Manager@123', icon: Briefcase },
  { role: 'Member', email: 'member@taskflow.com', password: 'Member@123', icon: User },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign in to your account" subtitle="Welcome back! Please enter your details."
      footer={<>Don’t have an account? <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">Create one</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Email address">
          <input className="input" type="email" autoComplete="email" required placeholder="you@company.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input className="input pr-10" type={show ? 'text' : 'password'} autoComplete="current-password" required placeholder="••••••••"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600" aria-label="Toggle password visibility">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
          {loading && <Spinner className="h-4 w-4 text-white" />} Sign in
        </button>
      </form>
      <div className="mt-8">
        <div className="relative flex items-center justify-center">
          <span className="absolute inset-x-0 h-px bg-slate-200" />
          <span className="relative bg-white px-3 text-xs font-medium uppercase tracking-wider text-slate-400">Demo accounts</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {DEMO.map(({ role, email, password, icon: Icon }) => (
            <button key={role} type="button" onClick={() => setForm({ email, password })}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-3 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
              <Icon className="h-4 w-4" />{role}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
