'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { AdminShell } from '@/components/layout/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const unsub = useAuthStore.subscribe((s, prev) => {
        if (s.user !== prev.user) {
          console.log('[DBG-ADMIN] user', JSON.stringify(prev.user?.username), '->', JSON.stringify(s.user?.username));
          if (!s.user && prev.user) console.log('[DBG-ADMIN] TRACE', new Error().stack);
        }
      });
      console.log('[DBG-ADMIN] mount user=', JSON.stringify(useAuthStore.getState().user?.username));
      return unsub;
    }
  }, []);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'system_admin') router.replace('/dashboard');
  }, [user, router]);

  if (!user || user.role !== 'system_admin') return null;
  return <AdminShell>{children}</AdminShell>;
}
