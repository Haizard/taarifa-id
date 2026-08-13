'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Building2, GraduationCap, HeartPulse, ShieldCheck, UserRound, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ACCENT_CHIP, ACCOUNT_TYPE_TONE } from '@/components/ui/GlassCard';

const ACCOUNT_TYPES = [
  { key: 'individual', label: 'Individual', icon: UserRound },
  { key: 'family', label: 'Family', icon: Users },
  { key: 'school', label: 'School', icon: GraduationCap },
  { key: 'business', label: 'Business', icon: Building2 },
  { key: 'institution', label: 'Institution', icon: ShieldCheck },
];

const SLIDES = [
  {
    title: 'Your identity, always with you',
    body: 'A digital ID card with a QR code that exposes only the information you choose.',
  },
  {
    title: 'Ready for emergencies',
    body: 'Critical health details and emergency contacts instantly accessible when it matters most.',
  },
  {
    title: 'Works for families & organizations',
    body: 'Manage members as a family, school, business, or institution with full privacy controls.',
  },
];

export default function Home() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    api
      .get<Record<string, number>>('/public/stats')
      .then((d) => setCounts(d))
      .catch(() => setCounts(null));
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="app-bg">
      {/* Sticky glass header */}
      <header className="sticky top-0 z-20 border-b border-glass-border bg-glass-strong/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-[15px] font-bold text-white">
              T
            </div>
            <span className="text-[18px] font-bold text-ink-primary">TAARIFA ID</span>
          </div>
          <nav className="hidden items-center gap-6 text-[15px] text-ink-secondary sm:flex">
            <a href="#product" className="hover:text-ink-primary">Product</a>
            <a href="#partners" className="hover:text-ink-primary">Partners</a>
            <a href="#counters" className="hover:text-ink-primary">Community</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="glass rounded-button px-4 py-2 text-[15px] font-medium text-accent-primary">
              Log in
            </Link>
            <Link href="/register" className="rounded-button bg-accent-primary px-4 py-2 text-[15px] font-semibold text-white">
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-4 pt-16 pb-12 text-center">
        <div className="glass inline-block rounded-full px-4 py-1.5 text-[13px] font-medium text-accent-primary">
          Digital Identity & Emergency Profiles
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-[44px] font-bold leading-tight tracking-[-0.5px] text-ink-primary sm:text-[56px]">
          One ID card. <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">Total control</span> over who sees your data.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[17px] text-ink-secondary">
          TAARIFA_ID gives every person, family, school, business, and institution a unique Profile ID,
          QR code, and printable ID card — with field-level privacy.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className="flex h-[50px] w-full items-center justify-center gap-2 rounded-button bg-accent-primary text-[17px] font-semibold text-white sm:w-auto sm:px-8">
            Get your ID now <ArrowRight size={18} />
          </Link>
          <Link href="/register" className="glass flex h-[50px] w-full items-center justify-center rounded-button text-[17px] font-medium text-accent-primary sm:w-auto sm:px-8">
            Register a Family / Organization
          </Link>
        </div>
      </section>

      {/* Product explainer slides */}
      <section id="product" className="mx-auto max-w-[1200px] px-4 py-10">
        <div className="glass mx-auto max-w-lg p-8 text-center">
          <div className="mb-6 flex justify-center text-accent-primary">
            {slide === 0 ? <ShieldCheck size={44} /> : slide === 1 ? <HeartPulse size={44} /> : <Users size={44} />}
          </div>
          <h3 className="text-[22px] font-semibold text-ink-primary">{SLIDES[slide].title}</h3>
          <p className="mt-2 text-[16px] text-ink-secondary">{SLIDES[slide].body}</p>
          <div className="mt-6 flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all ${i === slide ? 'w-6 bg-accent-primary' : 'w-2 bg-ink-tertiary/40'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Account types */}
      <section className="mx-auto max-w-[1200px] px-4 py-10">
        <h2 className="mb-6 text-center text-[28px] font-bold text-ink-primary">Choose your account type</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {ACCOUNT_TYPES.map((t) => (
            <Link key={t.key} href={`/register?type=${t.key}`} className="glass btn-scale flex flex-col items-center gap-3 p-6 text-center">
              <div className={cn('flex h-14 w-14 items-center justify-center rounded-full', ACCENT_CHIP[ACCOUNT_TYPE_TONE[t.key] ?? 'blue'])}>
                <t.icon size={26} />
              </div>
              <div className="text-[17px] font-semibold text-ink-primary">{t.label}</div>
              <div className="text-[12px] text-ink-tertiary">{t.label === 'Individual' ? 'Self profile' : 'RESELLER account'}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="mx-auto max-w-[1200px] px-4 py-10">
        <div className="glass flex flex-wrap items-center justify-center gap-6 px-6 py-6">
          {['Sunriver Systems', 'Beem SMS', 'Selcom', 'Azampay', 'NIDA'].map((p) => (
            <span key={p} className="text-[15px] font-semibold text-ink-tertiary">{p}</span>
          ))}
        </div>
      </section>

      {/* Live counters */}
      <section id="counters" className="mx-auto max-w-[1200px] px-4 py-10">
        <h2 className="mb-6 text-center text-[28px] font-bold text-ink-primary">Trusted across Tanzania</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {ACCOUNT_TYPES.map((t) => (
            <div key={t.key} className="glass p-5 text-center">
              <div className="text-[30px] font-bold text-ink-primary">{counts?.[t.key] ?? '—'}</div>
              <div className="mt-1 text-[13px] text-ink-secondary">{t.label}s</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-[13px] text-ink-tertiary">
          <HeartPulse size={14} className="inline mr-1" />
          Live counters update in real time from the platform.
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-10 border-t border-glass-border bg-glass-strong/60 py-8">
        <div className="mx-auto max-w-[1200px] px-4 text-center">
          <div className="text-[14px] text-ink-secondary">© {new Date().getFullYear()} TAARIFA_ID</div>
          <div className="mt-1 text-[13px] text-ink-tertiary">Powered by Sunriver Systems</div>
        </div>
      </footer>
    </div>
  );
}
