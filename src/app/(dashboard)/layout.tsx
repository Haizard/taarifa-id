'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Shell } from '@/components/layout/Shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const unsub = useAuthStore.subscribe((s, prev) => {
        if (s.user !== prev.user) {
          console.log('[DBG-LAYOUT] user', JSON.stringify(prev.user?.username), '->', JSON.stringify(s.user?.username));
          if (!s.user && prev.user) console.log('[DBG-LAYOUT] TRACE', new Error().stack);
        }
      });
      console.log('[DBG-LAYOUT] mount user=', JSON.stringify(useAuthStore.getState().user?.username));
      return unsub;
    }
  }, []);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;
  return <Shell>{children}</Shell>;
}
