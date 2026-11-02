'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { BadgeCheck, Building2, CirclePlus, ClipboardList, GraduationCap, Siren, Store, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, GlassButton, LargeTitleHeader, SectionLabel } from '@/components/ui/GlassCard';

type Field = { key: string; label: string; type: string; required?: boolean; options?: string[] };
type Provider = { id: string; category: 'hospital' | 'school' | 'garage'; display_name: string; verification_status: string; description: string | null; contact_number: string | null; region: string | null; district: string | null; ward: string | null; accepting_requests: boolean; services: any[]; members: Array<{ id: string; display_name: string; member_type: string; ratings_available: boolean; rating: number | null; review_count: number }> };
type Verification = { status: string; verified_at: string | null; request: { legal_name: string; registration_reference: string; evidence_notes: string | null; evidence_file_name: string | null; evidence_size_bytes: number | null; status: string; review_note: string | null } | null };

const seedFields: Record<string, Field[]> = {
  hospital: [
    { key: 'reason', label: 'What do you need help with?', type: 'textarea', required: true },
    { key: 'urgency', label: 'Urgency', type: 'select', required: true, options: ['Emergency', 'Today', 'This week', 'General enquiry'] },
    { key: 'preferred_date', label: 'Preferred date', type: 'date' },
  ],
  school: [
    { key: 'service_needed', label: 'Service needed', type: 'select', required: true, options: ['Admission', 'School visit', 'Transport', 'Other'] },
    { key: 'student_age', label: 'Student age', type: 'number' },
    { key: 'message', label: 'Additional information', type: 'textarea' },
  ],
  garage: [
    { key: 'vehicle', label: 'Vehicle make and model', type: 'text', required: true },
    { key: 'registration', label: 'Registration number', type: 'text' },
    { key: 'problem', label: 'Describe the breakdown', type: 'textarea', required: true },
  ],
};

