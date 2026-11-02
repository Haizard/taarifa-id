'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ClipboardList, MapPin, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, GlassButton, LargeTitleHeader, SectionLabel } from '@/components/ui/GlassCard';

type Provider = { id: string; services: Array<{ id: string; title: string; is_active: boolean }>; members: Array<{ id: string; display_name: string; member_type: string }> };
type ServiceRequest = {
  id: string; summary: string | null; sharing_scope: string; status: string; answers: Record<string, unknown>;
  form_snapshot: Array<{ key: string; label: string }>;
  region: string | null; district: string | null; ward: string | null;
  assignments: Array<{ id: string; worker_account_id: string; display_name: string; status: string }>;
  service: { title: string; provider: { display_name: string; category: string } };
  offers: Array<{ id: string; status: string; price_amount: string | null; message: string | null }>;
  review: { id: string; rating?: number; review?: string | null; provider_response?: string | null; moderation_status: string } | null;
};
type Complaint = { id: string; subject_account_id: string; subject_type: string; request_summary: string | null; service_title: string; category: string; description: string; subject_response: string | null; status: string; created_at: string };

export default function ProviderRequestsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { data: provider } = useQuery({ queryKey: ['marketplace-provider', user?.sub], queryFn: () => api.get<Provider | null>('/marketplace/provider'), enabled: !!user && user.role === 'admin' });
  const { data: requests, isLoading } = useQuery({ queryKey: ['marketplace-provider-requests', user?.sub], queryFn: () => api.get<ServiceRequest[]>('/marketplace/provider/requests'), enabled: !!user && user.role === 'admin' });
  const complaintsQuery = useQuery({ queryKey: ['marketplace-complaints', user?.sub], queryFn: () => api.get<Complaint[]>('/marketplace/complaints'), enabled: !!user && user.role === 'admin' });
  const [offerDrafts, setOfferDrafts] = useState<Record<string, { service_id: string; price_amount: string; message: string; estimated_minutes: string }>>({});
  const [workerDrafts, setWorkerDrafts] = useState<Record<string, string>>({});
  const [reviewResponses, setReviewResponses] = useState<Record<string, { response: string; dispute: boolean }>>({});
  const respond = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.post(`/marketplace/requests/${id}/offers`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace-provider-requests'] }); toast.success('Offer sent to the client'); },
    onError: (e: any) => toast.error(e.message),
  });
  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/marketplace/requests/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace-provider-requests'] }); toast.success('Request status updated'); },
    onError: (e: any) => toast.error(e.message),
  });
  const changeAssignment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { action?: string; worker_account_id?: string; assignment_id?: string } }) => api.post(`/marketplace/requests/${id}/assignments`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace-provider-requests'] }); qc.invalidateQueries({ queryKey: ['marketplace-my-requests'] }); toast.success('Worker assignment updated'); },
    onError: (e: any) => toast.error(e.message),
  });
  const respondToReview = useMutation({
    mutationFn: ({ id, response, dispute }: { id: string; response: string; dispute: boolean }) => api.post(`/marketplace/provider/reviews/${id}/response`, { response, dispute }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace-provider-requests'] }); qc.invalidateQueries({ queryKey: ['marketplace-provider'] }); toast.success('Your response was shared with the client'); },
    onError: (e: any) => toast.error(e.message),
  });
  const complaintResponses = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) => api.post(`/marketplace/complaints/${id}/response`, { response }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace-complaints'] }); toast.success('Complaint response sent to the client'); },
    onError: (e: any) => toast.error(e.message),
  });
  const [complaintDrafts, setComplaintDrafts] = useState<Record<string, string>>({});

  const activeServices = provider?.services?.filter((s) => s.is_active) ?? [];
  const draftFor = (requestId: string) => offerDrafts[requestId] ?? { service_id: activeServices[0]?.id ?? '', price_amount: '', message: '', estimated_minutes: '' };

  return (
    <div className="mx-auto max-w-4xl">
      <LargeTitleHeader title="Incoming service requests" subtitle="Requests shared directly with you or with nearby providers in your category." />
      {!provider && <div className="mb-5 rounded-xl bg-accent-warning/10 p-3 text-[13px] text-ink-secondary">Create your provider profile and publish a service before taking requests.</div>}
      <SectionLabel tone="red">Client requests</SectionLabel>
      {isLoading ? <div className="glass p-6 text-center text-ink-secondary">Loading requests…</div> : !requests?.length ? (
        <div className="glass p-8 text-center"><ClipboardList className="mx-auto mb-3 text-accent-primary" size={30} /><div className="font-semibold text-ink-primary">No open requests yet</div><p className="mt-1 text-[14px] text-ink-secondary">New requests will appear here when clients choose your provider or share with nearby matching providers.</p></div>
      ) : <div className="space-y-4">{requests.map((request) => {
        const ownOffer = request.offers.find((offer) => offer.status === 'pending' || offer.status === 'accepted');
        const draft = draftFor(request.id);
        return <article key={request.id} className="glass p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-[17px] font-semibold text-ink-primary">{request.summary || request.service.title}</div><div className="mt-1 text-[13px] text-ink-secondary">For {request.service.title} · {request.service.provider.display_name}</div></div>
            <Badge tone={request.status === 'accepted' ? 'green' : request.status === 'completed' ? 'blue' : 'orange'}>{request.status.replace('_', ' ')}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-ink-tertiary"><span>{request.sharing_scope === 'matching_providers' ? 'Shared with matching nearby providers' : 'Private request'}</span>{[request.ward, request.district, request.region].filter(Boolean).length > 0 && <span className="inline-flex items-center gap-1"><MapPin size={13} />{[request.ward, request.district, request.region].filter(Boolean).join(', ')}</span>}</div>
          <div className="mt-4 rounded-xl bg-white/45 p-3">
            {request.form_snapshot.map((field) => {
              const value = request.answers?.[field.key];
              if (value === undefined || value === null || value === '') return null;
              return <div key={field.key} className="flex gap-2 border-b border-separator py-2 last:border-0"><div className="w-1/3 shrink-0 text-[12px] text-ink-tertiary">{field.label}</div><div className="whitespace-pre-wrap text-[13px] text-ink-primary">{String(value)}</div></div>;
            })}
          </div>
          <div className="mt-3 flex items-start gap-2 text-[12px] text-ink-tertiary"><ShieldCheck size={15} className="mt-0.5 shrink-0" />Only the request details the client chose to submit are shared. Their saved profile is not attached.</div>

          {ownOffer ? <div className="mt-4 rounded-xl bg-accent-primary/5 p-3 text-[14px] text-ink-secondary">Your offer: {ownOffer.price_amount ? `${Number(ownOffer.price_amount).toLocaleString()} TZS` : 'quote'}{ownOffer.message ? ` · ${ownOffer.message}` : ''}{ownOffer.status === 'accepted' && <div className="mt-3 flex gap-2">{request.status === 'accepted' && <button onClick={() => advance.mutate({ id: request.id, status: 'in_progress' })} disabled={request.assignments.length === 0 || advance.isPending} className="rounded-full bg-accent-primary/10 px-3 py-2 text-[13px] font-semibold text-accent-primary disabled:opacity-40">Start service</button>}{request.status === 'in_progress' && <button onClick={() => advance.mutate({ id: request.id, status: 'completed' })} className="rounded-full bg-accent-success/15 px-3 py-2 text-[13px] font-semibold text-accent-success">Mark completed</button>}</div>}</div> : activeServices.length > 0 && ['open', 'offered'].includes(request.status) ? (
            <form onSubmit={(e) => { e.preventDefault(); respond.mutate({ id: request.id, data: { service_id: draft.service_id, price_amount: draft.price_amount, message: draft.message, estimated_minutes: draft.estimated_minutes } }); }} className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-accent-primary/5 p-4 sm:grid-cols-2">
              <div className="text-[14px] font-semibold text-ink-primary sm:col-span-2">Respond with an offer</div>
              <label className="text-[12px] font-medium text-ink-secondary sm:col-span-2">Your service<select required value={draft.service_id} onChange={(e) => setOfferDrafts((all) => ({ ...all, [request.id]: { ...draft, service_id: e.target.value } }))} className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[14px] text-ink-primary">{activeServices.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
              <label className="text-[12px] font-medium text-ink-secondary">Price (TZS, optional)<input type="number" min="0" value={draft.price_amount} onChange={(e) => setOfferDrafts((all) => ({ ...all, [request.id]: { ...draft, price_amount: e.target.value } }))} className="mt-1 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-2 text-[14px] text-ink-primary" /></label>
              <label className="text-[12px] font-medium text-ink-secondary">Estimated minutes<input type="number" min="1" value={draft.estimated_minutes} onChange={(e) => setOfferDrafts((all) => ({ ...all, [request.id]: { ...draft, estimated_minutes: e.target.value } }))} className="mt-1 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-2 text-[14px] text-ink-primary" /></label>
              <label className="text-[12px] font-medium text-ink-secondary sm:col-span-2">Message to client<textarea maxLength={2000} value={draft.message} onChange={(e) => setOfferDrafts((all) => ({ ...all, [request.id]: { ...draft, message: e.target.value } }))} placeholder="Availability, what is included, or next steps" className="mt-1 min-h-20 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-2 text-[14px] text-ink-primary" /></label>
              <div className="sm:col-span-2"><GlassButton type="submit" disabled={respond.isPending || !draft.service_id}>{respond.isPending ? 'Sending…' : 'Send offer'}</GlassButton></div>
            </form>
          ) : null}

          {ownOffer?.status === 'accepted' && ['accepted', 'in_progress', 'completed'].includes(request.status) && <section className="mt-4 rounded-xl border border-glass-border bg-white/40 p-4">
            <div className="font-semibold text-ink-primary">Assigned employees</div>
            <p className="mt-1 text-[12px] text-ink-tertiary">Assign the people responsible for this service. The client will see their names.</p>
            <div className="mt-3 space-y-2">{request.assignments.map((assignment) => <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/60 px-3 py-2"><span className="text-[13px] font-medium text-ink-primary">{assignment.display_name}</span>{assignment.status === 'active' && <button onClick={() => changeAssignment.mutate({ id: request.id, data: { action: 'release', assignment_id: assignment.id } })} disabled={changeAssignment.isPending} className="text-[12px] font-semibold text-accent-danger disabled:opacity-50">Remove assignment</button>}<span className="text-[11px] capitalize text-ink-tertiary">{assignment.status}</span></div>)}</div>
            {provider?.members?.length && request.status !== 'completed' ? <form onSubmit={(e) => { e.preventDefault(); const worker_account_id = workerDrafts[request.id] || provider.members[0]?.id; if (worker_account_id) changeAssignment.mutate({ id: request.id, data: { worker_account_id } }); }} className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-[200px] flex-1 text-[12px] font-medium text-ink-secondary">Choose an employee<select value={workerDrafts[request.id] || provider.members[0]?.id || ''} onChange={(e) => setWorkerDrafts((all) => ({ ...all, [request.id]: e.target.value }))} className="mt-1 w-full rounded-lg border border-glass-border bg-white/70 px-3 py-2 text-[13px] text-ink-primary">{provider.members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label>
              <button type="submit" disabled={changeAssignment.isPending || !provider.members.some((member) => !request.assignments.some((assignment) => assignment.status === 'active' && assignment.worker_account_id === member.id))} className="rounded-full bg-accent-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40">Assign employee</button>
            </form> : request.status !== 'completed' ? <p className="mt-3 text-[12px] text-accent-warning">Add active employee accounts under Members before starting this service.</p> : null}
          </section>}
          {request.review && <section className="mt-4 rounded-xl border border-glass-border bg-white/40 p-4">{request.review.moderation_status === 'removed' ? <p className="text-[13px] text-ink-tertiary">Client feedback was removed after platform review.</p> : <><div className="font-semibold text-ink-primary">Client review · {'★'.repeat(request.review.rating ?? 0)}{'☆'.repeat(5 - (request.review.rating ?? 0))}</div>{request.review.review && <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-secondary">{request.review.review}</p>}{request.review.provider_response && <p className="mt-2 text-[12px] text-ink-tertiary">Your response: {request.review.provider_response}</p>}<form onSubmit={(e) => { e.preventDefault(); const draft = reviewResponses[request.review!.id] ?? { response: request.review!.provider_response ?? '', dispute: request.review!.moderation_status === 'disputed' }; respondToReview.mutate({ id: request.review!.id, ...draft }); }} className="mt-3 space-y-2"><label className="block text-[12px] font-medium text-ink-secondary">Your response<textarea required maxLength={2000} value={reviewResponses[request.review.id]?.response ?? request.review.provider_response ?? ''} onChange={(e) => setReviewResponses((all) => ({ ...all, [request.review!.id]: { ...(all[request.review!.id] ?? { response: request.review!.provider_response ?? '', dispute: request.review!.moderation_status === 'disputed' }), response: e.target.value } }))} className="mt-1 min-h-16 w-full rounded-lg border border-glass-border bg-white/70 px-3 py-2 text-[13px] text-ink-primary" /></label><label className="flex items-center gap-2 text-[12px] text-ink-secondary"><input type="checkbox" checked={reviewResponses[request.review.id]?.dispute ?? request.review.moderation_status === 'disputed'} onChange={(e) => setReviewResponses((all) => ({ ...all, [request.review!.id]: { ...(all[request.review!.id] ?? { response: request.review!.provider_response ?? '', dispute: request.review!.moderation_status === 'disputed' }), dispute: e.target.checked } }))} />Request a platform review if this feedback is inaccurate or abusive</label><button type="submit" disabled={respondToReview.isPending} className="rounded-full bg-accent-primary px-4 py-2 text-[13px] font-semibold text-white">{respondToReview.isPending ? 'Saving…' : request.review.provider_response ? 'Update response' : 'Respond to review'}</button></form></>}</section>}
        </article>;
      })}</div>}
      {(complaintsQuery.data ?? []).some((item) => item.subject_account_id === user?.sub && ['open', 'in_review'].includes(item.status)) && <section className="mt-8"><SectionLabel tone="red">Service complaint cases</SectionLabel><div className="space-y-3">{(complaintsQuery.data ?? []).filter((item) => item.subject_account_id === user?.sub && ['open', 'in_review'].includes(item.status)).map((item) => <article key={item.id} className="glass p-4"><div className="font-semibold text-ink-primary">{item.service_title} · {item.category.replaceAll('_', ' ')}</div>{item.request_summary && <div className="mt-1 text-[12px] text-ink-tertiary">{item.request_summary}</div>}<p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-secondary">{item.description}</p><form onSubmit={(event) => { event.preventDefault(); complaintResponses.mutate({ id: item.id, response: complaintDrafts[item.id] ?? item.subject_response ?? '' }); }} className="mt-3 space-y-2"><textarea required minLength={5} maxLength={3000} value={complaintDrafts[item.id] ?? item.subject_response ?? ''} onChange={(event) => setComplaintDrafts((all) => ({ ...all, [item.id]: event.target.value }))} placeholder="Respond with your account of the service and next steps." className="min-h-16 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[13px] text-ink-primary" /><button disabled={complaintResponses.isPending} className="rounded-full bg-accent-primary/10 px-4 py-2 text-[12px] font-semibold text-accent-primary">{complaintResponses.isPending ? 'Sending…' : 'Send complaint response'}</button></form></article>)}</div></section>}
    </div>
  );
}
