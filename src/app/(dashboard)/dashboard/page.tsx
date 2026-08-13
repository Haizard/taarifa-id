'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, QrCode, UserRound, UsersRound, MapPin, BadgeCheck, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { LargeTitleHeader, StatCard, Badge, GlassCard, SectionLabel, ACCENT_CHIP, type AccentTone } from '@/components/ui/GlassCard';
import { ProgressRing } from '@/components/ui/Control';

interface DashboardData {
  me: any;
  profiles: any[];
  entity: any;
  status: any;
  payments: any[];
}

export default function DashboardOverview() {
  const { user } = useAuthStore();
  const [counts, setCounts] = useState({ profiles: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user?.sub],
    queryFn: async () => {
      const [me, profiles, entity, status, payments] = await Promise.all([
        api.get('/accounts/me'),
        api.get('/profiles'),
        api.get('/profiles/entity').catch(() => null),
        api.get('/payments/status').catch(() => null),
        api.get('/payments/history').catch(() => []),
      ]);
      return { me, profiles, entity, status, payments };
    },
    enabled: !!user,
  });

  const complete =
    data?.profiles?.length
      ? data.profiles.reduce((acc: number, p: any) => {
          let n = 0;
          if (p.first_name && p.last_name && p.gender && p.birthdate && p.nationality) n += 40;
          if (p.health?.blood_group || p.health?.height) n += 15;
          if (p.residence?.region) n += 15;
          if (p.emergencyContacts?.length) n += 20;
          if (p.employment?.employment_type) n += 10;
          return Math.max(acc, n);
        }, 0)
      : 0;

  const expired = data?.status?.status === 'expired' || (data?.status?.expire_date && new Date(data.status.expire_date) < new Date());

  const quickActions: { href: string; label: string; icon: any; tone: AccentTone }[] = [
    { href: '/dashboard/profile', label: 'Edit profile', icon: UserRound, tone: 'blue' },
    { href: '/dashboard/printable', label: 'ID card', icon: QrCode, tone: 'lavender' },
    { href: '/dashboard/payments', label: 'Pay / renew', icon: CreditCard, tone: 'yellow' },
    ...(user?.role !== 'individual' ? [{ href: '/dashboard/sub-accounts', label: 'Members', icon: UsersRound, tone: 'red' as AccentTone }] : []),
  ];

  return (
    <div>
      <LargeTitleHeader
        title="Home"
        subtitle={data?.me ? `${data.me.username}` : 'Welcome'}
        right={
          data?.status && (
            <div className="flex flex-col items-end gap-1">
              <Badge tone={expired ? 'red' : 'green'}>{expired ? 'Expired' : 'Active'}</Badge>
              {data.status.expire_date && !expired && (
                <span className="text-[12px] text-ink-tertiary">
                  Renews {new Date(data.status.expire_date).toLocaleDateString()}
                </span>
              )}
            </div>
          )
        }
      />

      {expired && (
        <div className="mb-6 flex items-center gap-3 rounded-button bg-accent-danger/10 p-4 text-[15px] text-accent-danger">
          <Clock size={20} />
          <div>
            <div className="font-semibold">Your profile has expired</div>
            <Link href="/dashboard/payments" className="underline">Renew now</Link> to reactivate your QR and ID card.
          </div>
        </div>
      )}

      {user?.role !== 'individual' && (
        <div className="mb-6 flex items-center justify-center gap-2 rounded-button bg-accent-secondary/15 px-4 py-3 text-[14px] font-semibold text-accent-secondary">
          RESELLER — {user?.account_type} account
        </div>
      )}

      <SectionLabel tone="blue">Your profile</SectionLabel>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass flex flex-col items-center justify-center p-5">
          <ProgressRing percent={complete} label="complete" />
        </div>
        <StatCard tone="blue" icon={<BadgeCheck size={22} />} value={data?.me?.profile_id ?? '—'} label="Profile ID" />
        <StatCard tone="lavender" icon={<UsersRound size={22} />} value={data?.profiles?.length ?? 0} label="Person profiles" />
        <StatCard tone="yellow" icon={<CreditCard size={22} />} value={data?.payments?.length ?? 0} label="Payments" />
      </div>

      <SectionLabel tone="lavender">Quick actions</SectionLabel>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickActions.map((a) => (
          <Link key={a.href} href={a.href} className="glass btn-scale flex flex-col items-start gap-3 p-5">
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-full', ACCENT_CHIP[a.tone])}>
              <a.icon size={22} />
            </div>
            <span className="text-[15px] font-semibold text-ink-primary">{a.label}</span>
          </Link>
        ))}
      </div>

      {data?.profiles && data.profiles.length > 0 && (
        <>
          <SectionLabel tone="yellow">Profiles</SectionLabel>
          <div className="glass p-5">
            {data.profiles.map((p: any, i: number) => (
              <Link
                key={p.id}
                href={`/dashboard/profile?id=${p.id}`}
                className="flex items-center justify-between border-b border-separator py-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', ACCENT_CHIP[['blue', 'lavender', 'yellow', 'red'][i % 4] as AccentTone])}>
                    <UserRound size={20} />
                  </div>
                  <div>
                    <div className="text-[16px] font-medium text-ink-primary">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="text-[12px] capitalize text-ink-secondary">{p.member_type} · {p.profile_code}</div>
                  </div>
                </div>
                <span className="text-[13px] text-accent-primary">Edit</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
