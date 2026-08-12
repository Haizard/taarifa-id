'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Lock, Unlock, KeyRound, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { LargeTitleHeader, GlassButton, Badge, SectionLabel } from '@/components/ui/GlassCard';
import { IOSListGroup, IOSInput, IOSSelect, IOSListRow, IOSSwitch } from '@/components/ui/IOSListGroup';
import { EmptyState } from '@/components/ui/Control';

export default function SubAccountsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    gender: 'Male',
    birthdate: '',
    nationality: 'Tanzanian',
    nida_number: '',
    mobile_number: '',
    username: '',
    password: '',
  });
  const [resetPw, setResetPw] = useState<{ id: string; name: string; password: string } | null>(null);

  const { data: subs } = useQuery({
    queryKey: ['sub-accounts', user?.sub],
    queryFn: () => api.get('/accounts/sub-accounts'),
    enabled: !!user && user.role !== 'individual',
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/accounts/sub-accounts', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-accounts'] });
      toast.success('Member account created');
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lockMutation = useMutation({
    mutationFn: ({ id, lock }: { id: string; lock: boolean }) => api.patch(`/accounts/${id}/${lock ? 'lock' : 'unlock'}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-accounts'] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => api.post('/accounts/reset-password', { account_id: id, new_password: password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-accounts'] });
      toast.success('Password reset');
      setResetPw(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const visible = subs?.filter((s: any) => (filter === 'all' ? true : s.status === filter));

  return (
    <div>
      <LargeTitleHeader title="Members" subtitle="Sub-accounts under your organization" />

      <div className="mb-6 flex gap-2">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-button px-4 py-2 text-[14px] font-medium capitalize ${filter === f ? 'bg-accent-primary text-white' : 'glass text-ink-secondary'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible?.length ? (
        <div className="glass p-4">
          {visible.map((s: any) => (
            <div key={s.id} className="flex flex-col gap-3 border-b border-separator py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary/15 text-accent-primary">
                  <UserRound size={20} />
                </div>
                <div>
                  <div className="text-[16px] font-medium text-ink-primary">
                    {s.personProfiles?.[0]?.first_name} {s.personProfiles?.[0]?.last_name}
                  </div>
                  <div className="text-[12px] text-ink-secondary">
                    @{s.username} · {s.mobile_number}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={s.status === 'active' ? 'green' : s.status === 'locked' ? 'grey' : 'red'}>{s.status}</Badge>
                <button
                  onClick={() => lockMutation.mutate({ id: s.id, lock: s.status !== 'locked' })}
                  className="glass-subtle p-2 text-ink-secondary"
                  title={s.status === 'locked' ? 'Unlock' : 'Lock'}
                >
                  {s.status === 'locked' ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
                <button
                  onClick={() => setResetPw({ id: s.id, name: s.username, password: '' })}
                  className="glass-subtle p-2 text-ink-secondary"
                  title="Reset password"
                >
                  <KeyRound size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<UserRound size={28} />} title="No member accounts yet" subtitle="Create usernames and passwords for your sub-accounts." />
      )}

      <div className="mt-6">
        <GlassButton variant="secondary" onClick={() => setOpen((v) => !v)}>
          <span className="flex items-center justify-center gap-2">
            <Plus size={18} /> {open ? 'Cancel' : 'Create member account'}
          </span>
        </GlassButton>
      </div>

      {open && (
        <div className="mt-6">
          <SectionLabel>New member account</SectionLabel>
          <IOSListGroup>
            <IOSInput label="First name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            <IOSInput label="Last name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
            <IOSSelect label="Gender" value={form.gender} onChange={(v) => set('gender', v)}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </IOSSelect>
            <IOSInput label="Birthdate" type="date" value={form.birthdate} onChange={(e) => set('birthdate', e.target.value)} />
            <IOSSelect label="Nationality" value={form.nationality} onChange={(v) => set('nationality', v)}>
              <option value="Tanzanian">Tanzanian</option>
              <option value="Foreign">Foreign</option>
            </IOSSelect>
            {form.nationality === 'Tanzanian' && (
              <IOSInput label="NIDA number" value={form.nida_number} onChange={(e) => set('nida_number', e.target.value)} />
            )}
            <IOSInput label="Mobile (255…)" inputMode="tel" value={form.mobile_number} onChange={(e) => set('mobile_number', e.target.value)} />
            <IOSInput label="Username" value={form.username} onChange={(e) => set('username', e.target.value)} autoCapitalize="none" />
            <IOSInput label="Password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
          </IOSListGroup>
          <GlassButton
            onClick={() => {
              if (!form.first_name || !form.last_name || !form.birthdate || !form.mobile_number || !form.username || !form.password)
                return toast.error('Complete all required fields');
              createMutation.mutate(form);
            }}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating…' : 'Create member'}
          </GlassButton>
        </div>
      )}

      {resetPw && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-primary/25 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-strong w-full max-w-sm rounded-[28px] p-6">
            <h3 className="text-[20px] font-semibold text-ink-primary">Reset password</h3>
            <p className="mb-4 text-[14px] text-ink-secondary">New password for @{resetPw.name}</p>
            <IOSListGroup>
              <IOSInput label="New password" type="password" value={resetPw.password} onChange={(e) => setResetPw({ ...resetPw, password: e.target.value })} />
            </IOSListGroup>
            <div className="mt-4 flex gap-3">
              <GlassButton variant="secondary" onClick={() => setResetPw(null)}>
                Cancel
              </GlassButton>
              <GlassButton onClick={() => resetMutation.mutate({ id: resetPw.id, password: resetPw.password })} disabled={resetPw.password.length < 6}>
                Reset
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
