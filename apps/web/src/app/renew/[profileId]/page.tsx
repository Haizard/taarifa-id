'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { GlassButton } from '@/components/ui/GlassCard';
import { IOSSelect, IOSInput } from '@/components/ui/IOSListGroup';
import { useAuthStore } from '@/lib/auth-store';

export default function RenewPage() {
  const params = useParams<{ profileId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [method, setMethod] = useState<'mobile_wallet' | 'bank'>('mobile_wallet');
  const [months, setMonths] = useState(12);
  const [amount, setAmount] = useState(12000);
  const [loading, setLoading] = useState(false);

  const PRICES: Record<number, number> = { 3: 3500, 6: 6500, 12: 12000 };
  const setDuration = (m: number) => {
    setMonths(m);
    setAmount(PRICES[m] ?? amount);
  };

  const submit = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      await api.post('/payments', { amount, method, duration_months: months });
      toast.success('Payment received. Your profile will be activated.');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="glass-strong p-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-warning/15 text-accent-warning">
            <AlertTriangle size={26} />
          </div>
          <h1 className="mb-1 text-[28px] font-bold text-ink-primary">Profile expired</h1>
          <p className="mb-6 text-[15px] text-ink-secondary">
            The profile <span className="font-mono font-medium">{params.profileId}</span> has expired.
            Renew your subscription to reactivate your ID card and QR code.
          </p>

          <div className="mb-5 rounded-button bg-glass-subtle px-4 py-3 text-center text-[22px] font-bold text-ink-primary">
            {amount.toLocaleString()} TZS / {months} months
          </div>

          <div className="space-y-1">
            <IOSSelect label="Payment method" value={method} onChange={(v) => setMethod(v as any)}>
              <option value="mobile_wallet">Mobile wallet</option>
              <option value="bank">Bank account</option>
            </IOSSelect>
            <IOSSelect label="Duration" value={String(months)} onChange={(v) => setDuration(Number(v))}>
              <option value="3">3 months — 3,500 TZS</option>
              <option value="6">6 months — 6,500 TZS</option>
              <option value="12">12 months — 12,000 TZS</option>
            </IOSSelect>          </div>

          <div className="mt-6">
            <GlassButton onClick={submit} disabled={loading}>
              {loading ? 'Processing…' : user ? 'Pay now' : 'Log in to renew'}
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
}
