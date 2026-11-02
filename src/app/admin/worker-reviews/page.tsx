'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { MessageSquareWarning } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, LargeTitleHeader } from '@/components/ui/GlassCard';

type Dispute = { id: string; rating: number; review: string | null; worker_response: string | null; worker_disputed_at: string; created_at: string; request_summary: string | null; service_title: string; provider_name: string; worker_name: string };

export default function WorkerReviewAppealsPage() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({ queryKey: ['admin-worker-review-disputes'], queryFn: () => api.get<Dispute[]>('/admin/marketplace/worker-review-disputes') });
  const resolve = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'upheld' | 'removed' }) => api.patch(`/admin/marketplace/worker-reviews/${id}/resolve`, { outcome, note: notes[id] ?? '' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-worker-review-disputes'] }); toast.success('Appeal resolved'); },
    onError: (e: any) => toast.error(e.message),
  });

  return <div className="mx-auto max-w-4xl">
    <LargeTitleHeader title="Worker review appeals" subtitle="Review employee disputes on verified client feedback. Decisions are recorded in the system audit log." />
    {isLoading ? <div className="glass p-6 text-center text-ink-secondary">Loading appeals…</div> : !data?.length ? <div className="glass p-8 text-center"><MessageSquareWarning className="mx-auto mb-3 text-accent-primary" size={30} /><div className="font-semibold text-ink-primary">No open appeals</div><p className="mt-1 text-[14px] text-ink-secondary">Employee disputes on client feedback will appear here.</p></div> : <div className="space-y-4">{data.map((item) => <article key={item.id} className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[16px] font-semibold text-ink-primary">{item.worker_name} · {item.provider_name}</div><div className="mt-1 text-[12px] text-ink-tertiary">{item.service_title}{item.request_summary ? ` · ${item.request_summary}` : ''}</div></div><Badge tone="yellow">Disputed · {'★'.repeat(item.rating)}</Badge></div>
      <div className="mt-3 rounded-xl bg-white/55 p-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Client feedback</div><p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-secondary">{item.review || 'No written comment.'}</p></div>
      {item.worker_response && <div className="mt-2 rounded-xl bg-accent-primary/5 p-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Employee response</div><p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-secondary">{item.worker_response}</p></div>}
      <label className="mt-3 block text-[12px] font-medium text-ink-secondary">Resolution note<textarea required minLength={4} maxLength={2000} value={notes[item.id] ?? ''} onChange={(e) => setNotes((all) => ({ ...all, [item.id]: e.target.value }))} placeholder="Record why the feedback is upheld or removed." className="mt-1 min-h-16 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[13px] text-ink-primary" /></label>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => resolve.mutate({ id: item.id, outcome: 'upheld' })} disabled={resolve.isPending || (notes[item.id] ?? '').trim().length < 4} className="rounded-full bg-accent-success/15 px-4 py-2 text-[13px] font-semibold text-accent-success disabled:opacity-40">Uphold feedback</button><button onClick={() => resolve.mutate({ id: item.id, outcome: 'removed' })} disabled={resolve.isPending || (notes[item.id] ?? '').trim().length < 4} className="rounded-full bg-accent-danger/10 px-4 py-2 text-[13px] font-semibold text-accent-danger disabled:opacity-40">Remove from rating</button></div>
    </article>)}</div>}
    <ProviderReviewAppeals />
  </div>;
}

type ProviderDispute = { id: string; rating: number; review: string | null; provider_response: string | null; disputed_at: string; created_at: string; request_summary: string | null; service_title: string; provider_name: string };

function ProviderReviewAppeals() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({ queryKey: ['admin-provider-review-disputes'], queryFn: () => api.get<ProviderDispute[]>('/admin/marketplace/provider-review-disputes') });
  const resolve = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'upheld' | 'removed' }) => api.patch(`/admin/marketplace/provider-reviews/${id}/resolve`, { outcome, note: notes[id] ?? '' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-provider-review-disputes'] }); toast.success('Appeal resolved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return <section className="mt-10"><LargeTitleHeader title="Organization review appeals" subtitle="Providers can dispute feedback about their organization. Review both sides before deciding." />
    {isLoading ? <div className="glass p-6 text-center text-ink-secondary">Loading organization appeals…</div> : !data?.length ? <div className="glass p-6 text-center text-[14px] text-ink-secondary">No open organization review appeals.</div> : <div className="space-y-4">{data.map((item) => <article key={item.id} className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold text-ink-primary">{item.provider_name}</div><div className="mt-1 text-[12px] text-ink-tertiary">{item.service_title}{item.request_summary ? ` · ${item.request_summary}` : ''}</div></div><Badge tone="yellow">Disputed · {'★'.repeat(item.rating)}</Badge></div>
      <div className="mt-3 rounded-xl bg-white/55 p-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Client feedback</div><p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-secondary">{item.review || 'No written comment.'}</p></div>
      {item.provider_response && <div className="mt-2 rounded-xl bg-accent-primary/5 p-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Provider response</div><p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-secondary">{item.provider_response}</p></div>}
      <label className="mt-3 block text-[12px] font-medium text-ink-secondary">Resolution note<textarea required minLength={4} maxLength={2000} value={notes[item.id] ?? ''} onChange={(e) => setNotes((all) => ({ ...all, [item.id]: e.target.value }))} className="mt-1 min-h-16 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[13px] text-ink-primary" /></label>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => resolve.mutate({ id: item.id, outcome: 'upheld' })} disabled={resolve.isPending || (notes[item.id] ?? '').trim().length < 4} className="rounded-full bg-accent-success/15 px-4 py-2 text-[13px] font-semibold text-accent-success disabled:opacity-40">Uphold feedback</button><button onClick={() => resolve.mutate({ id: item.id, outcome: 'removed' })} disabled={resolve.isPending || (notes[item.id] ?? '').trim().length < 4} className="rounded-full bg-accent-danger/10 px-4 py-2 text-[13px] font-semibold text-accent-danger disabled:opacity-40">Remove from rating</button></div>
    </article>)}</div>}
  </section>;
}
