'use client';

import { useQuery } from '@tanstack/react-query';
import { UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LargeTitleHeader, Badge, ACCENT_CHIP, ACCOUNT_TYPE_TONE, type AccentTone } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/Control';

export default function AdminUsers() {
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => api.get('/admin/users') });

  return (
    <div>
      <LargeTitleHeader title="Users" subtitle={`${users?.length ?? 0} user account(s)`} />
      {users?.length ? (
        <div className="glass p-4">
          {users.map((u: any) => (
            <div key={u.id} className="flex flex-col gap-2 border-b border-separator py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', ACCENT_CHIP[ACCOUNT_TYPE_TONE[u.account_type] ?? 'blue'])}>
                  <UserRound size={20} />
                </div>
                <div>
                  <div className="text-[15px] font-medium text-ink-primary">
                    {u.personProfiles?.[0]?.first_name} {u.personProfiles?.[0]?.last_name || u.username}
                  </div>
                  <div className="text-[12px] text-ink-secondary">
                    @{u.username} · {u.profile_id}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={ACCOUNT_TYPE_TONE[u.account_type] ?? 'grey'}>{u.account_type}</Badge>
                {u.parentAccount ? (
                  <Badge tone="orange">sub of @{u.parentAccount.username}</Badge>
                ) : (
                  <Badge tone="green">self</Badge>
                )}
                <Badge tone={u.status === 'active' ? 'green' : u.status === 'locked' ? 'red' : 'grey'}>{u.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<UserRound size={28} />} title="No users yet" subtitle="Users appear once sub-accounts are created." />
      )}
    </div>
  );
}
