'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, GraduationCap, MapPin, Search, Siren, Store } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, LargeTitleHeader, SectionLabel, type AccentTone } from '@/components/ui/GlassCard';

type Category = 'hospital' | 'school' | 'garage';
type Service = {
  id: string; title: string; description: string | null; delivery_mode: string;
  price_type: string; price_amount: string | null;
  provider: { id: string; category: Category; display_name: string; verification_status: string; region: string | null; district: string | null; rating?: number; review_count?: number };
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
      <LargeTitleHeader title="Find a service" subtitle="Choose a provider and send a private request." />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/dashboard/requests" className="glass rounded-full px-4 py-2 text-[13px] font-medium text-accent-primary">My requests and offers →</Link>
        {user?.role === 'admin' && <Link href="/dashboard/provider" className="glass rounded-full px-4 py-2 text-[13px] font-medium text-accent-primary">Provider tools →</Link>}
      </div>

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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {services.map((service) => (
            <Link key={service.id} href={`/dashboard/services/${service.id}`} className="glass btn-scale block p-5 transition-shadow hover:shadow-glass">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[17px] font-semibold text-ink-primary">{service.title}</div>
                  <div className="mt-1 text-[14px] font-medium text-accent-primary">{service.provider.display_name}</div>
                  <div className="mt-1"><Badge tone={service.provider.verification_status === 'verified' ? 'green' : 'grey'}>{service.provider.verification_status === 'verified' ? 'Verified organization' : 'Not verified by platform'}</Badge></div>
                </div>
                <Badge tone={service.provider.category === 'hospital' ? 'red' : service.provider.category === 'school' ? 'yellow' : 'green'}>{service.provider.category}</Badge>
              </div>
              {service.description && <p className="mt-3 line-clamp-2 text-[14px] text-ink-secondary">{service.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-ink-tertiary">
                <span>{deliveryLabel[service.delivery_mode] ?? service.delivery_mode.replace('_', ' ')}</span>
                <span>·</span>
                <span>{service.price_type === 'fixed' && service.price_amount ? `${Number(service.price_amount).toLocaleString()} TZS` : service.price_type === 'free' ? 'Free' : 'Ask for a quote'}</span>
                {service.provider.rating !== undefined && <span>★ {service.provider.rating} ({service.provider.review_count} reviews)</span>}
                {(service.provider.district || service.provider.region) && <><span>·</span><span className="inline-flex items-center gap-1"><MapPin size={13} />{[service.provider.district, service.provider.region].filter(Boolean).join(', ')}</span></>}
              </div>
              <div className="mt-4 flex items-center justify-end gap-1 text-[13px] font-semibold text-accent-primary">View and request <ArrowRight size={15} /></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
