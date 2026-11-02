'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ClipboardCheck, MapPin, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, LargeTitleHeader } from '@/components/ui/GlassCard';
import { ComplaintEvidenceControls } from '@/components/marketplace/ComplaintEvidenceControls';

type Assignment = {
  id: string;
  status: string;
  summary: string | null;
  answers: Record<string, unknown>;
  form_snapshot: Array<{ key: string; label: string }>;
  region: string | null;
  district: string | null;
  ward: string | null;
  assigned_at: string;
  service: { title: string };
  provider: { display_name: string; category: string };
  review: { id: string; moderation_status: string; rating: number; review: string | null; worker_response: string | null; worker_disputed_at: string | null } | null;
};
type Complaint = { id: string; subject_account_id: string; subject_type: string; service_title: string; category: string; description: string; subject_response: string | null; status: string; evidence: Array<{ id: string; file_name: string; size_bytes: number }> };

export default function MyWorkPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [responses, setResponses] = useState<Record<string, { response: string; dispute: boolean }>>({});
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['marketplace-worker-assignments', user?.sub],
    queryFn: () => api.get<Assignment[]>('/marketplace/worker/assignments'),
    enabled: !!user && ['user', 'individual'].includes(user.role),
  });
  const complaintsQuery = useQuery({ queryKey: ['marketplace-complaints', user?.sub], queryFn: () => api.get<Complaint[]>('/marketplace/complaints'), enabled: !!user && ['user', 'individual'].includes(user.role) });
  const [complaintDrafts, setComplaintDrafts] = useState<Record<string, string>>({});
  const respond = useMutation({
    mutationFn: ({ id, response, dispute }: { id: string; response: string; dispute: boolean }) => api.post(`/marketplace/worker/reviews/${id}/response`, { response, dispute }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace-worker-assignments'] }); toast.success('Your response was shared with the client and organization'); },
    onError: (e: any) => toast.error(e.message),
  });
  const respondToComplaint = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) => api.post(`/marketplace/complaints/${id}/response`, { response }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace-complaints'] }); toast.success('Your response was sent to the client'); },
    onError: (e: any) => toast.error(e.message),
  });

  return <div className="mx-auto max-w-4xl">
    <LargeTitleHeader title="My assigned work" subtitle="See the service jobs your organization has assigned to you." />
    <div className="mb-5 flex items-start gap-2 rounded-xl bg-accent-primary/5 p-3 text-[13px] text-ink-secondary"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent-primary" />Only requests assigned to your employee account appear here. Client identity and profile records are not shown.</div>
    {isLoading ? <div className="glass p-6 text-center text-ink-secondary">Loading assignments…</div> : !assignments?.length ? <div className="glass p-8 text-center"><ClipboardCheck className="mx-auto mb-3 text-accent-primary" size={30} /><div className="font-semibold text-ink-primary">No assigned work yet</div><p className="mt-1 text-[14px] text-ink-secondary">Your organization will add service jobs here when they assign them to you.</p></div> : <div className="space-y-4">{assignments.map((assignment) => <article key={assignment.id} className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[17px] font-semibold text-ink-primary">{assignment.summary || assignment.service.title}</div><div className="mt-1 text-[13px] text-ink-secondary">{assignment.service.title} · {assignment.provider.display_name}</div></div><Badge tone={assignment.status === 'completed' ? 'green' : assignment.status === 'in_progress' ? 'blue' : 'orange'}>{assignment.status.replace('_', ' ')}</Badge></div>
      {[assignment.ward, assignment.district, assignment.region].filter(Boolean).length > 0 && <div className="mt-3 inline-flex items-center gap-1 text-[12px] text-ink-tertiary"><MapPin size={13} />{[assignment.ward, assignment.district, assignment.region].filter(Boolean).join(', ')}</div>}
      <div className="mt-3 rounded-xl bg-white/45 p-3">{assignment.form_snapshot.map((field) => { const value = assignment.answers?.[field.key]; if (value === undefined || value === null || value === '') return null; return <div key={field.key} className="flex gap-2 border-b border-separator py-2 last:border-0"><div className="w-1/3 shrink-0 text-[12px] text-ink-tertiary">{field.label}</div><div className="whitespace-pre-wrap text-[13px] text-ink-primary">{String(value)}</div></div>; })}</div>
      {assignment.review && <section className="mt-4 rounded-xl border border-glass-border bg-white/50 p-4">{assignment.review.moderation_status === 'removed' ? <p className="text-[13px] text-ink-tertiary">Feedback was removed after platform review.</p> : <><div className="font-semibold text-ink-primary">Private client feedback · {'★'.repeat(assignment.review.rating)}{'☆'.repeat(5 - assignment.review.rating)}</div>{assignment.review.review && <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-secondary">{assignment.review.review}</p>}{assignment.review.worker_response && <p className="mt-2 text-[12px] text-ink-tertiary">Your response: {assignment.review.worker_response}</p>}<form onSubmit={(e) => { e.preventDefault(); const draft = responses[assignment.review!.id] ?? { response: assignment.review!.worker_response ?? '', dispute: !!assignment.review!.worker_disputed_at }; respond.mutate({ id: assignment.review!.id, ...draft }); }} className="mt-3 space-y-2"><label className="block text-[12px] font-medium text-ink-secondary">Your response<textarea required maxLength={2000} value={responses[assignment.review.id]?.response ?? assignment.review.worker_response ?? ''} onChange={(e) => setResponses((all) => ({ ...all, [assignment.review!.id]: { ...(all[assignment.review!.id] ?? { response: assignment.review!.worker_response ?? '', dispute: !!assignment.review!.worker_disputed_at }), response: e.target.value } }))} className="mt-1 min-h-16 w-full rounded-lg border border-glass-border bg-white/70 px-3 py-2 text-[13px] text-ink-primary" /></label><label className="flex items-center gap-2 text-[12px] text-ink-secondary"><input type="checkbox" checked={responses[assignment.review.id]?.dispute ?? !!assignment.review.worker_disputed_at} onChange={(e) => setResponses((all) => ({ ...all, [assignment.review!.id]: { ...(all[assignment.review!.id] ?? { response: assignment.review!.worker_response ?? '', dispute: !!assignment.review!.worker_disputed_at }), dispute: e.target.checked } }))} />Request a review of this feedback if it is inaccurate or abusive</label><button type="submit" disabled={respond.isPending} className="rounded-full bg-accent-primary px-4 py-2 text-[13px] font-semibold text-white">{respond.isPending ? 'Saving…' : assignment.review.worker_response ? 'Update response' : 'Respond to feedback'}</button></form></>}</section>}
      <div className="mt-3 text-[11px] text-ink-tertiary">Assigned {new Date(assignment.assigned_at).toLocaleString()}</div>
    </article>)}</div>}
    {(complaintsQuery.data ?? []).some((item) => item.subject_account_id === user?.sub && item.subject_type === 'worker' && ['open', 'in_review'].includes(item.status)) && <section className="mt-8 space-y-3"><h2 className="font-semibold text-ink-primary">Complaint cases about your work</h2>{(complaintsQuery.data ?? []).filter((item) => item.subject_account_id === user?.sub && item.subject_type === 'worker' && ['open', 'in_review'].includes(item.status)).map((item) => <article key={item.id} className="glass p-4"><div className="font-semibold text-ink-primary">{item.service_title} · {item.category.replaceAll('_', ' ')}</div><p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-secondary">{item.description}</p><ComplaintEvidenceControls caseId={item.id} status={item.status} evidence={item.evidence ?? []} /><form onSubmit={(event) => { event.preventDefault(); respondToComplaint.mutate({ id: item.id, response: complaintDrafts[item.id] ?? item.subject_response ?? '' }); }} className="mt-3 space-y-2"><textarea required minLength={5} maxLength={3000} value={complaintDrafts[item.id] ?? item.subject_response ?? ''} onChange={(event) => setComplaintDrafts((all) => ({ ...all, [item.id]: event.target.value }))} placeholder="Share your response to the complaint." className="min-h-16 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[13px] text-ink-primary" /><button disabled={respondToComplaint.isPending} className="rounded-full bg-accent-primary/10 px-4 py-2 text-[12px] font-semibold text-accent-primary">Send response</button></form></article>)}</section>}
  </div>;
}
