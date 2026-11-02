'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, GraduationCap, MapPin, Search, Siren, Store } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, SectionLabel, type AccentTone } from '@/components/ui/GlassCard';
import { ProviderMark } from '@/components/marketplace/ProviderMark';

type Category = 'hospital' | 'school' | 'garage';
type Service = {
  id: string; title: string; description: string | null; delivery_mode: string;
  price_type: string; price_amount: string | null;
  provider: { id: string; category: Category; display_name: string; logo_url?: string | null; verification_status: string; region: string | null; district: string | null; rating?: number; review_count?: number };
};

const categories: { id: 'all' | Category; label: string; icon: any; tone: AccentTone }[] = [
  { id: 'all', label: 'All services', icon: Store, tone: 'blue' },
  { id: 'hospital', label: 'Hospitals', icon: Siren, tone: 'red' },
  { id: 'school', label: 'Schools', icon: GraduationCap, tone: 'yellow' },
  { id: 'garage', label: 'Emergency garages', icon: Building2, tone: 'green' },
];

const deliveryLabel: Record<string, string> = {
  appointment: 'Appointment', on_demand: 'On demand', delivery: 'Pickup / delivery', enrollment: 'Enrollment',
};

export default function ServicesPage() {
  const { user } = useAuthStore();
  const [category, setCategory] = useState<'all' | Category>('all');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['marketplace-services', category, search],
    queryFn: () => api.get<Service[]>(`/marketplace/services${category === 'all' ? '' : `?category=${category}`}${category === 'all' && search ? '?' : category !== 'all' && search ? '&' : ''}${search ? `q=${encodeURIComponent(search)}` : ''}`),
  });
  const services = query.data ?? [];
  const countLabel = useMemo(() => `${services.length} ${services.length === 1 ? 'service' : 'services'} available`, [services.length]);

  return (
    <div>
      <div className="mb-6 rounded-[22px] bg-emerald-950 px-6 py-7 text-white sm:px-8"><div className="text-[11px] font-bold uppercase tracking-[.15em] text-emerald-300">Taarifa ID marketplace</div><h1 className="mt-2 text-[30px] font-bold tracking-tight sm:text-[34px]">Find a service</h1><p className="mt-2 max-w-2xl text-[14px] leading-6 text-emerald-50/75">Choose a local provider and send a private request. Your saved information stays private until you choose to share it.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/dashboard/requests" className="rounded-lg bg-white/10 px-3 py-2 text-[12px] font-semibold text-white hover:bg-white/15">My requests and offers →</Link>{user?.role === 'admin' && <Link href="/dashboard/provider" className="rounded-lg bg-white px-3 py-2 text-[12px] font-semibold text-emerald-900">Provider tools →</Link>}</div></div>

      <label className="glass mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-ink-secondary">
        <Search size={19} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search service, provider, or area" className="min-w-0 flex-1 bg-transparent text-[15px] text-ink-primary outline-none placeholder:text-ink-tertiary" />
      </label>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {categories.map((item) => (
          <button key={item.id} onClick={() => setCategory(item.id)} className={`glass flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-[13px] font-semibold ${category === item.id ? 'ring-2 ring-accent-primary text-accent-primary' : 'text-ink-secondary'}`}>
            <item.icon size={17} /> {item.label}
          </button>
        ))}
      </div>

      <SectionLabel tone="blue">{countLabel}</SectionLabel>
      {query.isLoading ? <div className="glass p-6 text-center text-ink-secondary">Loading services…</div> : query.error ? <div className="glass p-6 text-center text-accent-danger">Could not load services.</div> : services.length === 0 ? (
        <div className="glass p-8 text-center">
          <Store className="mx-auto mb-3 text-accent-primary" size={30} />
          <div className="text-[17px] font-semibold text-ink-primary">No services match yet</div>
          <p className="mt-2 text-[14px] text-ink-secondary">Try another category or search, or check back when providers publish their services.</p>
          {user?.role === 'admin' && <Link href="/dashboard/provider" className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-accent-primary">Set up your provider profile <ArrowRight size={16} /></Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <Link key={service.id} href={`/dashboard/services/${service.id}`} className="group block rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg">
              <div className="flex items-center gap-3"><ProviderMark name={service.provider.display_name} category={service.provider.category} logoUrl={service.provider.logo_url} /><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold text-slate-800">{service.provider.display_name}</div><div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">{service.provider.verification_status === 'verified' && <Badge tone="green">Verified</Badge>}<span className="capitalize">{service.provider.category}</span></div></div>{service.provider.rating !== undefined && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[12px] font-bold text-amber-700">★ {service.provider.rating}</span>}</div>
              <div className="mt-5 text-[18px] font-bold text-slate-900 group-hover:text-emerald-800">{service.title}</div>
              {service.description && <p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-slate-500">{service.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
                <span>{deliveryLabel[service.delivery_mode] ?? service.delivery_mode.replace('_', ' ')}</span>
                {(service.provider.district || service.provider.region) && <span className="inline-flex items-center gap-1"><MapPin size={13} />{[service.provider.district, service.provider.region].filter(Boolean).join(', ')}</span>}
                {service.provider.review_count ? <span>{service.provider.review_count} reviews</span> : null}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[14px] font-bold text-slate-900">{service.price_type === 'fixed' && service.price_amount ? `${Number(service.price_amount).toLocaleString()} TZS` : service.price_type === 'free' ? 'Free' : 'Ask for a quote'}</span><span className="inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700">View and request <ArrowRight size={15} /></span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
