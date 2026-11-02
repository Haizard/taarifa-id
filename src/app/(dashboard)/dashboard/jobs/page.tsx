'use client';

import { useEffect, useState } from 'react';
import { Ban, BriefcaseBusiness, MapPin, MessageSquare, Send, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, GlassButton, LargeTitleHeader, SectionLabel } from '@/components/ui/GlassCard';

type Job = { id: string; title: string; organization_name: string; organization_category: string; category: string; location: string; employment_type: string; description: string; requirements: string | null; closes_at: string | null; application_status: string | null };
type Preference = { job_seeking: boolean; job_categories: string[]; job_locations: string[]; excluded_employer_account_ids: string[] };
type EligibleEmployer = { account_id: string; display_name: string; category: string; region: string | null; district: string | null };
type Career = { history: { id: string; position: string; organization_name: string; verification_status: string }[] };
type Application = { id: string; status: string; job_title: string; organization_name: string; location: string; employer_note: string | null };
type Message = { id: string; body: string; created_at: string; from_you: boolean };
type Invitation = { id: string; title: string; category: string; location: string; employment_type: string; description: string; organization_name: string; message: string | null; expires_at: string };
type Block = { id: string; name: string; created_at: string };

export default function JobsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const prefQuery = useQuery({ queryKey: ['job-preferences', user?.sub], queryFn: () => api.get<Preference>('/jobs/preferences'), enabled: !!user });
  const employersQuery = useQuery({ queryKey: ['eligible-employers', user?.sub], queryFn: () => api.get<EligibleEmployer[]>('/jobs/employers'), enabled: !!user });
  const jobsQuery = useQuery({ queryKey: ['jobs', user?.sub], queryFn: () => api.get<Job[]>('/jobs'), enabled: !!user });
  const appsQuery = useQuery({ queryKey: ['my-job-applications', user?.sub], queryFn: () => api.get<Application[]>('/jobs/applications'), enabled: !!user });
  const invitesQuery = useQuery({ queryKey: ['job-invitations', user?.sub], queryFn: () => api.get<Invitation[]>('/jobs/invitations'), enabled: !!user });
  const blocksQuery = useQuery({ queryKey: ['job-safety-blocks', user?.sub], queryFn: () => api.get<Block[]>('/job-safety/blocks'), enabled: !!user });
  const careerQuery = useQuery({ queryKey: ['career-me', user?.sub], queryFn: () => api.get<Career>('/career/me'), enabled: !!user });
  const [enabled, setEnabled] = useState(false);
  const [categories, setCategories] = useState('');
  const [locations, setLocations] = useState('');
  const [excludedEmployerIds, setExcludedEmployerIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [shareProfile, setShareProfile] = useState<Record<string, boolean>>({});
  const [shareHistory, setShareHistory] = useState<Record<string, string[]>>({});
  const [inviteShareProfile, setInviteShareProfile] = useState<Record<string, boolean>>({});
  const [inviteShareHistory, setInviteShareHistory] = useState<Record<string, string[]>>({});
  const [messageApplication, setMessageApplication] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const messagesQuery = useQuery({ queryKey: ['application-messages', messageApplication], queryFn: () => api.get<Message[]>(`/jobs/applications/${messageApplication}/messages`), enabled: !!messageApplication, refetchInterval: 10000 });
  useEffect(() => {
    if (!prefQuery.data) return;
    setEnabled(prefQuery.data.job_seeking);
    setCategories((prefQuery.data.job_categories ?? []).join(', '));
    setLocations((prefQuery.data.job_locations ?? []).join(', '));
    setExcludedEmployerIds(prefQuery.data.excluded_employer_account_ids ?? []);
  }, [prefQuery.data]);
  const save = useMutation({
    mutationFn: () => api.put('/jobs/preferences', { job_seeking: enabled, job_categories: categories.split(',').map((x) => x.trim()).filter(Boolean), job_locations: locations.split(',').map((x) => x.trim()).filter(Boolean), excluded_employer_account_ids: excludedEmployerIds }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-preferences'] }); qc.invalidateQueries({ queryKey: ['employer-candidates'] }); toast.success(enabled ? 'Job seeking is on' : 'Job seeking is off'); },
    onError: (e: any) => toast.error(e.message),
  });
  const apply = useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => api.post(`/jobs/${jobId}/apply`, { cover_note: notes[jobId] ?? '', share_profile: shareProfile[jobId] === true, shared_history_ids: shareHistory[jobId] ?? [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); qc.invalidateQueries({ queryKey: ['my-job-applications'] }); toast.success('Application sent'); },
    onError: (e: any) => toast.error(e.message),
  });
  const withdraw = useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/applications/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); qc.invalidateQueries({ queryKey: ['my-job-applications'] }); toast.success('Application withdrawn'); },
    onError: (e: any) => toast.error(e.message),
  });
  const sendMessage = useMutation({
    mutationFn: () => api.post(`/jobs/applications/${messageApplication}/messages`, { body: messageBody }),
    onSuccess: () => { setMessageBody(''); qc.invalidateQueries({ queryKey: ['application-messages', messageApplication] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const respondInvite = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) => api.post(`/jobs/invitations/${id}/respond`, {
      action, share_profile: inviteShareProfile[id] === true, shared_history_ids: inviteShareHistory[id] ?? [],
    }),
    onSuccess: (_data, variables) => { qc.invalidateQueries({ queryKey: ['job-invitations'] }); qc.invalidateQueries({ queryKey: ['jobs'] }); qc.invalidateQueries({ queryKey: ['my-job-applications'] }); toast.success(variables.action === 'accept' ? 'Invitation accepted. Choose what to share from your application.' : 'Invitation declined'); },
    onError: (e: any) => toast.error(e.message),
  });
  const safetyAction = useMutation({
    mutationFn: ({ jobId, action }: { jobId: string; action: 'report' | 'block' }) => api.post(`/jobs/${jobId}/safety-actions`, { action_type: action, reason: action === 'block' ? 'unwanted_contact' : 'misleading_or_inappropriate' }),
    onSuccess: (_data, vars) => { qc.invalidateQueries({ queryKey: ['jobs'] }); qc.invalidateQueries({ queryKey: ['job-safety-blocks'] }); qc.invalidateQueries({ queryKey: ['job-invitations'] }); toast.success(vars.action === 'block' ? 'Organization blocked' : 'Report sent to platform moderators'); },
    onError: (e: any) => toast.error(e.message),
  });
  const applicationSafetyAction = useMutation({
    mutationFn: ({ applicationId, action }: { applicationId: string; action: 'report' | 'block' }) => api.post(`/jobs/applications/${applicationId}/safety-actions`, { action_type: action, reason: action === 'block' ? 'unwanted_contact' : 'inappropriate_or_fraudulent' }),
    onSuccess: (_data, vars) => { qc.invalidateQueries({ queryKey: ['my-job-applications'] }); qc.invalidateQueries({ queryKey: ['job-safety-blocks'] }); qc.invalidateQueries({ queryKey: ['job-invitations'] }); toast.success(vars.action === 'block' ? 'Organization blocked' : 'Report sent to platform moderators'); },
    onError: (e: any) => toast.error(e.message),
  });
  const unblock = useMutation({
    mutationFn: (id: string) => api.delete(`/job-safety/blocks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-safety-blocks'] }); qc.invalidateQueries({ queryKey: ['jobs'] }); toast.success('Organization unblocked'); },
    onError: (e: any) => toast.error(e.message),
  });
  const verified = (careerQuery.data?.history ?? []).filter((record) => record.verification_status === 'verified');
  if (!['individual', 'user'].includes(user?.role ?? '')) return <div className="glass p-6 text-center text-ink-secondary">Job tools are for individual and employee accounts.</div>;
  return <div className="mx-auto max-w-5xl">
    <LargeTitleHeader title="Jobs & opportunities" subtitle="Choose whether verified organizations can discover your professional profile, or browse roles and apply." />
    <section className="glass mb-7 p-5">
      <div className="flex items-start gap-3"><ShieldCheck size={20} className="mt-1 text-accent-primary" /><div className="flex-1"><div className="font-semibold text-ink-primary">Your job-seeking visibility</div><p className="mt-1 text-[13px] text-ink-secondary">Off by default. When enabled, eligible organizations can find your name, headline, skills, and chosen job categories and locations. They never see your contact details. Your current organization is excluded automatically.</p></div><label className="flex items-center gap-2 text-[13px] font-semibold text-ink-primary"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Visible</label></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[13px] font-medium text-ink-secondary">Job categories, comma separated<input value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="Automotive technician, mechanic" className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[14px] text-ink-primary" /></label><label className="text-[13px] font-medium text-ink-secondary">Preferred locations<input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Moshi, Arusha, Remote" className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[14px] text-ink-primary" /></label></div>
      <div className="mt-4 rounded-xl border border-glass-border bg-white/35 p-3"><div className="text-[13px] font-semibold text-ink-primary">Organizations excluded from discovery</div><p className="mt-1 text-[12px] text-ink-secondary">Selected organizations won’t find you through candidate search or send job invitations. Your current organization is excluded automatically. You can still apply directly to a job from an excluded organization.</p>{employersQuery.isLoading ? <p className="mt-2 text-[12px] text-ink-tertiary">Loading verified organizations…</p> : employersQuery.data?.length ? <div className="mt-2 grid gap-1 sm:grid-cols-2">{employersQuery.data.map((employer) => <label key={employer.account_id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-ink-secondary"><input type="checkbox" checked={excludedEmployerIds.includes(employer.account_id)} onChange={(e) => setExcludedEmployerIds((ids) => e.target.checked ? [...new Set([...ids, employer.account_id])] : ids.filter((id) => id !== employer.account_id))} /><span>{employer.display_name}<span className="ml-1 text-ink-tertiary">· {employer.category}{employer.region ? ` · ${employer.region}` : ''}</span></span></label>)}</div> : <p className="mt-2 text-[12px] text-ink-tertiary">No verified organizations available yet.</p>}</div>
      <div className="mt-3"><GlassButton disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save visibility settings'}</GlassButton></div>
    </section>
    {!!invitesQuery.data?.length && <><SectionLabel tone="yellow">Employer invitations</SectionLabel><div className="mb-6 space-y-3">{invitesQuery.data.map((invite) => <article key={invite.id} className="glass p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-semibold text-ink-primary">{invite.title} · {invite.organization_name}</div><div className="text-[12px] text-ink-tertiary">{invite.category} · {invite.location} · {invite.employment_type}</div></div><div className="text-[11px] text-ink-tertiary">Expires {new Date(invite.expires_at).toLocaleDateString()}</div></div><p className="mt-2 text-[13px] text-ink-secondary">{invite.message || 'The organization would like you to consider this opening.'}</p><p className="mt-3 text-[12px] font-semibold text-ink-primary">Choose career information to share with your application (optional)</p><label className="mt-2 flex items-center gap-2 text-[12px] text-ink-secondary"><input type="checkbox" checked={inviteShareProfile[invite.id] ?? false} onChange={(e) => setInviteShareProfile((s) => ({ ...s, [invite.id]: e.target.checked }))} />Share my headline, summary, and skills</label>{verified.map((record) => <label key={record.id} className="mt-1 flex items-center gap-2 text-[12px] text-ink-secondary"><input type="checkbox" checked={(inviteShareHistory[invite.id] ?? []).includes(record.id)} onChange={(e) => setInviteShareHistory((s) => ({ ...s, [invite.id]: e.target.checked ? [...(s[invite.id] ?? []), record.id] : (s[invite.id] ?? []).filter((id) => id !== record.id) }))} />Share verified record: {record.position} · {record.organization_name}</label>)}<div className="mt-3 flex flex-wrap gap-2"><button onClick={() => respondInvite.mutate({ id: invite.id, action: 'accept' })} disabled={respondInvite.isPending} className="rounded-full bg-accent-success/15 px-4 py-2 text-[13px] font-semibold text-accent-success">Accept & start application</button><button onClick={() => respondInvite.mutate({ id: invite.id, action: 'decline' })} disabled={respondInvite.isPending} className="rounded-full bg-white/60 px-4 py-2 text-[13px] font-semibold text-ink-secondary">Decline</button></div></article>)}</div></>}
    <SectionLabel tone="blue">Open roles</SectionLabel>
    <div className="space-y-3">{jobsQuery.data?.map((job) => <article key={job.id} className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-[17px] font-semibold text-ink-primary">{job.title}</h2><div className="text-[13px] text-ink-secondary">{job.organization_name} · {job.organization_category}</div></div><Badge tone={job.application_status ? 'green' : 'blue'}>{job.application_status ?? 'Open'}</Badge></div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-tertiary"><span><MapPin className="mr-1 inline" size={13} />{job.location}</span><span>{job.category}</span><span>{job.employment_type}</span>{job.closes_at && <span>Closes {new Date(job.closes_at).toLocaleDateString()}</span>}</div>
      <p className="mt-3 whitespace-pre-line text-[13px] text-ink-secondary">{job.description}</p>{job.requirements && <p className="mt-2 whitespace-pre-line text-[12px] text-ink-tertiary">Requirements: {job.requirements}</p>}
      {!job.application_status && <div className="mt-4 space-y-2 border-t border-glass-border pt-3">
        <textarea value={notes[job.id] ?? ''} onChange={(e) => setNotes((s) => ({ ...s, [job.id]: e.target.value }))} maxLength={3000} placeholder="Short application note (optional)" className="min-h-16 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[13px] text-ink-primary" />
        <label className="flex items-center gap-2 text-[12px] text-ink-secondary"><input type="checkbox" checked={shareProfile[job.id] ?? false} onChange={(e) => setShareProfile((s) => ({ ...s, [job.id]: e.target.checked }))} />Include my career headline, summary, and skills</label>
        {verified.map((record) => <label key={record.id} className="flex items-center gap-2 text-[12px] text-ink-secondary"><input type="checkbox" checked={(shareHistory[job.id] ?? []).includes(record.id)} onChange={(e) => setShareHistory((s) => ({ ...s, [job.id]: e.target.checked ? [...(s[job.id] ?? []), record.id] : (s[job.id] ?? []).filter((id) => id !== record.id) }))} />Include verified record: {record.position} · {record.organization_name}</label>)}
        <GlassButton disabled={!enabled || apply.isPending} onClick={() => apply.mutate({ jobId: job.id })}>{enabled ? 'Apply to this job' : 'Turn on job seeking to apply'}</GlassButton>
      </div>}
      <div className="mt-3 flex flex-wrap gap-3 border-t border-glass-border pt-3"><button onClick={() => safetyAction.mutate({ jobId: job.id, action: 'report' })} className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-tertiary"><ShieldAlert size={14} />Report job</button><button onClick={() => safetyAction.mutate({ jobId: job.id, action: 'block' })} className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-danger"><Ban size={14} />Block organization</button></div>
    </article>)}
      {!jobsQuery.isLoading && !jobsQuery.data?.length && <div className="glass p-6 text-center text-[14px] text-ink-secondary"><BriefcaseBusiness className="mx-auto mb-2 text-accent-primary" />No open jobs yet. Check again later.</div>}
    </div>
    <SectionLabel tone="green">My applications</SectionLabel>
    {appsQuery.data?.length ? <div className="space-y-2">{appsQuery.data.map((app) => <article key={app.id} className="glass p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold text-ink-primary">{app.job_title} · {app.organization_name}</div><div className="text-[12px] text-ink-tertiary">{app.location} · {app.status.replaceAll('_', ' ')}</div>{app.employer_note && <p className="mt-1 text-[12px] text-ink-secondary">Employer update: {app.employer_note}</p>}</div><div className="flex items-center gap-3"><button onClick={() => setMessageApplication(messageApplication === app.id ? '' : app.id)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent-primary"><MessageSquare size={15} />{messageApplication === app.id ? 'Hide messages' : 'Message'}</button><button title="Report organization" onClick={() => applicationSafetyAction.mutate({ applicationId: app.id, action: 'report' })} className="text-[12px] text-ink-tertiary"><ShieldAlert size={15} /></button><button title="Block organization" onClick={() => applicationSafetyAction.mutate({ applicationId: app.id, action: 'block' })} className="text-[12px] text-accent-danger"><Ban size={15} /></button>{!['withdrawn', 'rejected', 'hired'].includes(app.status) && <button onClick={() => withdraw.mutate(app.id)} disabled={withdraw.isPending} className="text-[12px] font-semibold text-accent-danger">Withdraw</button>}</div></div>{messageApplication === app.id && <div className="mt-3 border-t border-glass-border pt-3"><div className="max-h-64 space-y-2 overflow-y-auto">{messagesQuery.data?.map((message) => <div key={message.id} className={`max-w-[90%] rounded-xl p-3 text-[13px] ${message.from_you ? 'ml-auto bg-accent-primary/10 text-ink-primary' : 'bg-white/70 text-ink-secondary'}`}><p className="whitespace-pre-wrap">{message.body}</p><div className="mt-1 text-[10px] opacity-60">{message.from_you ? 'You' : 'Hiring organization'} · {new Date(message.created_at).toLocaleString()}</div></div>)}</div><form onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(); }} className="mt-3 flex gap-2"><input value={messageBody} onChange={(e) => setMessageBody(e.target.value)} maxLength={5000} placeholder="Write a message" className="min-w-0 flex-1 rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[13px] text-ink-primary" /><button disabled={!messageBody.trim() || sendMessage.isPending} className="rounded-xl bg-accent-primary px-3 text-white disabled:opacity-50"><Send size={16} /></button></form></div>}</article>)}</div> : <div className="glass p-4 text-[13px] text-ink-secondary">Your applications will appear here.</div>}
    <SectionLabel tone="yellow">Blocked organizations</SectionLabel>
    {blocksQuery.data?.length ? <div className="space-y-2">{blocksQuery.data.map((block) => <div key={block.id} className="glass flex items-center justify-between gap-3 p-3"><span className="text-[13px] text-ink-primary">{block.name}</span><button onClick={() => unblock.mutate(block.id)} disabled={unblock.isPending} className="text-[12px] font-semibold text-accent-primary">Unblock</button></div>)}</div> : <div className="glass p-4 text-[13px] text-ink-secondary">Organizations you block will no longer appear in job discovery or invitations.</div>}
  </div>;
}
