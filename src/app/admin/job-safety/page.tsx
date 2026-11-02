'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, LargeTitleHeader } from '@/components/ui/GlassCard';

type Report = { id: string; reason: string; details: string | null; created_at: string; reporter_username: string; subject_username: string | null; job_title: string | null; reported_message: string | null };

export default function JobSafetyReportsPage() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({ queryKey: ['admin-job-safety-reports'], queryFn: () => api.get<Report[]>('/admin/job-safety/reports') });
  const resolve = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'resolved' | 'dismissed' }) => api.patch(`/admin/job-safety/reports/${id}`, { outcome, note: notes[id] ?? '' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-job-safety-reports'] }); toast.success('Report decision recorded'); },
    onError: (e: any) => toast.error(e.message),
  });
  return <div className="mx-auto max-w-4xl">
    <LargeTitleHeader title="Job safety reports" subtitle="Review reports about job listings and application conversations. Resolution notes are written to the system audit log." />
    {isLoading ? <div className="glass p-6 text-center text-ink-secondary">Loading reports…</div> : !data?.length ? <div className="glass p-8 text-center"><ShieldAlert size={30} className="mx-auto mb-3 text-accent-primary" /><div className="font-semibold text-ink-primary">No open reports</div><p className="mt-1 text-[14px] text-ink-secondary">Reports from job seekers and hiring organizations will appear here.</p></div> : <div className="space-y-4">{data.map((report) => <article key={report.id} className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold text-ink-primary">{report.reason.replaceAll('_', ' ')}</div><div className="text-[12px] text-ink-tertiary">Reported by @{report.reporter_username}{report.subject_username ? ` · about @${report.subject_username}` : ''}</div>{report.job_title && <div className="mt-1 text-[12px] text-ink-secondary">Job: {report.job_title}</div>}</div><Badge tone="yellow">Open · {new Date(report.created_at).toLocaleString()}</Badge></div>
      {report.details && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white/55 p-3 text-[13px] text-ink-secondary">{report.details}</p>}
      {report.reported_message && <div className="mt-2 rounded-xl bg-accent-warning/10 p-3"><div className="text-[10px] font-semibold uppercase text-ink-tertiary">Reported message</div><p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-secondary">{report.reported_message}</p></div>}
      <label className="mt-3 block text-[12px] font-medium text-ink-secondary">Resolution note<textarea minLength={4} maxLength={2000} value={notes[report.id] ?? ''} onChange={(e) => setNotes((all) => ({ ...all, [report.id]: e.target.value }))} placeholder="Summarize the review and action taken." className="mt-1 min-h-16 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[13px] text-ink-primary" /></label>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => resolve.mutate({ id: report.id, outcome: 'resolved' })} disabled={resolve.isPending || (notes[report.id] ?? '').trim().length < 4} className="rounded-full bg-accent-success/15 px-4 py-2 text-[13px] font-semibold text-accent-success disabled:opacity-40">Mark resolved</button><button onClick={() => resolve.mutate({ id: report.id, outcome: 'dismissed' })} disabled={resolve.isPending || (notes[report.id] ?? '').trim().length < 4} className="rounded-full bg-white/60 px-4 py-2 text-[13px] font-semibold text-ink-secondary disabled:opacity-40">Dismiss report</button></div>
    </article>)}</div>}
  </div>;
}
