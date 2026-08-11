'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  UserRound,
  UsersRound,
  CreditCard,
  QrCode,
  Settings,
  ArrowLeftRight,
  Bell,
  LogOut,
  Home,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Home', icon: Home, show: () => true },
  { href: '/dashboard/profile', label: 'Profile', icon: UserRound, show: () => true },
  { href: '/dashboard/sub-accounts', label: 'Members', icon: UsersRound, show: (r: string) => r !== 'individual' },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard, show: () => true },
  { href: '/dashboard/printable', label: 'ID Card', icon: QrCode, show: () => true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, show: () => true },
  { href: '/dashboard/move-account', label: 'Move', icon: ArrowLeftRight, show: () => true },
];

const MOBILE_TABS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/profile', label: 'Profile', icon: UserRound },
  { href: '/dashboard/payments', label: 'Pay', icon: CreditCard },
  { href: '/dashboard/printable', label: 'Card', icon: QrCode },
  { href: '/dashboard/settings', label: 'More', icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clear } = useAuthStore();
  const [showLogout, setShowLogout] = useState(false);

  const nav = NAV.filter((n) => n.show(user?.role ?? ''));

  return (
    <div className="app-bg">
      <div className="mx-auto flex max-w-[1200px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-glass-border bg-glass-strong px-4 py-6 lg:flex">
          <div className="mb-8 px-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-[15px] font-bold text-white">
                T
              </div>
              <span className="text-[18px] font-bold text-ink-primary">TAARIFA ID</span>
            </div>
            {user && (
              <div className="mt-4 rounded-button bg-glass-subtle px-3 py-2 text-[12px] text-ink-secondary">
                {user.username} · {user.account_type}
                {user.role !== 'individual' && (
                  <span className="ml-1 rounded-full bg-accent-secondary/20 px-2 py-0.5 text-[10px] font-semibold text-accent-secondary">
                    RESELLER
                  </span>
                )}
              </div>
            )}
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-button px-3 py-3 text-[16px] font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'text-ink-secondary hover:bg-glass-subtle',
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

        {/* Main */}
        <div className="min-w-0 flex-1">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-20 border-b border-glass-border bg-glass-strong/80 px-4 py-4 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-[13px] font-bold text-white">
                  T
                </div>
                <span className="text-[17px] font-bold text-ink-primary">TAARIFA ID</span>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/dashboard/notifications" className="glass-subtle p-2 text-ink-secondary">
                  <Bell size={18} />
                </Link>
                <button onClick={() => setShowLogout((v) => !v)} className="glass-subtle p-2 text-ink-secondary">
                  <LogOut size={18} />
                </button>
              </div>
            </div>
            {showLogout && (
              <button
                onClick={() => {
                  clear();
                  router.push('/');
                }}
                className="mt-2 w-full rounded-button bg-accent-danger/10 py-2 text-[14px] font-medium text-accent-danger"
              >
                Sign out
              </button>
            )}
          </div>

          <main className="px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 lg:hidden">
        <div className="glass-strong mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {MOBILE_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'btn-scale flex flex-col items-center gap-1 rounded-button px-3 py-2',
                pathname === tab.href ? 'text-accent-primary' : 'text-ink-secondary',
              )}
            >
              <tab.icon size={24} strokeWidth={pathname === tab.href ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
