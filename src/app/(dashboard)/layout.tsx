'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Shell } from '@/components/layout/Shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;
  return <Shell>{children}</Shell>;
}
