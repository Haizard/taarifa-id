'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { LargeTitleHeader, Badge } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/Control';

const TONES: Record<string, any> = { success: 'green', pending: 'orange', failed: 'red' };

export default function AdminPayments() {
  const { data: payments } = useQuery({ queryKey: ['admin-payments'], queryFn: () => api.get('/admin/payments') });

  return (
    <div>
      <LargeTitleHeader title="Payments" subtitle={`${payments?.length ?? 0} payment(s)`} />
      {payments?.length ? (
        <div className="glass p-4">
          {payments.map((p: any) => (
            <div key={p.id} className="flex flex-col gap-2 border-b border-separator py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-semibold text-ink-primary">TZS {p.amount}</span>
                  <Badge tone={TONES[p.status] ?? 'grey'}>{p.status}</Badge>
                </div>
                <div className="mt-1 text-[13px] text-ink-secondary">
                  {p.duration_months} months · {p.method} · {p.account?.profile_id ?? p.activated_by ?? '—'}
                </div>
              </div>
              <div className="text-right text-[12px] text-ink-tertiary">
                {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<CreditCard size={28} />} title="No payments yet" subtitle="Payments appear here once processed." />
      )}
    </div>
  );
}
