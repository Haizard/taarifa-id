'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { AdminShell } from '@/components/layout/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'system_admin') router.replace('/dashboard');
  }, [user, router]);

  if (!user || user.role !== 'system_admin') return null;
  return <AdminShell>{children}</AdminShell>;
}
