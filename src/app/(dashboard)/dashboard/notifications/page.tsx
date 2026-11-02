'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, AlertTriangle, Info, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { LargeTitleHeader, SectionLabel } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/Control';

const ICONS = {
  success: CheckCircle2,
  pending: Clock,
  info: Info,
  warning: AlertTriangle,
  member: UserPlus,
};

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { data: notificationData } = useQuery({ queryKey: ['notifications', user?.sub], queryFn: () => api.get<{ unread_count: number; items: Array<{ id: string; category: string; title: string; body: string; resource_path: string | null; read_at: string | null; created_at: string }> }>('/notifications'), enabled: !!user });
  const markRead = useMutation({ mutationFn: (id: string) => api.patch(`/notifications/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', user?.sub] }) });
  const { data: history } = useQuery({
    queryKey: ['payments-history', user?.sub],
    queryFn: () => api.get('/payments/history'),
    enabled: !!user,
  });

  const paymentItems = (history ?? []).map((p: any) => ({
    id: p.id,
    title: p.status === 'success' ? 'Payment confirmed' : p.status === 'pending' ? 'Payment pending' : 'Payment failed',
    body:
      p.status === 'success'
        ? `Your TZS ${p.amount} payment of ${p.duration_months} months was confirmed. Your profile has been activated.`
        : p.status === 'pending'
          ? `TZS ${p.amount} payment for ${p.duration_months} months is being processed.`
          : `Your TZS ${p.amount} payment could not be completed.`,
    icon: p.status === 'success' ? ('success' as const) : p.status === 'pending' ? ('pending' as const) : ('warning' as const),
    time: new Date(p.created_at).toLocaleString(),
    resource_path: null as string | null,
    read_at: new Date().toISOString(),
  }));
  const items = [
    ...(notificationData?.items ?? []).map((n) => ({ id: n.id, title: n.title, body: n.body, icon: n.category === 'organization' ? 'member' as const : n.category === 'verification' ? 'pending' as const : n.category === 'complaint' ? 'warning' as const : 'info' as const, time: new Date(n.created_at).toLocaleString(), resource_path: n.resource_path, read_at: n.read_at })),
    ...paymentItems,
  ];

  return (
    <div>
      <LargeTitleHeader title="Notifications" subtitle={notificationData?.unread_count ? `${notificationData.unread_count} unread · recent activity` : 'Recent activity'} />
      {items.length ? (
        items.map((n: any) => {
          const Icon = ICONS[n.icon as keyof typeof ICONS] ?? Info;
          return (
              <div key={n.id} className={`glass mb-3 flex items-start gap-3 p-4 ${n.read_at === null ? 'border border-accent-primary/20' : ''}`}>
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  n.icon === 'success' ? 'bg-accent-success/15 text-accent-success' : n.icon === 'pending' ? 'bg-accent-warning/15 text-accent-warning' : 'bg-accent-danger/15 text-accent-danger'
                }`}
              >
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[16px] font-semibold text-ink-primary">{n.title}</div>
                  <div className="shrink-0 text-[12px] text-ink-tertiary">{n.time}</div>
                </div>
                <div className="mt-0.5 text-[14px] text-ink-secondary">{n.body}</div>
                {n.resource_path && <a href={n.resource_path} onClick={() => n.read_at === null && markRead.mutate(n.id)} className="mt-2 inline-block text-[12px] font-semibold text-accent-primary">Open related item</a>}
                {n.read_at === null && <button onClick={() => markRead.mutate(n.id)} className="mt-2 block text-[11px] font-medium text-ink-tertiary">Mark as read</button>}
              </div>
            </div>
          );
        })
      ) : (
        <EmptyState icon={<Info size={28} />} title="No notifications yet" subtitle="Payment and renewal updates will appear here." />
      )}
      <SectionLabel tone="green">Info</SectionLabel>
      <div className="glass p-4 text-[14px] text-ink-secondary">
        SMS notifications for renewals and profile updates can be managed in Settings.
      </div>
    </div>
  );
}
