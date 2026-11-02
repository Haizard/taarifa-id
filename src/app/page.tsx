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
    title: 'One place for your important information',
    body: 'Keep health, school, vehicle, and personal details organized in a private client profile.',
  },
  {
    title: 'Find help when you need it',
    body: 'Send a request to a hospital, school, or nearby emergency garage and receive provider offers.',
  },
  {
    title: 'Share on your terms',
    body: 'Choose one provider or share a request with matching nearby providers. Your saved profile stays private.',
  },
];

export default function Home() {
  const [counts, setCounts] = useState<{ providers: { hospitals: number; schools: number; garages: number }; active_services: number } | null>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    api
      .get<{ providers: { hospitals: number; schools: number; garages: number }; active_services: number }>('/public/stats')
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
            <Link href="/services" className="hover:text-ink-primary">Services</Link>
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
          A simpler way to find and provide help
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-[44px] font-bold leading-tight tracking-[-0.5px] text-ink-primary sm:text-[56px]">
          Find the right help. <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">Share only what you choose.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[17px] text-ink-secondary">
          Connect with hospitals, schools, and emergency garages. Keep your information organized,
          request services, compare provider offers, and choose what each provider receives.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/services" className="flex h-[50px] w-full items-center justify-center gap-2 rounded-button bg-accent-primary text-[17px] font-semibold text-white sm:w-auto sm:px-8">
            Browse services <ArrowRight size={18} />
          </Link>
          <Link href="/register" className="glass flex h-[50px] w-full items-center justify-center rounded-button text-[17px] font-medium text-accent-primary sm:w-auto sm:px-8">
            Join as a client or provider
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

      {/* Service categories */}
      <section id="partners" className="mx-auto max-w-[1200px] px-4 py-10">
        <h2 className="mb-5 text-center text-[25px] font-bold text-ink-primary">Start with the services people need most</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { title: 'Hospitals & clinics', body: 'Appointments, care requests, and urgent enquiries', icon: HeartPulse, category: 'hospital' },
            { title: 'Schools', body: 'Admissions, visits, and student support', icon: GraduationCap, category: 'school' },
            { title: 'Emergency garages', body: 'Roadside repairs, towing, and vehicle recovery', icon: Building2, category: 'garage' },
          ].map((service) => <Link key={service.category} href={`/services?category=${service.category}`} className="glass btn-scale flex items-center gap-4 p-5"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary"><service.icon size={24} /></div><div><div className="font-semibold text-ink-primary">{service.title}</div><div className="mt-1 text-[13px] text-ink-secondary">{service.body}</div></div></Link>)}
        </div>
      </section>

      {/* Live counters */}
      <section id="counters" className="mx-auto max-w-[1200px] px-4 py-10">
        <h2 className="mb-6 text-center text-[28px] font-bold text-ink-primary">A growing service network</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Hospital & clinic providers', value: counts?.providers?.hospitals },
            { label: 'School providers', value: counts?.providers?.schools },
            { label: 'Emergency garages', value: counts?.providers?.garages },
            { label: 'Published services', value: counts?.active_services },
          ].map((item) => (
            <div key={item.label} className="glass p-5 text-center">
              <div className="text-[30px] font-bold text-ink-primary">{item.value ?? '—'}</div>
              <div className="mt-1 text-[13px] text-ink-secondary">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-[13px] text-ink-tertiary">
          <HeartPulse size={14} className="inline mr-1" />
          Provider counts and available services update from the platform.
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
