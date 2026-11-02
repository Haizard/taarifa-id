'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, CalendarDays, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, LargeTitleHeader } from '@/components/ui/GlassCard';

type SharedCareer = {
  purpose: string;
  expires_at: string;
  profile: { display_name: string | null; headline: string | null; summary: string | null; skills: string[] } | null;
  history: Array<{ position: string; started_on: string; ended_on: string | null; organization_name: string }>;
};

export default function SharedCareerPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery({ queryKey: ['career-share', token], queryFn: () => api.get<SharedCareer>(`/career/share/${token}`), enabled: !!token, retry: false });
  return <main className="app-bg min-h-screen px-4 py-8 sm:py-14"><div className="mx-auto max-w-2xl">
    <LargeTitleHeader title="Shared career profile" subtitle="The worker shared this limited profile for a specific purpose." />
    {isLoading ? <div className="glass p-6 text-center text-ink-secondary">Loading shared profile…</div> : error || !data ? <div className="glass p-6 text-center text-ink-secondary">This career link is invalid, expired, or has been revoked.</div> : <>
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-accent-primary/5 p-3 text-[12px] text-ink-secondary"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent-primary" /><span>Shared for: <strong>{data.purpose}</strong> · expires {new Date(data.expires_at).toLocaleDateString()}</span></div>
      {data.profile && <section className="glass p-5"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary"><BriefcaseBusiness /></div><div><h1 className="text-[20px] font-bold text-ink-primary">{data.profile.display_name || 'Career profile'}</h1><div className="text-[14px] text-ink-secondary">{data.profile.headline}</div></div></div>{data.profile.summary && <p className="mt-4 whitespace-pre-wrap text-[14px] leading-6 text-ink-secondary">{data.profile.summary}</p>}{data.profile.skills.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{data.profile.skills.map((skill) => <Badge key={skill} tone="blue">{skill}</Badge>)}</div>}</section>}
      {data.history.length > 0 && <section className="mt-5"><div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-tertiary">Verified work history</div><div className="space-y-3">{data.history.map((record, index) => <article key={`${record.position}-${index}`} className="glass p-4"><div className="font-semibold text-ink-primary">{record.position}</div><div className="mt-1 text-[13px] text-ink-secondary">{record.organization_name}</div><div className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink-tertiary"><CalendarDays size={13} />{record.started_on}{record.ended_on ? ` – ${record.ended_on}` : ' – Present'}</div><div className="mt-2"><Badge tone="green">Verified</Badge></div></article>)}</div></section>}
      <p className="mt-6 text-center text-[11px] text-ink-tertiary">This link does not expose contact details, identity numbers, health records, or client service requests.</p>
    </>}
  </div></main>;
}
