'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';

type Evidence = { id: string; file_name: string; size_bytes: number };

export function ComplaintEvidenceControls({ caseId, status, evidence }: { caseId: string; status: string; evidence: Evidence[] }) {
  const qc = useQueryClient();
  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { toast.error('Choose a PDF, JPEG, or PNG up to 2 MB'); return; }
    try {
      const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = () => reject(new Error('Could not read evidence file')); reader.readAsDataURL(file); });
      await api.post(`/marketplace/complaints/${caseId}/evidence`, { file_name: file.name, mime_type: file.type, base64 });
      qc.invalidateQueries({ queryKey: ['marketplace-complaints'] });
      toast.success('Evidence added to the case');
    } catch (error: any) { toast.error(error.message); }
  };
  const download = async (evidenceItem: Evidence) => {
    try {
      const file = await api.get<{ file_name: string; mime_type: string; base64: string }>(`/marketplace/complaints/${caseId}/evidence/${evidenceItem.id}`);
      const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: file.mime_type }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.file_name; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error: any) { toast.error(error.message); }
  };
  return <div className="mt-3 space-y-2">{!!evidence.length && <div className="flex flex-wrap gap-2">{evidence.map((item) => <button key={item.id} onClick={() => download(item)} className="rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-accent-primary">Evidence: {item.file_name} ({Math.ceil(item.size_bytes / 1024)} KB)</button>)}</div>}{['open', 'in_review'].includes(status) && evidence.length < 5 && <label className="block text-[11px] font-medium text-ink-secondary">Add case evidence (PDF/JPEG/PNG, max 2 MB)<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => { void upload(e.target.files?.[0]); e.currentTarget.value = ''; }} className="mt-1 block w-full text-[11px]" /></label>}</div>;
}
