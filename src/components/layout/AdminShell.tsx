'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, UserRound, CreditCard, BarChart3, LogOut, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { ACCENT_CHIP, type AccentTone } from '@/components/ui/GlassCard';

const NAV: { href: string; label: string; icon: any; tone: AccentTone }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, tone: 'blue' },
  { href: '/admin/accounts', label: 'Accounts', icon: Users, tone: 'lavender' },
  { href: '/admin/users', label: 'Users', icon: UserRound, tone: 'yellow' },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard, tone: 'green' },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, tone: 'red' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { clear } = useAuthStore();

  return (
    <div className="app-bg min-h-screen">
      <div className="mx-auto flex max-w-[1200px]">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-glass-border bg-glass-strong px-4 py-6 lg:flex">
          <div className="mb-8 px-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-danger text-[15px] font-bold text-white">
                <ShieldCheck size={18} />
              </div>
              <span className="text-[18px] font-bold text-ink-primary">TAARIFA Admin</span>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-button px-3 py-3 text-[16px] font-medium transition-colors',
                  pathname === item.href ? ACCENT_CHIP[item.tone] : 'text-ink-secondary hover:bg-glass-subtle',
                )}
              >
                <item.icon size={22} strokeWidth={2} />
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => {
              clear();
              router.push('/');
            }}
            className="mt-4 flex items-center gap-3 rounded-button px-3 py-3 text-[16px] text-accent-danger hover:bg-glass-subtle"
          >
            <LogOut size={22} />
            Sign out
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-20 border-b border-glass-border bg-glass-strong/80 px-4 py-4 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-danger text-white">
                  <ShieldCheck size={15} />
                </div>
                <span className="text-[17px] font-bold text-ink-primary">TAARIFA Admin</span>
              </div>
              <button
                onClick={() => {
                  clear();
                  router.push('/');
                }}
                aria-label="Sign out"
                className="flex items-center gap-1.5 rounded-button px-3 py-2 text-[14px] font-medium text-accent-danger active:bg-glass-subtle"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </div>
          <main className="px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:py-8">{children}</main>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 lg:hidden">
        <div className="glass-strong mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'btn-scale flex flex-col items-center gap-1 rounded-button px-3 py-2',
                pathname === item.href ? ACCENT_CHIP[item.tone] : 'text-ink-secondary',
              )}
            >
              <item.icon size={24} strokeWidth={pathname === item.href ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
