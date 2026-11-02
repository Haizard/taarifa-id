'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, GraduationCap, MapPin, Search, Siren, Star, Store } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, type AccentTone } from '@/components/ui/GlassCard';
import { ProviderMark } from '@/components/marketplace/ProviderMark';
import { PublicFooter, PublicHeader } from '@/components/layout/PublicHeader';

type Category = 'hospital' | 'school' | 'garage';
type Service = { id: string; title: string; description: string | null; delivery_mode: string; price_type: string; price_amount: string | null; provider: { category: Category; display_name: string; logo_url?: string | null; verification_status: string; region: string | null; district: string | null; rating?: number; review_count?: number } };
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
    setSearch(new URLSearchParams(window.location.search).get('q') ?? '');
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
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-9 sm:px-8 lg:px-10">
        <div className="mb-7 rounded-[24px] bg-emerald-950 px-6 py-8 text-white sm:px-9"><div className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-300">Taarifa ID marketplace</div><div className="mt-2 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-[32px] font-bold tracking-tight sm:text-[38px]">Find a service</h1><p className="mt-2 max-w-xl text-[14px] leading-6 text-emerald-50/75">Browse trusted local organizations and compare their services. Your saved information stays private until you choose to send a request.</p></div><Link href="/register" className="rounded-xl bg-white px-4 py-3 text-[13px] font-bold text-emerald-900">Join the platform <ArrowRight className="ml-1 inline" size={15} /></Link></div></div>
        <label className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-400 shadow-sm"><Search size={19} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by service, provider, or location" className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400" /></label>
        <div className="mb-7 grid grid-cols-2 gap-2 sm:grid-cols-4">{categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[13px] font-semibold transition ${category === item.id ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}><item.icon size={17} />{item.label}</button>)}</div>
        <div className="mb-4 flex items-end justify-between"><div><div className="text-[11px] font-bold uppercase tracking-[.14em] text-emerald-700">Available now</div><h2 className="mt-1 text-[22px] font-bold text-slate-900">Services from local providers</h2></div><span className="text-[12px] text-slate-500">{data?.length ?? 0} results</span></div>
        {isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading services…</div> : !data?.length ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No services match your search yet. Try another category or check back soon.</div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map((service) => <article key={service.id} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg">
          <div className="flex items-center gap-3"><ProviderMark name={service.provider.display_name} category={service.provider.category} logoUrl={service.provider.logo_url} /><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold text-slate-800">{service.provider.display_name}</div><div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">{service.provider.verification_status === 'verified' && <Badge tone="green">Verified</Badge>}<span className="capitalize">{service.provider.category}</span></div></div></div>
          <h3 className="mt-5 text-[18px] font-bold text-slate-900">{service.title}</h3>{service.description && <p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-slate-500">{service.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-slate-500"><span>{service.delivery_mode.replaceAll('_', ' ')}</span>{[service.provider.district, service.provider.region].filter(Boolean).length > 0 && <span className="inline-flex items-center gap-1"><MapPin size={13} />{[service.provider.district, service.provider.region].filter(Boolean).join(', ')}</span>}{service.provider.rating !== undefined && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-700"><Star size={12} fill="currentColor" />{service.provider.rating} <span className="font-normal">({service.provider.review_count})</span></span>}</div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[14px] font-bold text-slate-900">{service.price_type === 'fixed' && service.price_amount ? `${Number(service.price_amount).toLocaleString()} TZS` : service.price_type === 'free' ? 'Free' : 'Quote from provider'}</span><Link href={user ? `/dashboard/services/${service.id}` : '/login'} className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-700">{user ? 'View service' : 'Sign in'} <ArrowRight size={15} /></Link></div>
        </article>)}</div>}
      </main>
      <PublicFooter />
    </div>
  );
}
