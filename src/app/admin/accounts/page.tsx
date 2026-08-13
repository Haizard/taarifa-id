'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { LargeTitleHeader, Badge, GlassButton, ACCOUNT_TYPE_TONE } from '@/components/ui/GlassCard';
import { IOSListGroup, IOSInput, IOSSelect } from '@/components/ui/IOSListGroup';
import { EmptyState } from '@/components/ui/Control';
import { Users } from 'lucide-react';

const STATUS_TONES: Record<string, any> = {
  active: 'green',
  inactive: 'grey',
  locked: 'red',
  expired: 'orange',
};

export default function AdminAccounts() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [activateOpen, setActivateOpen] = useState(false);
  const [form, setForm] = useState({ profile_id: '', amount: '3500', duration_months: '3' });

  const { data: accounts } = useQuery({
    queryKey: ['admin-accounts'],
    queryFn: () => api.get('/admin/accounts'),
  });

  const activateMutation = useMutation({
    mutationFn: (d: any) => api.post('/admin/activate', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Account activated');
      setActivateOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    if (!accounts) return [];
    const f = filter.toLowerCase();
    return accounts.filter((a: any) => !f || a.account_type.includes(f) || a.status.includes(f) || a.profile_id.toLowerCase().includes(f) || a.username.toLowerCase().includes(f));
  }, [accounts, filter]);

  return (
    <div>
      <LargeTitleHeader
        title="Accounts"
        subtitle={`${rows.length} account(s)`}
        right={
          <button onClick={() => setActivateOpen(true)} className="rounded-button bg-accent-primary px-4 py-2.5 text-[14px] font-semibold text-white">
            Activate by Profile ID
          </button>
        }
      />

      <IOSListGroup>
        <IOSInput label="Filter (type / status / profile / username)" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </IOSListGroup>

      {rows.length ? (
        <div className="glass p-4">
          {rows.map((a: any) => (
            <div key={a.id} className="flex flex-col gap-2 border-b border-separator py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[15px] font-semibold text-ink-primary">{a.profile_id}</span>
                  <Badge tone={STATUS_TONES[a.status] ?? 'grey'}>{a.status}</Badge>
                </div>
                <div className="mt-1 text-[13px] text-ink-secondary">
                  {a.username} · {a.mobile_number}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={ACCOUNT_TYPE_TONE[a.account_type] ?? 'grey'}>{a.account_type}</Badge>
                <Badge tone={a.role === 'system_admin' ? 'orange' : 'grey'}>{a.role}</Badge>
                {a.is_reseller && <Badge tone="green">RESELLER</Badge>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Users size={28} />} title="No accounts found" subtitle="Adjust your filter or check back later." />
      )}

      {activateOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-primary/25 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-strong w-full max-w-sm rounded-[28px] p-6">
            <h3 className="text-[20px] font-semibold text-ink-primary">Activate account</h3>
            <p className="mb-4 text-[14px] text-ink-secondary">Register a mock payment and activate the profile.</p>
            <IOSListGroup>
              <IOSInput label="Profile ID" value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: e.target.value })} placeholder="TID-XXXX" />
              <IOSSelect label="Duration" value={form.duration_months} onChange={(v) => setForm({ ...form, duration_months: v })}>
                <option value="3">3 months (TZS 3,500)</option>
                <option value="6">6 months (TZS 6,500)</option>
                <option value="12">12 months (TZS 12,000)</option>
              </IOSSelect>
            </IOSListGroup>
            <div className="mt-4 flex gap-3">
              <GlassButton variant="secondary" onClick={() => setActivateOpen(false)}>
                Cancel
              </GlassButton>
              <GlassButton
                onClick={() => {
                  if (!form.profile_id) return toast.error('Enter a Profile ID');
                  activateMutation.mutate({
                    profile_id: form.profile_id,
                    amount: form.amount,
                    duration_months: parseInt(form.duration_months),
                  });
                }}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending ? 'Activating…' : 'Activate'}
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