export default function ProviderPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['marketplace-provider', user?.sub], queryFn: () => api.get<Provider | null>('/marketplace/provider'), enabled: !!user && user.role === 'admin' });
  const verificationQuery = useQuery({ queryKey: ['provider-verification'], queryFn: () => api.get<Verification>('/marketplace/provider/verification'), enabled: !!data });
  const [profile, setProfile] = useState({ category: 'hospital', display_name: '', description: '', contact_number: '', region: '', district: '', ward: '' });
  const [service, setService] = useState({ title: '', description: '', delivery_mode: 'on_demand', price_type: 'quote_required', price_amount: '', estimated_minutes: '' });
  const [fields, setFields] = useState<Field[]>(seedFields.hospital);
  const [legalName, setLegalName] = useState('');
  const [registrationReference, setRegistrationReference] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  useEffect(() => {
    if (data) setProfile({ category: data.category, display_name: data.display_name, description: data.description ?? '', contact_number: data.contact_number ?? '', region: data.region ?? '', district: data.district ?? '', ward: data.ward ?? '' });
  }, [data]);

  const saveProfile = useMutation({
    mutationFn: () => api.post('/marketplace/provider', profile),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace-provider'] }); qc.invalidateQueries({ queryKey: ['marketplace-services'] }); toast.success('Provider profile saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  const addService = useMutation({
    mutationFn: () => api.post('/marketplace/services', { ...service, form_fields: fields }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace-provider'] }); qc.invalidateQueries({ queryKey: ['marketplace-services'] }); toast.success('Service published'); setService({ title: '', description: '', delivery_mode: 'on_demand', price_type: 'quote_required', price_amount: '', estimated_minutes: '' }); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleService = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => api.patch(`/marketplace/services/${id}`, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace-provider'] }); qc.invalidateQueries({ queryKey: ['marketplace-services'] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const requestVerification = useMutation({
    mutationFn: async () => {
      if (!evidenceFile) throw new Error('Choose a registration document to upload');
      const evidenceBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('Could not read the selected document'));
        reader.readAsDataURL(evidenceFile);
      });
      return api.post('/marketplace/provider/verification', {
        legal_name: legalName, registration_reference: registrationReference, evidence_notes: evidenceNotes,
        evidence_file_name: evidenceFile.name, evidence_mime_type: evidenceFile.type, evidence_base64: evidenceBase64,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['provider-verification'] }); qc.invalidateQueries({ queryKey: ['marketplace-provider'] }); toast.success('Verification request submitted'); },
    onError: (e: any) => toast.error(e.message),
  });

  if (user?.role !== 'admin' || !['business', 'school', 'institution'].includes(user.account_type)) {
    return <div className="glass p-6 text-center text-ink-secondary">Provider tools are available to business and school accounts.</div>;
  }

  const category = user.account_type === 'school' ? 'school' : profile.category;
  const setCategory = (value: string) => {
    setProfile((p) => ({ ...p, category: value }));
    setFields(seedFields[value] ?? []);
  };
  const changeField = (index: number, patch: Partial<Field>) => setFields((all) => all.map((field, i) => i === index ? { ...field, ...patch } : field));

  return (
    <div className="mx-auto max-w-4xl">
      <LargeTitleHeader title="Provider tools" subtitle="Set up your organization and publish services clients can request." right={<Link href="/dashboard/provider/requests" className="glass rounded-full px-3 py-2 text-[13px] font-semibold text-accent-primary">Incoming requests</Link>} />
      <SectionLabel tone="blue">Provider profile</SectionLabel>
      <form onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(); }} className="glass grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
        {user.account_type === 'business' ? <label className="text-[13px] font-medium text-ink-secondary">Provider category<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[15px] text-ink-primary"><option value="hospital">Hospital / clinic</option><option value="garage">Emergency garage</option></select></label> : <div className="rounded-xl bg-accent-primary/5 p-3 text-[14px] font-medium text-accent-primary">School service provider</div>}
        <label className="text-[13px] font-medium text-ink-secondary">Provider name<input required value={profile.display_name} onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))} className="mt-1 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-3 text-[15px] text-ink-primary" /></label>
        <label className="text-[13px] font-medium text-ink-secondary sm:col-span-2">About your organization<textarea value={profile.description} onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-2 text-[15px] text-ink-primary" /></label>
        <label className="text-[13px] font-medium text-ink-secondary">Service contact number<input value={profile.contact_number} onChange={(e) => setProfile((p) => ({ ...p, contact_number: e.target.value }))} className="mt-1 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-3 text-[15px] text-ink-primary" /></label>
        {(['region', 'district', 'ward'] as const).map((key) => <label key={key} className="text-[13px] font-medium capitalize text-ink-secondary">{key}<input value={profile[key]} onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))} className="mt-1 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-3 text-[15px] text-ink-primary" /></label>)}
        <div className="sm:col-span-2"><GlassButton type="submit" disabled={saveProfile.isPending}>{saveProfile.isPending ? 'Saving…' : data ? 'Save provider profile' : 'Create provider profile'}</GlassButton></div>
      </form>

      {!!data && <>
        <SectionLabel tone="green">Organization verification</SectionLabel>
        <section className="glass mb-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-semibold text-ink-primary">Provider verification status</div><p className="mt-1 text-[12px] text-ink-secondary">Verified organizations can publish jobs, invite opted-in workers, and review applicant career details.</p></div><Badge tone={verificationQuery.data?.status === 'verified' ? 'green' : verificationQuery.data?.status === 'pending' ? 'yellow' : verificationQuery.data?.status === 'rejected' ? 'red' : 'grey'}>{verificationQuery.data?.status ?? 'unverified'}</Badge></div>
          {verificationQuery.data?.verified_at && <p className="mt-2 text-[11px] text-ink-tertiary">Verified {new Date(verificationQuery.data.verified_at).toLocaleDateString()}</p>}
          {verificationQuery.data?.request?.review_note && <p className="mt-2 rounded-lg bg-accent-warning/10 p-3 text-[12px] text-ink-secondary">Review note: {verificationQuery.data.request.review_note}</p>}
          {verificationQuery.data?.request?.evidence_file_name && verificationQuery.data.status === 'pending' && <p className="mt-3 text-[12px] text-ink-secondary">Evidence submitted: {verificationQuery.data.request.evidence_file_name} ({Math.ceil((verificationQuery.data.request.evidence_size_bytes ?? 0) / 1024)} KB)</p>}
          {verificationQuery.data?.status !== 'verified' && verificationQuery.data?.status !== 'pending' && <form onSubmit={(e) => { e.preventDefault(); requestVerification.mutate(); }} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] font-medium text-ink-secondary">Registered organization name<input required minLength={3} maxLength={200} value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder={data.display_name} className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[14px] text-ink-primary" /></label>
            <label className="text-[12px] font-medium text-ink-secondary">Registration or licence reference<input required minLength={3} maxLength={120} value={registrationReference} onChange={(e) => setRegistrationReference(e.target.value)} className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[14px] text-ink-primary" /></label>
            <label className="text-[12px] font-medium text-ink-secondary sm:col-span-2">Registration document (PDF, JPEG, or PNG; up to 2 MB)<input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => { const file = e.target.files?.[0] ?? null; if (file && file.size > 2 * 1024 * 1024) { toast.error('Document must not exceed 2 MB'); e.target.value = ''; setEvidenceFile(null); return; } if (file && !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { toast.error('Choose a PDF, JPEG, or PNG document'); e.target.value = ''; setEvidenceFile(null); return; } setEvidenceFile(file); }} className="mt-1 block w-full rounded-xl border border-glass-border bg-white/60 px-3 py-2 text-[13px] text-ink-primary file:mr-3 file:rounded-full file:border-0 file:bg-accent-primary/10 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-accent-primary" /></label>
            <label className="text-[12px] font-medium text-ink-secondary sm:col-span-2">Evidence notes<textarea maxLength={3000} value={evidenceNotes} onChange={(e) => setEvidenceNotes(e.target.value)} placeholder="Add context to help reviewers check this document." className="mt-1 min-h-16 w-full rounded-xl border border-glass-border bg-white/55 px-3 py-2 text-[13px] text-ink-primary" /></label>
            <div className="sm:col-span-2"><GlassButton type="submit" disabled={requestVerification.isPending || !evidenceFile}>{requestVerification.isPending ? 'Uploading…' : 'Request provider verification'}</GlassButton></div>
          </form>}
          {verificationQuery.data?.status === 'pending' && <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent-warning/10 p-3 text-[12px] text-ink-secondary"><BadgeCheck size={16} />Your registration details are awaiting platform review. Job posting and candidate search stay locked until approval.</div>}
        </section>
        <SectionLabel tone="green">Employee feedback</SectionLabel>
        {data.members?.length ? <div className="mb-5 space-y-2">{data.members.map((member) => <div key={member.id} className="glass flex flex-wrap items-center justify-between gap-2 p-4"><div className="flex items-center gap-2"><UsersRound size={18} className="text-accent-primary" /><div><div className="font-semibold text-ink-primary">{member.display_name}</div><div className="text-[12px] capitalize text-ink-tertiary">{member.member_type} · private organization feedback</div></div></div><div className="text-right text-[13px] text-ink-secondary">{!member.ratings_available ? 'Feedback disabled for workers under 18' : member.review_count ? <><span className="font-semibold text-ink-primary">★ {member.rating}</span><span className="ml-1">({member.review_count} completed job{member.review_count === 1 ? '' : 's'})</span></> : 'No completed job reviews yet'}</div></div>)}<p className="text-[11px] text-ink-tertiary">Worker ratings are private to your organization and the employee, and are disabled for people under 18. They are not shown in the public service directory.</p></div> : <div className="mb-5 rounded-xl bg-accent-primary/5 p-3 text-[13px] text-ink-secondary">Create employee member accounts to assign work and collect verified feedback.</div>}
        <SectionLabel tone="lavender">Publish a service</SectionLabel>
        <form onSubmit={(e) => { e.preventDefault(); addService.mutate(); }} className="glass space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-[13px] font-medium text-ink-secondary">Service name<input required value={service.title} onChange={(e) => setService((s) => ({ ...s, title: e.target.value }))} placeholder={category === 'garage' ? 'Emergency roadside repair' : category === 'hospital' ? 'Urgent clinic assessment' : 'School admission enquiry'} className="mt-1 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-3 text-[15px] text-ink-primary" /></label>
            <label className="text-[13px] font-medium text-ink-secondary">How is it delivered?<select value={service.delivery_mode} onChange={(e) => setService((s) => ({ ...s, delivery_mode: e.target.value }))} className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[15px] text-ink-primary"><option value="on_demand">On demand</option><option value="appointment">Appointment</option><option value="delivery">Pickup / delivery</option><option value="enrollment">Enrollment</option></select></label>
            <label className="text-[13px] font-medium text-ink-secondary sm:col-span-2">Description<textarea value={service.description} onChange={(e) => setService((s) => ({ ...s, description: e.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-2 text-[15px] text-ink-primary" /></label>
            <label className="text-[13px] font-medium text-ink-secondary">Price type<select value={service.price_type} onChange={(e) => setService((s) => ({ ...s, price_type: e.target.value }))} className="mt-1 w-full rounded-xl border border-glass-border bg-white/60 px-3 py-3 text-[15px] text-ink-primary"><option value="quote_required">Provider quote</option><option value="fixed">Fixed price</option><option value="free">Free</option></select></label>
            {service.price_type === 'fixed' && <label className="text-[13px] font-medium text-ink-secondary">Price (TZS)<input type="number" min="0" value={service.price_amount} onChange={(e) => setService((s) => ({ ...s, price_amount: e.target.value }))} className="mt-1 w-full rounded-xl border border-glass-border bg-white/50 px-3 py-3 text-[15px] text-ink-primary" /></label>}
          </div>

          <div className="rounded-2xl bg-accent-primary/5 p-4">
            <div className="mb-1 flex items-center justify-between gap-2"><div className="font-semibold text-ink-primary">Client request form</div><button type="button" onClick={() => setFields((all) => [...all, { key: '', label: '', type: 'text', required: false }])} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-primary"><CirclePlus size={16} /> Add question</button></div>
            <p className="mb-3 text-[12px] text-ink-secondary">Add only the information you need to respond to this service.</p>
            <div className="space-y-3">
              {fields.map((field, index) => <div key={index} className="grid grid-cols-1 items-end gap-2 rounded-xl bg-white/50 p-3 sm:grid-cols-4">
                <label className="text-[12px] font-medium text-ink-secondary sm:col-span-2">Question<input value={field.label} onChange={(e) => changeField(index, { label: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') })} placeholder="Question for client" className="mt-1 w-full rounded-lg border border-glass-border bg-white/70 px-2 py-2 text-[14px] text-ink-primary" /></label>
                <label className="text-[12px] font-medium text-ink-secondary">Answer type<select value={field.type} onChange={(e) => changeField(index, { type: e.target.value })} className="mt-1 w-full rounded-lg border border-glass-border bg-white/70 px-2 py-2 text-[14px] text-ink-primary"><option value="text">Short text</option><option value="textarea">Long text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Choice</option><option value="checkbox">Yes / No</option></select></label>
                <div className="flex items-center justify-between gap-2"><label className="flex items-center gap-1 text-[12px] text-ink-secondary"><input type="checkbox" checked={!!field.required} onChange={(e) => changeField(index, { required: e.target.checked })} /> Required</label><button type="button" onClick={() => setFields((all) => all.filter((_, i) => i !== index))} className="text-[12px] text-accent-danger">Remove</button></div>
                {field.type === 'select' && <label className="text-[12px] font-medium text-ink-secondary sm:col-span-4">Choices (comma separated)<input value={(field.options ?? []).join(', ')} onChange={(e) => changeField(index, { options: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border border-glass-border bg-white/70 px-2 py-2 text-[14px] text-ink-primary" /></label>}
              </div>)}
            </div>
          </div>
          <GlassButton type="submit" disabled={addService.isPending || !data}>{addService.isPending ? 'Publishing…' : 'Publish service'}</GlassButton>
        </form>

        <SectionLabel tone="yellow">Your services</SectionLabel>
        {data.services?.length ? <div className="space-y-3">{data.services.map((item: any) => <div key={item.id} className="glass flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><div className="font-semibold text-ink-primary">{item.title}</div><div className="mt-1 text-[13px] text-ink-secondary">{item.delivery_mode.replaceAll('_', ' ')} · {(item.form_fields ?? []).length} form questions</div></div><div className="flex items-center gap-2"><Badge tone={item.is_active ? 'green' : 'grey'}>{item.is_active ? 'Published' : 'Paused'}</Badge><button onClick={() => toggleService.mutate({ id: item.id, is_active: !item.is_active })} className="rounded-full px-3 py-2 text-[13px] font-medium text-accent-primary">{item.is_active ? 'Pause' : 'Publish'}</button></div></div>)}</div> : <div className="glass p-5 text-[14px] text-ink-secondary">No services published yet.</div>}
      </>}
      {!isLoading && !data && <div className="mt-4 flex items-center gap-2 rounded-xl bg-accent-warning/10 p-3 text-[13px] text-ink-secondary"><Siren size={17} /> Save your provider profile to unlock the service form and incoming request queue.</div>}
    </div>
  );
}
