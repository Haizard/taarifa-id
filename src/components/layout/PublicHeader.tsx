'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/services', label: 'Explore services' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/organizations', label: 'For organizations' },
];

export function PublicHeader() {
  const pathname = usePathname();
  return <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <Link href="/" aria-label="Taarifa ID home" className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg font-bold text-white">T</span>
        <span className="text-[16px] font-extrabold tracking-tight sm:text-[17px]">TAARIFA <span className="text-emerald-700">ID</span></span>
      </Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-5 text-[13px] font-medium text-slate-600 lg:flex xl:gap-7 xl:text-[14px]">
        {links.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className={`transition hover:text-emerald-700 ${pathname === item.href ? 'text-emerald-800' : ''}`}>{item.label}</Link>)}
      </nav>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link href="/login" className="rounded-lg px-2.5 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-100 sm:px-4 sm:text-sm">Log in</Link>
        <Link href="/register" className="rounded-lg bg-emerald-700 px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-emerald-800 sm:px-4 sm:text-sm">Create account</Link>
      </div>
    </div>
    <nav aria-label="Mobile navigation" className="flex gap-5 overflow-x-auto border-t border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 lg:hidden">
      {links.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className="shrink-0 hover:text-emerald-700">{item.label}</Link>)}
    </nav>
  </header>;
}

export function PublicFooter() {
  return <footer className="border-t border-slate-200 bg-white">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
      <Link href="/" className="flex items-center gap-2 font-bold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-xs text-white">T</span>TAARIFA ID</Link>
      <span>Services, organizations, and information in one connected place.</span>
      <div className="flex flex-wrap gap-4"><Link href="/services" className="hover:text-emerald-700">Services</Link><Link href="/how-it-works" className="hover:text-emerald-700">How it works</Link><Link href="/organizations" className="hover:text-emerald-700">Organizations</Link><Link href="/login" className="hover:text-emerald-700">Log in</Link></div>
    </div>
  </footer>;
}
