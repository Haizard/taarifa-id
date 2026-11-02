'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { BadgeCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, LargeTitleHeader } from '@/components/ui/GlassCard';

type Request = { id: string; provider_name: string; provider_category: string; organization_type: string; username: string; region: string | null; legal_name: string; registration_reference: string; evidence_notes: string | null; created_at: string };

export default function ProviderVerificationPage() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({ queryKey: ['provider-verification-queue'], queryFn: () => api.get<Request[]>('/admin/providers/verification-requests') });
  const review = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'approved' | 'rejected' }) => api.patch(`/admin/providers/verification-requests/${id}`, { outcome, note: notes[id] ?? '' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['provider-verification-queue'] }); toast.success('Provider verification decision recorded'); },
    onError: (e: any) => toast.error(e.message),
  });
  return <div className="mx-auto max-w-4xl">
    <LargeTitleHeader title="Provider verification" subtitle="Review organization registration details. Approval enables job posting, candidate search, invitations, and applicant career-data access. Decisions are audit logged." />
    <div className="mb-4 rounded-xl bg-accent-warning/10 p-3 text-[12px] text-ink-secondary">This pilot stores registration references and notes, not uploaded documents. Verify evidence through the organization’s appropriate official channels before approval.</div>
    {isLoading ? <div className="glass p-6 text-center text-ink-secondary">Loading verification requests…</div> : !data?.length ? <div className="glass p-8 text-center"><BadgeCheck size={30} className="mx-auto mb-3 text-accent-primary" /><div className="font-semibold text-ink-primary">No pending requests</div><p className="mt-1 text-[14px] text-ink-secondary">Submitted provider records will appear here.</p></div> : <div className="space-y-4">{data.map((request) => <article key={request.id} className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[16px] font-semibold text-ink-primary">{request.provider_name}</div><div className="mt-1 text-[12px] text-ink-tertiary">@{request.username} · {request.organization_type} · {request.provider_category}{request.region ? ` · ${request.region}` : ''}</div></div><Badge tone="yellow">Pending review</Badge></div>
      <dl className="mt-4 grid gap-3 rounded-xl bg-white/55 p-4 text-[13px] sm:grid-cols-2"><div><dt className="text-[11px] font-semibold uppercase text-ink-tertiary">Registered name</dt><dd className="mt-1 text-ink-primary">{request.legal_name}</dd></div><div><dt className="text-[11px] font-semibold uppercase text-ink-tertiary">Registration/licence reference</dt><dd className="mt-1 break-all text-ink-primary">{request.registration_reference}</dd></div>{request.evidence_notes && <div className="sm:col-span-2"><dt className="text-[11px] font-semibold uppercase text-ink-tertiary">Evidence notes</dt><dd className="mt-1 whitespace-pre-wrap text-ink-secondary">{request.evidence_notes}</dd></div>}</dl>
      <label className="mt-3 block text-[12px] font-medium text-ink-secondary">Review note<textarea minLength={4} maxLength={2000} required value={notes[request.id] ?? ''} onChange={(e) => setNotes((all) => ({ ...all, [request.id]: e.target.value }))} placeholder="Record which evidence was checked and why you made this decision." className="mt-1 min-h-16 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[13px] text-ink-primary" /></label>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => review.mutate({ id: request.id, outcome: 'approved' })} disabled={review.isPending || (notes[request.id] ?? '').trim().length < 4} className="rounded-full bg-accent-success/15 px-4 py-2 text-[13px] font-semibold text-accent-success disabled:opacity-40">Approve provider</button><button onClick={() => review.mutate({ id: request.id, outcome: 'rejected' })} disabled={review.isPending || (notes[request.id] ?? '').trim().length < 4} className="rounded-full bg-accent-danger/10 px-4 py-2 text-[13px] font-semibold text-accent-danger disabled:opacity-40">Reject request</button></div>
    </article>)}</div>}
  </div>;
}
