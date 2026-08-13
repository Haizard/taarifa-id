'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, UserRound, School, Briefcase, Building2, HeartHandshake, CheckCircle2, AlertTriangle, CreditCard, Link as LinkIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LargeTitleHeader, StatCard, ACCENT_CHIP, type AccentTone } from '@/components/ui/GlassCard';

const TYPE_COLORS: Record<string, { icon: React.ReactNode; label: string; tone: AccentTone }> = {
  individual: { icon: <UserRound size={20} />, label: 'Individual', tone: 'blue' },
  family: { icon: <HeartHandshake size={20} />, label: 'Family', tone: 'lavender' },
  school: { icon: <School size={20} />, label: 'School', tone: 'yellow' },
  business: { icon: <Briefcase size={20} />, label: 'Business', tone: 'red' },
  institution: { icon: <Building2 size={20} />, label: 'Institution', tone: 'green' },
};

export default function AdminDashboard() {
  const { data } = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => api.get('/admin/dashboard') });
  const counts = data?.counts ?? {};

  return (
    <div>
      <LargeTitleHeader title="Dashboard" subtitle="Platform overview" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tone="blue" icon={<Users size={22} />} value={counts.totalAccounts ?? 0} label="Total accounts" />
        <StatCard tone="green" icon={<CheckCircle2 size={22} />} value={counts.active ?? 0} label="Active" />
        <StatCard tone="red" icon={<AlertTriangle size={22} />} value={counts.expired ?? 0} label="Expired profiles" />
        <StatCard tone="yellow" icon={<CreditCard size={22} />} value={data?.paymentsToday ?? 0} label="Payments today" />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Object.entries(TYPE_COLORS).map(([type, { icon, label, tone }]) => (
          <div key={type} className="glass flex flex-col items-center p-4 text-center">
            <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-full', ACCENT_CHIP[tone])}>
              {icon}
            </div>
            <div className="text-[28px] font-bold text-ink-primary">{counts[type] ?? 0}</div>
            <div className="mt-1 text-[13px] text-ink-secondary">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <StatCard tone="lavender" icon={<LinkIcon size={22} />} value={data?.urlAccesses ?? 0} label="Public URL accesses" />
      </div>
    </div>
  );
}
