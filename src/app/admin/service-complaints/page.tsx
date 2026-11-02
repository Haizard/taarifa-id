'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { MessageSquareWarning } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, GlassButton, LargeTitleHeader } from '@/components/ui/GlassCard';

type Case = { id: string; subject_type: string; subject_name: string; provider_name: string; service_title: string; request_summary: string | null; category: string; description: string; subject_response: string | null; status: string; created_at: string };

export default function ServiceComplaintsPage() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({ queryKey: ['admin-service-complaints'], queryFn: () => api.get<Case[]>('/admin/marketplace/complaints') });
  const resolve = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'resolved' | 'dismissed' }) => api.patch(`/admin/marketplace/complaints/${id}`, { outcome, note: notes[id] ?? '' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-complaints'] }); toast.success('Complaint case updated'); },
    onError: (error: any) => toast.error(error.message),
  });
  return <div className="mx-auto max-w-4xl">
    <LargeTitleHeader title="Service complaint cases" subtitle="Review service-specific complaints, responses, and resolutions. Ratings alone do not determine fault." />
    {isLoading ? <div className="glass p-6 text-center text-ink-secondary">Loading complaint cases…</div> : !data?.length ? <div className="glass p-8 text-center"><MessageSquareWarning size={30} className="mx-auto mb-3 text-accent-primary" /><div className="font-semibold text-ink-primary">No open complaints</div><p className="mt-1 text-[14px] text-ink-secondary">New complaints linked to accepted services will appear here.</p></div> : <div className="space-y-4">{data.map((item) => <article key={item.id} className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-semibold text-ink-primary">{item.service_title} · {item.provider_name}</div><div className="mt-1 text-[12px] text-ink-tertiary">About {item.subject_type}: {item.subject_name} · {item.category.replaceAll('_', ' ')} · {new Date(item.created_at).toLocaleString()}</div></div><Badge tone={item.status === 'in_review' ? 'blue' : 'yellow'}>{item.status.replaceAll('_', ' ')}</Badge></div>
      {item.request_summary && <div className="mt-2 text-[12px] text-ink-tertiary">Request: {item.request_summary}</div>}
      <p className="mt-3 whitespace-pre-wrap text-[13px] text-ink-secondary">{item.description}</p>
      {item.subject_response && <div className="mt-3 rounded-xl bg-accent-primary/5 p-3"><div className="text-[11px] font-semibold uppercase text-ink-tertiary">Provider/worker response</div><p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-secondary">{item.subject_response}</p></div>}
      <label className="mt-3 block text-[12px] font-medium text-ink-secondary">Resolution record<textarea required minLength={4} maxLength={2000} value={notes[item.id] ?? ''} onChange={(event) => setNotes((all) => ({ ...all, [item.id]: event.target.value }))} className="mt-1 min-h-16 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[13px] text-ink-primary" /></label>
      <div className="mt-3 flex gap-2"><GlassButton disabled={resolve.isPending || (notes[item.id] ?? '').trim().length < 4} onClick={() => resolve.mutate({ id: item.id, outcome: 'resolved' })}>Resolve case</GlassButton><button onClick={() => resolve.mutate({ id: item.id, outcome: 'dismissed' })} disabled={resolve.isPending || (notes[item.id] ?? '').trim().length < 4} className="rounded-full bg-white/65 px-4 py-2 text-[13px] font-semibold text-ink-secondary disabled:opacity-50">Dismiss</button></div>
    </article>)}</div>}
  </div>;
}
