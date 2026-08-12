'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Link as LinkIcon, ListPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { LargeTitleHeader, GlassButton, SectionLabel } from '@/components/ui/GlassCard';
import { IOSListGroup, IOSInput, IOSSelect } from '@/components/ui/IOSListGroup';
import { EmptyState } from '@/components/ui/Control';

export default function AdminReports() {
  const qc = useQueryClient();
  const [lookupForm, setLookupForm] = useState({ table: 'acute', code: '', label: '' });

  const { data: report } = useQuery({ queryKey: ['admin-url-access'], queryFn: () => api.get('/admin/reports/url-access') });
  const { data: logs } = useQuery({ queryKey: ['admin-logs'], queryFn: () => api.get('/admin/logs') });

  const lookupMutation = useMutation({
    mutationFn: (d: any) => api.post('/admin/lookups', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-lookups'] });
      toast.success('Lookup value added');
      setLookupForm({ table: 'acute', code: '', label: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <LargeTitleHeader title="Reports" subtitle="URL access and audit logs" />

      <SectionLabel>URL access report</SectionLabel>
      {report?.by_url?.length ? (
        <div className="glass p-4">
          {report.by_url.map((r: any) => (
            <div key={r.url} className="flex items-center justify-between gap-3 border-b border-separator py-3 last:border-b-0">
              <div className="flex min-w-0 items-center gap-2">
                <LinkIcon size={18} className="shrink-0 text-ink-tertiary" />
                <span className="truncate font-mono text-[13px] text-ink-primary">{r.url}</span>
              </div>
              <span className="shrink-0 rounded-full bg-accent-primary/15 px-3 py-1 text-[13px] font-semibold text-accent-primary">
                {r.count}
              </span>
            </div>
          ))}
          <div className="pt-3 text-[12px] text-ink-tertiary">Total accesses: {report?.total ?? 0}</div>
        </div>
      ) : (
        <EmptyState icon={<LinkIcon size={28} />} title="No URL accesses yet" subtitle="Public profile links will be tracked here." />
      )}

      <SectionLabel>System admin audit log</SectionLabel>
      {logs?.length ? (
        <div className="glass p-4">
          {logs.map((l: any) => (
            <div key={l.id} className="border-b border-separator py-3 last:border-b-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-medium text-ink-primary">{l.action}</span>
                <span className="shrink-0 text-[12px] text-ink-tertiary">{new Date(l.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 truncate font-mono text-[12px] text-ink-secondary">
                {JSON.stringify(l.payload ?? {})}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<ListPlus size={28} />} title="No audit entries yet" subtitle="Admin actions will be logged here." />
      )}

      <SectionLabel>Add lookup value</SectionLabel>
      <IOSListGroup>
        <IOSSelect label="Table" value={lookupForm.table} onChange={(v) => setLookupForm({ ...lookupForm, table: v })}>
          <option value="acute">Acute conditions</option>
          <option value="employment">Employment types</option>
          <option value="position">Positions</option>
          <option value="stream">School streams</option>
          <option value="ownership">Ownership types</option>
        </IOSSelect>
        <IOSInput label="Code" value={lookupForm.code} onChange={(e) => setLookupForm({ ...lookupForm, code: e.target.value })} />
        <IOSInput label="Label" value={lookupForm.label} onChange={(e) => setLookupForm({ ...lookupForm, label: e.target.value })} />
      </IOSListGroup>
      <GlassButton
        onClick={() => {
          if (!lookupForm.code || !lookupForm.label) return toast.error('Provide code and label');
          lookupMutation.mutate(lookupForm);
        }}
        disabled={lookupMutation.isPending}
      >
        {lookupMutation.isPending ? 'Saving…' : 'Add lookup value'}
      </GlassButton>
    </div>
  );
}
