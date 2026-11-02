'use client';

import { useState } from 'react';
import { BriefcaseBusiness, MapPin, MessageSquare, Send, UsersRound } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, GlassButton, LargeTitleHeader, SectionLabel } from '@/components/ui/GlassCard';

type Job = { id: string; title: string; category: string; location: string; employment_type: string; description: string; requirements: string | null; status: string; application_count: number };
type Applicant = { id: string; status: string; cover_note: string | null; applicant_name: string; career: { headline: string | null; summary: string | null; skills: string[] } | null; verified_history: { organization_name: string; position: string; started_on: string; ended_on: string | null }[] };
type Candidate = { display_name: string; headline: string | null; summary: string | null; skills: string[]; categories: string[]; locations: string[] };
type Message = { id: string; body: string; created_at: string; from_you: boolean };

export default function EmployerJobsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['employer-jobs', user?.sub], queryFn: () => api.get<{ jobs: Job[] }>('/employer/jobs'), enabled: user?.role === 'admin' });
  const [selected, setSelected] = useState('');
  const [messageApplication, setMessageApplication] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const params = new URLSearchParams();
  if (filterCategory.trim()) params.set('category', filterCategory.trim());
  if (filterLocation.trim()) params.set('location', filterLocation.trim());
  const candidatesQuery = useQuery({ queryKey: ['employer-candidates', user?.sub, filterCategory, filterLocation], queryFn: () => api.get<Candidate[]>(`/employer/candidates?${params}`), enabled: user?.role === 'admin' });
  const appsQuery = useQuery({ queryKey: ['job-applicants', selected], queryFn: () => api.get<Applicant[]>(`/employer/jobs/${selected}/applications`), enabled: !!selected && user?.role === 'admin' });
  const messagesQuery = useQuery({ queryKey: ['employer-application-messages', messageApplication], queryFn: () => api.get<Message[]>(`/employer/applications/${messageApplication}/messages`), enabled: !!messageApplication, refetchInterval: 10000 });
  const create = useMutation({
    mutationFn: () => api.post('/employer/jobs', { title, category, location, employment_type: employmentType, description, requirements }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employer-jobs'] }); toast.success('Job published'); setTitle(''); setCategory(''); setLocation(''); setDescription(''); setRequirements(''); },
    onError: (e: any) => toast.error(e.message),
  });
  const changeState = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/employer/jobs/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employer-jobs'] }); toast.success('Job status updated'); },
    onError: (e: any) => toast.error(e.message),
  });
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/employer/applications/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-applicants', selected] }); toast.success('Application updated'); },
    onError: (e: any) => toast.error(e.message),
  });
  const sendMessage = useMutation({
    mutationFn: () => api.post(`/employer/applications/${messageApplication}/messages`, { body: messageBody }),
    onSuccess: () => { setMessageBody(''); qc.invalidateQueries({ queryKey: ['employer-application-messages', messageApplication] }); },
    onError: (e: any) => toast.error(e.message),
  });
  if (user?.role !== 'admin' || !['business', 'school', 'institution'].includes(user.account_type)) return <div className="glass p-6 text-center text-ink-secondary">Job tools are available to organization admins.</div>;
  return <div className="mx-auto max-w-5xl">
    <LargeTitleHeader title="Jobs & candidates" subtitle="Post openings and review people who chose to be discoverable or applied to your role." />
    <div className="mb-5 flex items-start gap-2 rounded-xl bg-accent-primary/5 p-3 text-[13px] text-ink-secondary"><UsersRound size={17} className="mt-0.5 shrink-0 text-accent-primary" />Candidate search only shows adults who turned visibility on. Search results never include phone, email, or private work history. Applying workers choose exactly which career details to include.</div>
    <SectionLabel tone="lavender">Publish an opening</SectionLabel>
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="glass grid gap-3 p-5 sm:grid-cols-2">
      <label className="text-[13px] font-medium text-ink-secondary">Role title<input required maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Automotive technician" className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[14px] text-ink-primary" /></label>
      <label className="text-[13px] font-medium text-ink-secondary">Job category<input required maxLength={80} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Automotive technician" className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[14px] text-ink-primary" /></label>
      <label className="text-[13px] font-medium text-ink-secondary">Location<input required maxLength={180} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Moshi, Kilimanjaro" className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[14px] text-ink-primary" /></label>
      <label className="text-[13px] font-medium text-ink-secondary">Employment type<select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[14px] text-ink-primary"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Temporary</option><option>Internship</option></select></label>
      <label className="text-[13px] font-medium text-ink-secondary sm:col-span-2">Description<textarea required maxLength={6000} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[14px] text-ink-primary" /></label>
      <label className="text-[13px] font-medium text-ink-secondary sm:col-span-2">Requirements<textarea maxLength={4000} value={requirements} onChange={(e) => setRequirements(e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[14px] text-ink-primary" /></label>
      <div className="sm:col-span-2"><GlassButton type="submit" disabled={create.isPending}>{create.isPending ? 'Publishing…' : 'Publish job'}</GlassButton></div>
    </form>
    <SectionLabel tone="blue">Your openings</SectionLabel>
    {isLoading ? <div className="glass p-4 text-ink-secondary">Loading jobs…</div> : data?.jobs.length ? <div className="space-y-3">{data.jobs.map((job) => <article key={job.id} className="glass p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold text-ink-primary">{job.title}</div><div className="mt-1 text-[12px] text-ink-secondary">{job.category} · {job.location} · {job.employment_type}</div></div><Badge tone={job.status === 'open' ? 'green' : 'grey'}>{job.status} · {job.application_count} applicants</Badge></div>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setSelected(selected === job.id ? '' : job.id)} className="rounded-full bg-accent-primary/10 px-4 py-2 text-[12px] font-semibold text-accent-primary">{selected === job.id ? 'Hide applicants' : 'Review applicants'}</button><button onClick={() => changeState.mutate({ id: job.id, status: job.status === 'open' ? 'closed' : 'open' })} className="rounded-full bg-white/60 px-4 py-2 text-[12px] font-semibold text-ink-secondary">{job.status === 'open' ? 'Close job' : 'Reopen job'}</button></div>
      {selected === job.id && <div className="mt-4 space-y-2">{appsQuery.data?.map((app) => <div key={app.id} className="rounded-xl border border-glass-border bg-white/55 p-4"><div className="flex flex-wrap justify-between gap-2"><div><div className="font-semibold text-ink-primary">{app.applicant_name}</div><div className="text-[12px] capitalize text-ink-tertiary">{app.status.replaceAll('_', ' ')}</div></div><div className="flex items-center gap-2"><button onClick={() => setMessageApplication(messageApplication === app.id ? '' : app.id)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent-primary"><MessageSquare size={14} />Message</button><select value={app.status} onChange={(e) => review.mutate({ id: app.id, status: e.target.value })} className="rounded-lg border border-glass-border bg-white/70 px-2 py-1 text-[12px] text-ink-primary"><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="interview">Interview</option><option value="offered">Offered</option><option value="rejected">Rejected</option><option value="hired">Hired</option></select></div></div>{app.cover_note && <p className="mt-2 whitespace-pre-line text-[13px] text-ink-secondary">{app.cover_note}</p>}{app.career && <div className="mt-2 rounded-lg bg-accent-primary/5 p-3 text-[12px] text-ink-secondary"><strong>{app.career.headline}</strong><p>{app.career.summary}</p><p className="mt-1">Skills: {(app.career.skills ?? []).join(', ')}</p></div>}{app.verified_history.map((h, i) => <div key={i} className="mt-2 text-[12px] text-ink-secondary">Verified: {h.position} · {h.organization_name} ({h.started_on}{h.ended_on ? `–${h.ended_on}` : '–present'})</div>)}{messageApplication === app.id && <div className="mt-3 border-t border-glass-border pt-3"><div className="max-h-64 space-y-2 overflow-y-auto">{messagesQuery.data?.map((message) => <div key={message.id} className={`max-w-[90%] rounded-xl p-3 text-[13px] ${message.from_you ? 'ml-auto bg-accent-primary/10 text-ink-primary' : 'bg-white/70 text-ink-secondary'}`}><p className="whitespace-pre-wrap">{message.body}</p><div className="mt-1 text-[10px] opacity-60">{message.from_you ? 'You' : 'Applicant'} · {new Date(message.created_at).toLocaleString()}</div></div>)}</div><form onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(); }} className="mt-3 flex gap-2"><input value={messageBody} onChange={(e) => setMessageBody(e.target.value)} maxLength={5000} placeholder="Write a message" className="min-w-0 flex-1 rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[13px] text-ink-primary" /><button disabled={!messageBody.trim() || sendMessage.isPending} className="rounded-xl bg-accent-primary px-3 text-white disabled:opacity-50"><Send size={16} /></button></form></div>}</div>)}{!appsQuery.data?.length && !appsQuery.isLoading && <div className="text-[13px] text-ink-tertiary">No applications yet.</div>}</div>}
    </article>)}</div> : <div className="glass p-5 text-[13px] text-ink-secondary">No openings yet.</div>}
    <SectionLabel tone="green">Opt-in candidate search</SectionLabel>
    <div className="glass mb-3 grid gap-3 p-4 sm:grid-cols-2"><label className="text-[12px] font-medium text-ink-secondary">Category filter<input value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} placeholder="e.g. mechanic" className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[13px] text-ink-primary" /></label><label className="text-[12px] font-medium text-ink-secondary">Location filter<input value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} placeholder="e.g. Moshi" className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[13px] text-ink-primary" /></label></div>
    {candidatesQuery.data?.length ? <div className="grid gap-3 md:grid-cols-2">{candidatesQuery.data.map((person, i) => <article key={`${person.display_name}-${i}`} className="glass p-4"><div className="font-semibold text-ink-primary">{person.display_name}</div>{person.headline && <div className="text-[13px] text-accent-primary">{person.headline}</div>}{person.summary && <p className="mt-2 text-[12px] text-ink-secondary">{person.summary}</p>}<div className="mt-2 text-[12px] text-ink-secondary">Skills: {(person.skills ?? []).join(', ') || 'Not listed'}</div><div className="mt-1 text-[11px] text-ink-tertiary"><MapPin size={12} className="mr-1 inline" />{(person.locations ?? []).join(', ')} · {(person.categories ?? []).join(', ')}</div></article>)}</div> : <div className="glass p-5 text-[13px] text-ink-secondary">No opted-in candidates match these filters.</div>}
    <div className="mt-3 flex items-start gap-2 text-[11px] text-ink-tertiary"><BriefcaseBusiness size={14} className="mt-0.5" />Contact information stays private. Applicants choose to share career details with each application; candidate search does not reveal work history or contact fields.</div>
  </div>;
}
