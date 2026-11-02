'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, GraduationCap, MapPin, Search, Siren, Store } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, LargeTitleHeader, SectionLabel, type AccentTone } from '@/components/ui/GlassCard';

type Category = 'hospital' | 'school' | 'garage';
type Service = { id: string; title: string; description: string | null; delivery_mode: string; price_type: string; price_amount: string | null; provider: { category: Category; display_name: string; verification_status: string; region: string | null; district: string | null; rating?: number; review_count?: number } };
const categories: { id: 'all' | Category; label: string; icon: any; tone: AccentTone }[] = [
  { id: 'all', label: 'All', icon: Store, tone: 'blue' }, { id: 'hospital', label: 'Hospitals', icon: Siren, tone: 'red' },
  { id: 'school', label: 'Schools', icon: GraduationCap, tone: 'yellow' }, { id: 'garage', label: 'Emergency garages', icon: Building2, tone: 'green' },
];

export default function PublicServicesPage() {
  const { user } = useAuthStore();
  const [category, setCategory] = useState<'all' | Category>('all');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('category');
    if (value && categories.some((item) => item.id === value)) setCategory(value as Category);
  }, []);
  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-services', category, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (search) params.set('q', search);
      return api.get<Service[]>(`/marketplace/services${params.size ? `?${params.toString()}` : ''}`);
    },
  });

  return (
    <div className="app-bg min-h-screen">
      <header className="sticky top-0 z-20 border-b border-glass-border bg-glass-strong/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between"><Link href="/" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary font-bold text-white">T</span><span className="font-bold text-ink-primary">TAARIFA ID</span></Link><div className="flex gap-2"><Link href="/login" className="glass rounded-full px-4 py-2 text-[14px] font-medium text-accent-primary">Log in</Link><Link href="/register" className="rounded-full bg-accent-primary px-4 py-2 text-[14px] font-semibold text-white">Join</Link></div></div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <LargeTitleHeader title="Find a service" subtitle="Browse provider services. Your information is shared only when you send a request." />
        <label className="glass mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-ink-secondary"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by service, provider, or location" className="min-w-0 flex-1 bg-transparent text-[15px] text-ink-primary outline-none placeholder:text-ink-tertiary" /></label>
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">{categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`glass flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-[13px] font-semibold ${category === item.id ? 'ring-2 ring-accent-primary text-accent-primary' : 'text-ink-secondary'}`}><item.icon size={17} />{item.label}</button>)}</div>
        <SectionLabel tone="blue">Available services</SectionLabel>
        {isLoading ? <div className="glass p-8 text-center text-ink-secondary">Loading services…</div> : !data?.length ? <div className="glass p-8 text-center text-ink-secondary">No services match your search yet. Try a different category or check back soon.</div> : <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{data.map((service) => <article key={service.id} className="glass p-5">
          <div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-ink-primary">{service.title}</div><div className="mt-1 text-[14px] text-accent-primary">{service.provider.display_name}</div><div className="mt-1"><Badge tone={service.provider.verification_status === 'verified' ? 'green' : 'grey'}>{service.provider.verification_status === 'verified' ? 'Verified organization' : 'Not verified by platform'}</Badge></div></div><Badge tone={service.provider.category === 'hospital' ? 'red' : service.provider.category === 'school' ? 'yellow' : 'green'}>{service.provider.category}</Badge></div>
          {service.description && <p className="mt-3 text-[14px] text-ink-secondary">{service.description}</p>}
          <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-ink-tertiary"><span>{service.delivery_mode.replaceAll('_', ' ')}</span><span>{service.price_type === 'fixed' && service.price_amount ? `${Number(service.price_amount).toLocaleString()} TZS` : service.price_type === 'free' ? 'Free' : 'Quote from provider'}</span>{service.provider.rating !== undefined && <span>★ {service.provider.rating} ({service.provider.review_count} reviews)</span>}{[service.provider.district, service.provider.region].filter(Boolean).length > 0 && <span className="inline-flex items-center gap-1"><MapPin size={13} />{[service.provider.district, service.provider.region].filter(Boolean).join(', ')}</span>}</div>
          <Link href={user ? `/dashboard/services/${service.id}` : '/login'} className="mt-4 flex items-center justify-end gap-2 text-[13px] font-semibold text-accent-primary">{user ? 'Request service' : 'Log in to request'} <ArrowRight size={15} /></Link>
        </article>)}</div>}
      </main>
    </div>
  );
}
