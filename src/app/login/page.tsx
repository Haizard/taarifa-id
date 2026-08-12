'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { GlassButton } from '@/components/ui/GlassCard';
import { IOSInput } from '@/components/ui/IOSListGroup';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) return toast.error('Enter username and password');
    setLoading(true);
    try {
      const res = await api.post<{ access_token: string; refresh_token: string; user: any }>('/auth/login', {
        username,
        password,
      });
      setSession(res.access_token, res.refresh_token, res.user);
      toast.success('Welcome back');
      if (res.user.role === 'system_admin') router.push('/admin/dashboard');
      else router.push('/dashboard');
    } catch (e: any) {
      if (e.message.includes('First login')) {
        toast.error('First login? Use your SMS confirmation code instead.');
        router.push('/register?firstlogin=1');
      } else {
        toast.error(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-[16px] font-bold text-white">
          T
        </div>
        <span className="text-[20px] font-bold text-ink-primary">TAARIFA ID</span>
      </div>

      <div className="w-full max-w-md">
        <div className="glass-strong p-6">
          <h1 className="mb-1 text-[28px] font-bold text-ink-primary">Welcome back</h1>
          <p className="mb-6 text-[15px] text-ink-secondary">Log in to your account.</p>

          <div className="space-y-1">
            <IOSInput label="Username or mobile" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
            <IOSInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </div>

          <div className="mt-6">
            <GlassButton onClick={submit} disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </GlassButton>
          </div>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-[15px] font-medium text-accent-primary">
              Forgot password?
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[14px] text-ink-secondary">
          New here?{' '}
          <Link href="/register" className="font-medium text-accent-primary">
            Create an account
          </Link>
        </p>
      </div>

      <div className="mt-6 w-full max-w-md">
        <div className="glass-subtle p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Demo accounts</span>
            <span className="rounded-full bg-accent-primary/15 px-2 py-0.5 text-[11px] font-medium text-accent-primary">Shared password: demo1234</span>
          </div>
          <p className="mb-2 text-[12px] text-ink-tertiary">Tap a username to fill it in, then log in with the shared password.</p>
          <div className="grid grid-cols-1 gap-1">
            {[
              { u: 'demo.systemadmin', label: 'System admin console' },
              { u: 'demo.individual', label: 'Individual' },
              { u: 'demo.family', label: 'Family (reseller)' },
              { u: 'demo.school', label: 'School (reseller)' },
              { u: 'demo.business', label: 'Business (reseller)' },
              { u: 'demo.institution', label: 'Institution (reseller)' },
              { u: 'member.family', label: 'Family member (user)' },
              { u: 'member.school', label: 'School member (user)' },
              { u: 'member.business', label: 'Business employee (user)' },
              { u: 'member.institution', label: 'Institution staff (user)' },
            ].map((d) => (
              <button
                key={d.u}
                onClick={() => {
                  setUsername(d.u);
                  setPassword('demo1234');
                }}
                className="flex items-center justify-between rounded-xl px-3 py-1.5 text-left transition-colors hover:bg-accent-primary/10"
              >
                <span className="font-mono text-[13px] text-accent-primary">{d.u}</span>
                <span className="text-[12px] text-ink-tertiary">{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
