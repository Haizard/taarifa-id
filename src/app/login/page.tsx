'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { GlassButton } from '@/components/ui/GlassCard';
import { IOSInput } from '@/components/ui/IOSListGroup';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

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

  const demoAccounts = [
              { u: 'demo.systemadmin', label: 'System admin console' },
              { u: 'demo.individual', label: 'Individual' },
              { u: 'demo.family', label: 'Family (reseller)' },
              { u: 'demo.school', label: 'School provider (reseller)' },
              { u: 'demo.business', label: 'Emergency garage provider' },
              { u: 'demo.hospital', label: 'Hospital provider' },
              { u: 'demo.garage', label: 'Garage provider (second offer)' },
              { u: 'demo.institution', label: 'Institution (reseller)' },
              { u: 'member.family', label: 'Family member (user)' },
              { u: 'member.school', label: 'School member (user)' },
              { u: 'member.business', label: 'Business employee (user)' },
              { u: 'member.institution', label: 'Institution staff (user)' },
            ];

  return (
    <div className="min-h-screen bg-[#f5f7f6] text-slate-900 lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden bg-emerald-950 lg:block">
        <img src="/images/marketplace/hero-healthcare.webp" alt="Care professional helping a patient" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/90 via-emerald-950/55 to-slate-950/15" />
        <Link href="/" className="absolute left-10 top-9 z-10 flex items-center gap-3 text-white"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl font-extrabold">T</span><span className="font-extrabold tracking-wide">TAARIFA ID</span></Link>
        <div className="absolute bottom-14 left-10 right-10 z-10 max-w-xl text-white xl:left-16 xl:bottom-16"><div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><Sparkles size={14}/>Services that meet you where you are</div><h2 className="mt-5 text-4xl font-bold leading-tight xl:text-5xl">Find trusted help for life’s important moments.</h2><p className="mt-4 max-w-lg text-base leading-7 text-white/80">Connect with hospitals, schools, and roadside teams. Compare services and choose what works for you.</p><div className="mt-7 flex items-center gap-2 text-sm font-medium text-white/90"><ShieldCheck size={17}/>You choose what information to share</div></div>
      </section>
      <section className="flex min-h-screen items-start justify-center px-4 py-8 sm:px-8 lg:items-center lg:overflow-y-auto lg:py-10">
        <div className="w-full max-w-lg">
          <Link href="/" className="mb-7 flex items-center gap-2.5 lg:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg font-bold text-white">T</span><span className="font-extrabold text-slate-900">TAARIFA <span className="text-emerald-700">ID</span></span></Link>
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,.08)] sm:p-8">
            <div className="mb-6"><div className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Your account</div><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Log in to continue to your Taarifa ID account.</p></div>
            <div className="space-y-1"><IOSInput label="Username or mobile" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" /><IOSInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></div>
            <div className="mt-5"><GlassButton onClick={submit} disabled={loading}>{loading ? 'Logging in…' : <span className="inline-flex items-center gap-2">Log in <ArrowRight size={16}/></span>}</GlassButton></div>
            <div className="mt-4 text-center"><Link href="/forgot-password" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">Forgot password?</Link></div>
            <p className="mt-5 text-center text-sm text-slate-600">New to Taarifa ID? <Link href="/register" className="font-bold text-emerald-700">Create an account</Link></p>
          </div>
          <div className="mt-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold text-slate-900">Explore with a demo account</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">Password: demo1234</span></div>
            <p className="mb-3 mt-1 text-xs text-slate-500">Choose a sample account to fill the login form.</p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {demoAccounts.map((d) => (
              <button
                key={d.u}
                onClick={() => {
                  setUsername(d.u);
                  setPassword('demo1234');
                }}
                className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <span className="truncate font-mono text-[11px] font-semibold text-emerald-800">{d.u}</span>
                <span className="truncate text-[10px] text-slate-500">{d.label}</span>
              </button>
            ))}
          </div>
          </div>
        </div>
      </section>
    </div>
  );
}
