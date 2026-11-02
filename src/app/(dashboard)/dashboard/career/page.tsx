'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BriefcaseBusiness, Download, Link2, ShieldCheck, Unlink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, GlassButton, LargeTitleHeader, SectionLabel } from '@/components/ui/GlassCard';

type WorkRecord = { id: string; organization_name: string; position: string; started_on: string; ended_on: string | null; verification_status: string; worker_note: string | null; moderation_note: string | null };
type Share = { id: string; token: string; purpose: string; expires_at: string; revoked_at: string | null; history_record_ids: string[] };
type CareerData = { profile: { headline: string | null; summary: string | null; skills: string[] }; history: WorkRecord[]; shares: Share[] };

const statusTone = (status: string) => status === 'verified' ? 'green' : status === 'disputed' ? 'orange' : status === 'rejected' ? 'grey' : 'blue';

export default function CareerPage() {
  const { user, clear } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['career-me', user?.sub], queryFn: () => api.get<CareerData>('/career/me'), enabled: !!user });
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('Job application');
  const [shareDays, setShareDays] = useState('14');
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data?.profile) return;
    setHeadline(data.profile.headline ?? '');
    setSummary(data.profile.summary ?? '');
    setSkillsText((data.profile.skills ?? []).join(', '));
  }, [data?.profile]);

  const verifiedRecords = useMemo(() => data?.history.filter((item) => item.verification_status === 'verified') ?? [], [data?.history]);
  const save = useMutation({
    mutationFn: () => api.put('/career/me', { headline, summary, skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career-me'] }); toast.success('Career profile saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  const answerRecord = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'acknowledge' | 'dispute' }) => api.post(`/career/records/${id}/respond`, { action, note: responseNotes[id] ?? '' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career-me'] }); toast.success('Employment record updated'); },
    onError: (e: any) => toast.error(e.message),
  });
  const makeShare = useMutation({
    mutationFn: () => api.post<{ token: string }>('/career/share', { include_profile: true, history_record_ids: selectedRecords, purpose, duration_days: Number(shareDays) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career-me'] }); setSelectedRecords([]); toast.success('Temporary career link created'); },
    onError: (e: any) => toast.error(e.message),
  });
  const revokeShare = useMutation({
    mutationFn: (id: string) => api.delete(`/career/share/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career-me'] }); toast.success('Share link revoked'); },
    onError: (e: any) => toast.error(e.message),
  });
  const leave = useMutation({
    mutationFn: () => api.post('/career/leave-organization', {}),
    onSuccess: () => { clear(); router.replace('/login'); toast.success('Your account is now independent. Sign in again to continue.'); },
    onError: (e: any) => toast.error(e.message),
  });
  const downloadCareerData = () => {
    if (!data) return;
    const payload = { exported_at: new Date().toISOString(), profile: data.profile, employment_history: data.history };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'taarifa-career-data.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="mx-auto max-w-4xl">
    <LargeTitleHeader title="Career profile" subtitle="Keep your professional profile and verified work history with you. Nothing is visible to employers until you share a temporary link." />
    <div className="mb-6 flex items-start gap-2 rounded-xl bg-accent-primary/5 p-3 text-[13px] text-ink-secondary"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent-primary" />Your career details are private by default. Shared links include only this profile and the verified work records you select, and expire automatically.</div>
    <div className="mb-6"><GlassButton type="button" disabled={!data || isLoading} onClick={downloadCareerData}><span className="flex items-center gap-2"><Download size={16} />Download career data</span></GlassButton><p className="mt-1 text-[11px] text-ink-tertiary">Downloads your profile and employment history as JSON. Active share links and tokens are not included.</p></div>

    <SectionLabel tone="lavender">Your profile</SectionLabel>
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="glass space-y-3 p-5">
      <label className="block text-[13px] font-medium text-ink-secondary">Professional headline<input maxLength={200} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Automotive technician · 5 years' experience" className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[15px] text-ink-primary" /></label>
      <label className="block text-[13px] font-medium text-ink-secondary">Short professional summary<textarea maxLength={3000} value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[14px] text-ink-primary" /></label>
      <label className="block text-[13px] font-medium text-ink-secondary">Skills, separated by commas<input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="Vehicle diagnostics, customer service, towing" className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[14px] text-ink-primary" /></label>
      <GlassButton type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save career profile'}</GlassButton>
    </form>

    <SectionLabel tone="green">Employment history</SectionLabel>
    {isLoading ? <div className="glass p-5 text-center text-ink-secondary">Loading work history…</div> : !data?.history.length ? <div className="glass p-5 text-[14px] text-ink-secondary">Organizations can submit work records for you to verify. Your existing employment details do not become verified automatically.</div> : <div className="space-y-3">{data.history.map((record) => <article key={record.id} className="glass p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-semibold text-ink-primary">{record.position}</div><div className="text-[13px] text-ink-secondary">{record.organization_name} · {record.started_on}{record.ended_on ? ` – ${record.ended_on}` : ' – Present'}</div></div><Badge tone={statusTone(record.verification_status)}>{record.verification_status}</Badge></div>
      {record.verification_status === 'pending' && <div className="mt-3 space-y-2"><textarea maxLength={2000} value={responseNotes[record.id] ?? ''} onChange={(e) => setResponseNotes((all) => ({ ...all, [record.id]: e.target.value }))} placeholder="If disputing, describe the correction you need." className="min-h-16 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[13px] text-ink-primary" /><div className="flex flex-wrap gap-2"><button onClick={() => answerRecord.mutate({ id: record.id, action: 'acknowledge' })} disabled={answerRecord.isPending} className="rounded-full bg-accent-success/15 px-4 py-2 text-[13px] font-semibold text-accent-success">Confirm this record</button><button onClick={() => answerRecord.mutate({ id: record.id, action: 'dispute' })} disabled={answerRecord.isPending || !(responseNotes[record.id] ?? '').trim()} className="rounded-full bg-accent-warning/15 px-4 py-2 text-[13px] font-semibold text-accent-warning disabled:opacity-40">Dispute record</button></div></div>}
      {record.worker_note && <p className="mt-2 text-[12px] text-ink-tertiary">Your note: {record.worker_note}</p>}
      {record.moderation_note && <p className="mt-2 text-[12px] text-ink-tertiary">Organization response: {record.moderation_note}</p>}
    </article>)}</div>}

    <SectionLabel tone="blue">Share a temporary career link</SectionLabel>
    <div className="glass space-y-3 p-5">
      {verifiedRecords.length ? <div className="space-y-2"><div className="text-[13px] font-semibold text-ink-primary">Choose verified work records</div>{verifiedRecords.map((record) => <label key={record.id} className="flex items-center gap-2 rounded-xl bg-white/50 p-3 text-[13px] text-ink-secondary"><input type="checkbox" checked={selectedRecords.includes(record.id)} onChange={(e) => setSelectedRecords((all) => e.target.checked ? [...all, record.id] : all.filter((id) => id !== record.id))} />{record.position} · {record.organization_name}</label>)}</div> : <div className="text-[13px] text-ink-secondary">No verified employment records yet. You can still share your career profile.</div>}
      <label className="block text-[13px] font-medium text-ink-secondary">Purpose<input required maxLength={240} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Job application to ABC Garage" className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[14px] text-ink-primary" /></label>
      <label className="block text-[13px] font-medium text-ink-secondary">Link duration<select value={shareDays} onChange={(e) => setShareDays(e.target.value)} className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[14px] text-ink-primary"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
      <GlassButton type="button" disabled={makeShare.isPending || !purpose.trim()} onClick={() => makeShare.mutate()}><span className="flex items-center gap-2"><Link2 size={16} />{makeShare.isPending ? 'Creating…' : 'Create private link'}</span></GlassButton>
      {(data?.shares ?? []).filter((share) => !share.revoked_at && new Date(share.expires_at) > new Date()).map((share) => <div key={share.id} className="rounded-xl border border-glass-border bg-white/50 p-3"><div className="font-medium text-ink-primary">{share.purpose}</div><a className="mt-1 block break-all text-[12px] text-accent-primary" href={`/career/share/${share.token}`} target="_blank" rel="noreferrer">{typeof window !== 'undefined' ? `${window.location.origin}/career/share/${share.token}` : `/career/share/${share.token}`}</a><div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-ink-tertiary"><span>Expires {new Date(share.expires_at).toLocaleString()}</span><button onClick={() => revokeShare.mutate(share.id)} disabled={revokeShare.isPending} className="font-semibold text-accent-danger">Revoke</button></div></div>)}
    </div>

    {user?.role === 'user' && <section className="mt-8 rounded-2xl border border-accent-warning/30 bg-accent-warning/5 p-5"><div className="flex items-start gap-3"><Unlink size={18} className="mt-1 shrink-0 text-accent-warning" /><div><div className="font-semibold text-ink-primary">Leave your organization</div><p className="mt-1 text-[13px] text-ink-secondary">Your account becomes an independent individual account. The organization loses member-management access; your career profile and verified work history stay with you. Finish or have active service assignments reassigned first.</p><button onClick={() => leave.mutate()} disabled={leave.isPending} className="mt-3 rounded-full bg-accent-warning/15 px-4 py-2 text-[13px] font-semibold text-accent-warning disabled:opacity-50">{leave.isPending ? 'Updating account…' : 'Make my account independent'}</button></div></div></section>}
    {isLoading && <div className="sr-only"><BriefcaseBusiness /></div>}
  </div>;
}
