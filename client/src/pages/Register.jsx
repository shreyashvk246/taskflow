import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from '../components/AuthShell';
import { Field, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      toast.success('Account created successfully');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell title="Create your account" subtitle="Join your team’s workspace. New accounts start with Member access."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Full name"><input className="input" required placeholder="Jane Doe" value={form.name} onChange={set('name')} /></Field>
        <Field label="Email address"><input className="input" type="email" required placeholder="you@company.com" value={form.email} onChange={set('email')} /></Field>
        <Field label="Password" hint="At least 8 characters"><input className="input" type="password" required minLength={8} placeholder="••••••••" value={form.password} onChange={set('password')} /></Field>
        <Field label="Confirm password"><input className="input" type="password" required placeholder="••••••••" value={form.confirm} onChange={set('confirm')} /></Field>
        <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>{loading && <Spinner className="h-4 w-4 text-white" />} Create account</button>
      </form>
    </AuthShell>
  );
}
