'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { CreditCard, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { LargeTitleHeader, GlassButton, Badge, SectionLabel, ACCENT_CHIP, type AccentTone } from '@/components/ui/GlassCard';
import { IOSListGroup, IOSSelect, IOSListRow } from '@/components/ui/IOSListGroup';

const PRICES: Record<number, number> = { 3: 3500, 6: 6500, 12: 12000 };

export default function PaymentsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [method, setMethod] = useState<'mobile_wallet' | 'bank'>('mobile_wallet');
  const [months, setMonths] = useState(12);

  const { data: status } = useQuery({ queryKey: ['pay-status', user?.sub], queryFn: () => api.get('/payments/status'), enabled: !!user });
  const { data: history } = useQuery({ queryKey: ['pay-history', user?.sub], queryFn: () => api.get('/payments/history'), enabled: !!user });

  const payMutation = useMutation({
    mutationFn: () => api.post('/payments', { amount: PRICES[months], method, duration_months: months }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-history'] });
      qc.invalidateQueries({ queryKey: ['pay-status'] });
      toast.success('Payment processed. Profile activated.');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const expired = status?.status === 'expired' || (status?.expire_date && new Date(status.expire_date) < new Date());

  return (
    <div>
      <LargeTitleHeader title="Payments" subtitle="Renew and manage your subscription" />

      <SectionLabel tone="green">Current status</SectionLabel>
      <div className="glass p-5">
        <div className="flex items-center justify-between">
          <div>
            <Badge tone={expired ? 'red' : 'green'}>{expired ? 'Expired' : 'Active'}</Badge>
            {status?.expire_date && (
              <div className="mt-2 text-[13px] text-ink-secondary">
                Expires {new Date(status.expire_date).toLocaleDateString('en-GB')}
              </div>
            )}
          </div>
          <div className="text-[13px] text-ink-secondary">
            {status?.paid_amount ? `Last paid ${Number(status.paid_amount).toLocaleString()} TZS` : 'No active subscription'}
          </div>
        </div>
      </div>

      <SectionLabel tone="lavender">Renew / subscribe</SectionLabel>
      <IOSListGroup>
        <IOSSelect label="Payment method" value={method} onChange={(v) => setMethod(v as any)}>
          <option value="mobile_wallet">Mobile wallet</option>
          <option value="bank">Bank account</option>
        </IOSSelect>
        <IOSSelect label="Duration" value={String(months)} onChange={(v) => setMonths(Number(v))}>
          <option value="3">3 months — {PRICES[3].toLocaleString()} TZS</option>
          <option value="6">6 months — {PRICES[6].toLocaleString()} TZS</option>
          <option value="12">12 months — {PRICES[12].toLocaleString()} TZS</option>
        </IOSSelect>
        <IOSListRow label="Amount due" value={`${PRICES[months].toLocaleString()} TZS`} />
      </IOSListGroup>
      <GlassButton onClick={() => payMutation.mutate()} disabled={payMutation.isPending}>
        {payMutation.isPending ? 'Processing…' : method === 'mobile_wallet' ? 'Pay with mobile wallet' : 'Pay via bank'}
      </GlassButton>

      <SectionLabel tone="yellow">Payment history</SectionLabel>
      <div className="glass p-4">
        {history?.length ? (
          history.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between border-b border-separator py-3 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', ACCENT_CHIP[p.status === 'success' ? 'green' : p.status === 'pending' ? 'yellow' : 'red'])}>
                  {p.method === 'mobile_wallet' ? <Wallet size={18} /> : <CreditCard size={18} />}
                </div>
                <div>
                  <div className="text-[15px] font-medium text-ink-primary">
                    {Number(p.amount).toLocaleString()} TZS · {p.duration_months} months
                  </div>
                  <div className="text-[12px] text-ink-secondary">
                    {new Date(p.created_at).toLocaleDateString('en-GB')} · {p.provider_reference}
                  </div>
                </div>
              </div>
              <Badge tone={p.status === 'success' ? 'green' : p.status === 'pending' ? 'orange' : 'red'}>{p.status}</Badge>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-[14px] text-ink-tertiary">No payments yet</div>
        )}
      </div>
    </div>
  );
}
