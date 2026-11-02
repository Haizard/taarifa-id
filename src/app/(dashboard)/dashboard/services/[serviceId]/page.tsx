'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ArrowLeft, MapPin, ShieldCheck, Siren, Store } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { GlassButton, LargeTitleHeader, SectionLabel, Badge } from '@/components/ui/GlassCard';

type Field = { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'; required?: boolean; options?: string[] };
type Service = {
  id: string; title: string; description: string | null; delivery_mode: string; price_type: string;
  price_amount: string | null; form_fields: Field[];
  provider: { id: string; category: 'hospital' | 'school' | 'garage'; display_name: string; description: string | null; region: string | null; district: string | null; ward: string | null; contact_number: string | null };
};

export default function ServiceRequestPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const router = useRouter();
  const [sharing, setSharing] = useState<'selected_provider' | 'matching_providers'>('selected_provider');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [location, setLocation] = useState({ region: '', district: '', ward: '' });
  const { data: service, isLoading } = useQuery({ queryKey: ['marketplace-service', serviceId], queryFn: () => api.get<Service>(`/marketplace/services/${serviceId}`) });
  const mutation = useMutation({
    mutationFn: () => {
      const { _summary, ...formAnswers } = answers;
      return api.post('/marketplace/requests', { service_id: serviceId, sharing_scope: sharing, summary: _summary, answers: formAnswers, ...location });
    },
    onSuccess: () => { toast.success('Request sent'); router.push('/dashboard/requests'); },
    onError: (e: any) => toast.error(e.message),
  });

  const setAnswer = (key: string, value: unknown) => setAnswers((previous) => ({ ...previous, [key]: value }));

  if (isLoading) return <div className="glass p-6 text-center text-ink-secondary">Loading service…</div>;
  if (!service) return <div className="glass p-6 text-center text-ink-secondary">Service not found. <Link href="/dashboard/services" className="text-accent-primary">Back to services</Link></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/services" className="mb-4 inline-flex items-center gap-2 text-[14px] font-medium text-accent-primary"><ArrowLeft size={16} /> All services</Link>
      <LargeTitleHeader title={service.title} subtitle={service.provider.display_name} />
      <div className="glass mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[14px] text-ink-secondary"><Store size={18} className="text-accent-primary" />{service.provider.display_name}</div>
          <Badge tone={service.provider.category === 'hospital' ? 'red' : service.provider.category === 'school' ? 'yellow' : 'green'}>{service.provider.category}</Badge>
        </div>
        {service.description && <p className="mt-3 text-[14px] leading-6 text-ink-secondary">{service.description}</p>}
        <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-ink-tertiary">
          <span>{service.delivery_mode.replaceAll('_', ' ')}</span>
          <span>{service.price_type === 'fixed' && service.price_amount ? `${Number(service.price_amount).toLocaleString()} TZS` : service.price_type === 'free' ? 'Free' : 'Provider will quote'}</span>
          {[service.provider.district, service.provider.region].filter(Boolean).length > 0 && <span className="inline-flex items-center gap-1"><MapPin size={13} />{[service.provider.district, service.provider.region].filter(Boolean).join(', ')}</span>}
        </div>
      </div>

      <SectionLabel tone="blue">Where should providers send an offer?</SectionLabel>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setSharing('selected_provider')} className={`glass rounded-2xl p-4 text-left ${sharing === 'selected_provider' ? 'ring-2 ring-accent-primary' : ''}`}>
          <div className="font-semibold text-ink-primary">This provider only</div>
          <p className="mt-1 text-[13px] text-ink-secondary">Only {service.provider.display_name} receives your request. If you accept their offer, their assigned employees may see these request details to provide the service.</p>
        </button>
        <button type="button" onClick={() => setSharing('matching_providers')} className={`glass rounded-2xl p-4 text-left ${sharing === 'matching_providers' ? 'ring-2 ring-accent-primary' : ''}`}>
          <div className="font-semibold text-ink-primary">Nearby matching providers</div>
          <p className="mt-1 text-[13px] text-ink-secondary">Other {service.provider.category} providers in your area can offer to help. After you accept an offer, that provider's assigned employees may see these request details to provide the service.</p>
        </button>
      </div>

      <SectionLabel tone="lavender">Request details</SectionLabel>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="glass space-y-4 p-5">
        {(service.form_fields ?? []).map((field) => (
          <label key={field.key} className="block text-[13px] font-medium text-ink-secondary">
            {field.label}{field.required && <span className="ml-1 text-accent-danger">*</span>}
            {field.type === 'textarea' ? (
              <textarea required={field.required} maxLength={5000} value={String(answers[field.key] ?? '')} onChange={(e) => setAnswer(field.key, e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-2 text-[15px] text-ink-primary outline-none focus:ring-2 focus:ring-accent-primary" />
            ) : field.type === 'select' ? (
              <select required={field.required} value={String(answers[field.key] ?? '')} onChange={(e) => setAnswer(field.key, e.target.value)} className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[15px] text-ink-primary outline-none focus:ring-2 focus:ring-accent-primary">
                <option value="">Choose…</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : field.type === 'checkbox' ? (
              <span className="mt-2 flex items-center gap-2 text-[14px] text-ink-primary"><input type="checkbox" checked={answers[field.key] === true} onChange={(e) => setAnswer(field.key, e.target.checked)} /> Yes</span>
            ) : (
              <input required={field.required} type={field.type} maxLength={field.type === 'text' ? 5000 : undefined} value={String(answers[field.key] ?? '')} onChange={(e) => setAnswer(field.key, field.type === 'number' ? e.target.value : e.target.value)} className="mt-1 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-3 text-[15px] text-ink-primary outline-none focus:ring-2 focus:ring-accent-primary" />
            )}
          </label>
        ))}
        {service.form_fields?.length === 0 && <p className="text-[14px] text-ink-secondary">This provider has not added extra questions. Add a short description below to help them respond.</p>}
        <label className="block text-[13px] font-medium text-ink-secondary">Short summary
          <textarea maxLength={240} value={String(answers._summary ?? '')} onChange={(e) => setAnswer('_summary', e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-2 text-[15px] text-ink-primary outline-none focus:ring-2 focus:ring-accent-primary" placeholder="What help do you need?" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(['region', 'district', 'ward'] as const).map((key) => <label key={key} className="text-[13px] font-medium capitalize text-ink-secondary">{key}{sharing === 'matching_providers' && key === 'region' && <span className="text-accent-danger"> *</span>}<input required={sharing === 'matching_providers' && key === 'region'} value={location[key]} onChange={(e) => setLocation((l) => ({ ...l, [key]: e.target.value }))} className="mt-1 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-2 text-[14px] text-ink-primary outline-none focus:ring-2 focus:ring-accent-primary" /></label>)}
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-accent-primary/5 p-3 text-[12px] leading-5 text-ink-secondary">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent-primary" />
          <span>{sharing === 'matching_providers' ? 'You are sharing only the answers and location entered here with matching providers in your region. After accepting an offer, that provider may assign employees who can see these request details. Your saved profile and health records are not attached.' : 'Only this provider receives the answers and location entered here. If you accept an offer, their assigned employees may see these request details. Your saved profile and health records are not attached.'}</span>
        </div>
        <GlassButton type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Sending…' : sharing === 'matching_providers' ? 'Share request with nearby providers' : 'Send private request'}</GlassButton>
      </form>
    </div>
  );
}
