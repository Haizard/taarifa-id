'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ClipboardList, ShieldCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, GlassButton, LargeTitleHeader, SectionLabel } from '@/components/ui/GlassCard';

type Member = { id: string; display_name: string; member_type: string };
type Provider = { members: Member[] };
type CareerRecord = { id: string; worker_name: string; worker_username: string; position: string; started_on: string; ended_on: string | null; verification_status: string; worker_note: string | null; moderation_note: string | null };

const tone = (status: string) => status === 'verified' ? 'green' : status === 'disputed' ? 'orange' : status === 'rejected' ? 'grey' : 'blue';

export default function ProviderWorkforcePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { data: provider } = useQuery({ queryKey: ['marketplace-provider', user?.sub], queryFn: () => api.get<Provider | null>('/marketplace/provider'), enabled: !!user && user.role === 'admin' });
  const { data: records, isLoading } = useQuery({ queryKey: ['career-employer-records', user?.sub], queryFn: () => api.get<CareerRecord[]>('/career/employer/records'), enabled: !!user && user.role === 'admin' });
  const [workerId, setWorkerId] = useState('');
  const [position, setPosition] = useState('');
  const [startedOn, setStartedOn] = useState('');
  const [endedOn, setEndedOn] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  useEffect(() => { if (!workerId && provider?.members?.length) setWorkerId(provider.members[0].id); }, [provider, workerId]);

  const create = useMutation({
    mutationFn: () => api.post('/career/employer/records', { worker_account_id: workerId, position, started_on: startedOn, ended_on: endedOn || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career-employer-records'] }); toast.success('Employment record sent to the employee for confirmation'); setPosition(''); setStartedOn(''); setEndedOn(''); },
    onError: (e: any) => toast.error(e.message),
  });
  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'confirm' | 'reject' }) => api.post(`/career/employer/records/${id}/resolve`, { action, note: resolutionNotes[id] ?? '' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career-employer-records'] }); toast.success('Employment record updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  if (user?.role !== 'admin' || !['business', 'school', 'institution'].includes(user.account_type)) return <div className="glass p-6 text-center text-ink-secondary">Work history tools are available to organization admins.</div>;

  return <div className="mx-auto max-w-4xl">
    <LargeTitleHeader title="Work history" subtitle="Submit employment records for your employees to review and verify." right={<Link href="/dashboard/sub-accounts" className="glass rounded-full px-3 py-2 text-[13px] font-semibold text-accent-primary">Manage members</Link>} />
    <div className="mb-5 flex items-start gap-2 rounded-xl bg-accent-primary/5 p-3 text-[13px] text-ink-secondary"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent-primary" />Employees must confirm a record before it is marked verified. Confirmed records remain with the employee after they leave.</div>

    <SectionLabel tone="lavender">Add employment record</SectionLabel>
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="glass grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
      <label className="text-[13px] font-medium text-ink-secondary sm:col-span-2">Employee<select required value={workerId} onChange={(e) => setWorkerId(e.target.value)} className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[14px] text-ink-primary"><option value="">Choose employee…</option>{(provider?.members ?? []).map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label>
      <label className="text-[13px] font-medium text-ink-secondary sm:col-span-2">Position or role<input required maxLength={150} value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Technician" className="mt-1 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-3 text-[14px] text-ink-primary" /></label>
      <label className="text-[13px] font-medium text-ink-secondary">Start date<input required type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} className="mt-1 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-3 text-[14px] text-ink-primary" /></label>
      <label className="text-[13px] font-medium text-ink-secondary">End date (optional)<input type="date" value={endedOn} onChange={(e) => setEndedOn(e.target.value)} className="mt-1 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-3 text-[14px] text-ink-primary" /></label>
      <div className="sm:col-span-2"><GlassButton type="submit" disabled={create.isPending || !workerId || !position.trim() || !startedOn}>{create.isPending ? 'Submitting…' : 'Send to employee to confirm'}</GlassButton></div>
    </form>

    <SectionLabel tone="green">Records from this organization</SectionLabel>
    {isLoading ? <div className="glass p-5 text-center text-ink-secondary">Loading records…</div> : !records?.length ? <div className="glass p-6 text-center"><UserRound size={28} className="mx-auto mb-2 text-accent-primary" /><p className="text-[14px] text-ink-secondary">No work history records yet.</p></div> : <div className="space-y-3">{records.map((record) => <article key={record.id} className="glass p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold text-ink-primary">{record.worker_name} <span className="font-normal text-ink-tertiary">@{record.worker_username}</span></div><div className="mt-1 text-[13px] text-ink-secondary">{record.position} · {record.started_on}{record.ended_on ? ` – ${record.ended_on}` : ' – Present'}</div></div><Badge tone={tone(record.verification_status)}>{record.verification_status}</Badge></div>
      {record.worker_note && <p className="mt-2 rounded-lg bg-accent-warning/10 p-2 text-[12px] text-ink-secondary">Employee note: {record.worker_note}</p>}
      {record.verification_status === 'disputed' && <div className="mt-3 space-y-2"><textarea maxLength={2000} value={resolutionNotes[record.id] ?? ''} onChange={(e) => setResolutionNotes((all) => ({ ...all, [record.id]: e.target.value }))} placeholder="Explain how you reviewed the requested correction." className="min-h-16 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[13px] text-ink-primary" /><div className="flex flex-wrap gap-2"><button onClick={() => resolve.mutate({ id: record.id, action: 'confirm' })} disabled={resolve.isPending || !(resolutionNotes[record.id] ?? '').trim()} className="rounded-full bg-accent-success/15 px-4 py-2 text-[13px] font-semibold text-accent-success disabled:opacity-40">Send back for employee confirmation</button><button onClick={() => resolve.mutate({ id: record.id, action: 'reject' })} disabled={resolve.isPending || !(resolutionNotes[record.id] ?? '').trim()} className="rounded-full bg-accent-danger/10 px-4 py-2 text-[13px] font-semibold text-accent-danger disabled:opacity-40">Reject record</button></div></div>}
      {record.moderation_note && <p className="mt-2 text-[12px] text-ink-tertiary">Organization decision: {record.moderation_note}</p>}
    </article>)}</div>}
    <div className="mt-5 flex items-start gap-2 text-[12px] text-ink-tertiary"><ClipboardList size={15} className="mt-0.5 shrink-0" />Service request details and client identities are never included in portable employment history.</div>
  </div>;
}
