'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, X, UserRound, Camera, ShieldCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { MAX_PHOTO_BYTES, fileToResizedDataUrl } from '@/lib/image';
import { LargeTitleHeader, GlassButton, SectionLabel } from '@/components/ui/GlassCard';
import { IOSListGroup, IOSInput, IOSSelect, IOSTextArea, IOSSwitch, IOSListRow } from '@/components/ui/IOSListGroup';
import { EmptyState } from '@/components/ui/Control';

const ACCOUNT_TYPES = {
  individual: { memberTypes: ['self'] },
  family: { memberTypes: ['self', 'adult', 'underage'] },
  school: { memberTypes: ['self', 'student', 'employee'] },
  business: { memberTypes: ['self', 'employee'] },
  institution: { memberTypes: ['self', 'employee'] },
};

export default function ProfileEditor() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(params.get('id'));

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['profiles', user?.sub],
    queryFn: () => api.get('/profiles'),
    enabled: !!user,
  });

  const { data: entity, refetch: refetchEntity } = useQuery({
    queryKey: ['entity', user?.sub],
    queryFn: () => api.get('/profiles/entity').catch(() => null),
    enabled: !!user && user.account_type !== 'individual',
  });

  const { data: lookups } = useQuery({ queryKey: ['lookups'], queryFn: () => api.get('/lookups') });

  const selected = profiles?.find((p: any) => p.id === selectedId) ?? profiles?.[0];

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put(`/profiles/${selected.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const subFormsMutation = useMutation({
    mutationFn: (data: any) => api.put(`/profiles/${selected.id}/sub-forms`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Details saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const entityMutation = useMutation({
    mutationFn: (data: any) => api.put('/profiles/entity', data),
    onSuccess: () => {
      refetchEntity();
      toast.success('Organization details saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createMemberMutation = useMutation({
    mutationFn: (data: any) => api.post('/profiles/members', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Member created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bootstrapMutation = useMutation({
    mutationFn: () => api.post('/profiles/self-bootstrap'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile created — you can now edit your details');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-10 text-center text-ink-secondary">Loading…</div>;

  const isIndividual = user?.account_type === 'individual';
  const needsBootstrap = isIndividual && (profiles?.length ?? 0) === 0;

  return (
    <div className="min-w-0">
      <LargeTitleHeader title="Profile" subtitle={`${user?.account_type} account`} />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-emerald-950">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700"><ShieldCheck size={18} /></span>
        <div><div className="text-sm font-bold">Your profile details stay under your control</div><p className="mt-1 text-[13px] leading-5 text-emerald-950/75">Profile details are not attached to service requests. A request shares the answers and location you enter for that request. Public ID and QR profile visibility is managed separately.</p></div>
      </div>

      {user?.account_type !== 'individual' && entity && (
        <EntityForm entity={entity} onSave={entityMutation.mutate} entityType={user!.account_type} />
      )}

      <SectionLabel tone="blue">Person profiles</SectionLabel>
      {user?.account_type !== 'individual' && <p className="mb-3 px-1 text-[13px] leading-5 text-slate-500">Choose a person below to edit their details. Each person has separate health, medical condition, residence, and vehicle records. If no person is listed, add one with the button below.</p>}
      {needsBootstrap ? (
        <div className="glass mb-4 rounded-button p-4 text-[14px] text-ink-secondary">
          <p className="mb-3">Your account doesn't have a personal profile yet. Create one to start saving your details and ID card.</p>
          <GlassButton onClick={() => bootstrapMutation.mutate()} disabled={bootstrapMutation.isPending}>
            {bootstrapMutation.isPending ? 'Creating…' : 'Create my profile'}
          </GlassButton>
        </div>
      ) : profiles?.length ? (
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-2">
          {profiles.map((p: any) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`btn-scale shrink-0 whitespace-nowrap rounded-button px-4 py-2 text-[14px] font-medium ${selected?.id === p.id ? 'bg-accent-primary text-white' : 'glass text-ink-secondary'}`}
            >
              {p.first_name} {p.last_name} · {p.member_type}
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={<UserRound size={28} />} title="No profiles yet" />
      )}

      {selected && (
        <ProfileForm
          key={selected.id}
          profile={selected}
          lookups={lookups}
          onSaveBasic={(d) => saveMutation.mutate(d)}
          onSaveSubForms={(d) => subFormsMutation.mutate(d)}
        />
      )}

      {user?.account_type !== 'individual' && (
        <CreateMemberForm accountType={user!.account_type} onCreate={createMemberMutation.mutate} />
      )}
    </div>
  );
}

function EntityForm({ entity, onSave, entityType }: { entity: any; onSave: (d: any) => void; entityType: string }) {
  const [form, setForm] = useState<any>(entity ?? {});
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  const nameKey =
    entityType === 'family' ? 'family_name' : entityType === 'school' ? 'school_name' : entityType === 'business' ? 'business_name' : 'institution_name';
  const label = entityType === 'family' ? 'Family name' : entityType === 'school' ? 'School name' : entityType === 'business' ? 'Business name' : 'Institution name';
  const contactsKey = entityType === 'school' ? 'school_contacts' : entityType === 'business' ? 'business_contacts' : entityType === 'institution' ? 'institution_contacts' : null;
  const logoKey = entityType === 'school' ? 'school_logo_url' : entityType === 'business' ? 'business_logo_url' : entityType === 'institution' ? 'institution_logo_url' : null;

  return (
    <div className="mb-8 min-w-0">
      <SectionLabel tone="lavender">Organization details</SectionLabel>
      <IOSListGroup>
        <IOSInput label={label} value={form[nameKey] ?? ''} onChange={(e) => set(nameKey, e.target.value)} />
        {entityType === 'school' && (
          <>
            <IOSInput label="Registration number" value={form.registration_number ?? ''} onChange={(e) => set('registration_number', e.target.value)} />
            <IOSSelect label="Ownership" value={form.ownership ?? 'private'} onChange={(v) => set('ownership', v)}>
              <option value="private">Private</option>
              <option value="government">Government</option>
              <option value="religious">Religious</option>
            </IOSSelect>
          </>
        )}
        {(entityType === 'business' || entityType === 'institution') && (
          <>
            <IOSInput label="Dealership" value={form.dealership ?? ''} onChange={(e) => set('dealership', e.target.value)} />
            <IOSInput label="TIN number" value={form.tin_number ?? ''} onChange={(e) => set('tin_number', e.target.value)} />
          </>
        )}
        {logoKey && <IOSInput label="Organization logo URL or path" type="text" value={form[logoKey] ?? ''} onChange={(e) => set(logoKey, e.target.value)} placeholder="https://… or /images/providers/logo.svg" />}
        <IOSInput label="Region" value={form.region ?? ''} onChange={(e) => set('region', e.target.value)} />
        <IOSInput label="District" value={form.district ?? ''} onChange={(e) => set('district', e.target.value)} />
        <IOSInput label="Ward" value={form.ward ?? ''} onChange={(e) => set('ward', e.target.value)} />
        <IOSInput label="Local authority" value={form.local_authority_name ?? ''} onChange={(e) => set('local_authority_name', e.target.value)} />
        <IOSTextArea label="Extra notes" value={form.extra_notes ?? form.extra_physical_details ?? ''} onChange={(e) => set('extra_notes', e.target.value)} />
        {contactsKey && (
          <IOSInput label="Contacts" value={form[contactsKey] ?? ''} onChange={(e) => set(contactsKey, e.target.value)} />
        )}
      </IOSListGroup>
      <GlassButton variant="secondary" className="mt-2" onClick={() => onSave(form)}>
        Save organization details
      </GlassButton>
    </div>
  );
}

function ProfileForm({ profile, lookups, onSaveBasic, onSaveSubForms }: { profile: any; lookups: any; onSaveBasic: (d: any) => void; onSaveSubForms: (d: any) => void }) {
  const [tab, setTab] = useState('basic');
  const [basic, setBasic] = useState({
    first_name: profile.first_name ?? '',
    middle_name: profile.middle_name ?? '',
    last_name: profile.last_name ?? '',
    gender: profile.gender ?? 'Male',
    birthdate: profile.birthdate ? String(profile.birthdate).slice(0, 10) : '',
    nationality: profile.nationality ?? 'Tanzanian',
    nida_number: profile.nida_number ?? '',
    passport_number: profile.passport_number ?? '',
    fluent_language: profile.fluent_language ?? '',
    pic_url: profile.pic_url ?? '',
  });
  const photoInputRef = useRef<HTMLInputElement>(null);

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > MAX_PHOTO_BYTES) return toast.error('Photo must not exceed 1MB');
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setBasic((b) => ({ ...b, pic_url: dataUrl }));
    } catch {
      toast.error('Could not read that image');
    }
  };
  const [sub, setSub] = useState<any>({
    health: profile.health ?? {},
    residence: profile.residence ?? {},
    emergency_contacts: profile.emergencyContacts ?? [],
    desperate_conditions: profile.desperateConditions ?? [],
    assets: profile.assets ?? [],
    employment: profile.employment
      ? { employment_type: profile.employment.employment_type, employer: profile.employment.employers?.[0] ?? {}, supervisor: profile.employment.supervisors?.[0] ?? {} }
      : { employment_type: 'Not_Working', employer: {}, supervisor: {} },
  });

  const setBasicField = (k: string, v: string) => setBasic((b) => ({ ...b, [k]: v }));
  const setHealth = (k: string, v: string) => setSub((s: any) => ({ ...s, health: { ...s.health, [k]: v } }));
  const setRes = (k: string, v: string) => setSub((s: any) => ({ ...s, residence: { ...s.residence, [k]: v } }));
  const setEmp = (k: string, v: string) => setSub((s: any) => ({ ...s, employment: { ...s.employment, [k]: v } }));
  const setEmployer = (k: string, v: string) =>
    setSub((s: any) => ({ ...s, employment: { ...s.employment, employer: { ...s.employment.employer, [k]: v } } }));
  const setSupervisor = (k: string, v: string) =>
    setSub((s: any) => ({ ...s, employment: { ...s.employment, supervisor: { ...s.employment.supervisor, [k]: v } } }));

  const notWorking = sub.employment?.employment_type === 'Not_Working';

  const updateEmergency = (i: number, k: string, v: string) =>
    setSub((s: any) => {
      const list = [...(s.emergency_contacts ?? [])];
      if (!list[i]) list[i] = {};
      list[i] = { ...list[i], [k]: v };
      return { ...s, emergency_contacts: list };
    });
  const removeEmergency = (i: number) =>
    setSub((s: any) => ({ ...s, emergency_contacts: (s.emergency_contacts ?? []).filter((_: any, j: number) => j !== i) }));
  const addEmergency = () => setSub((s: any) => ({ ...s, emergency_contacts: [...(s.emergency_contacts ?? []), {}] }));

  const updateDesperate = (i: number, k: string, v: string) =>
    setSub((s: any) => {
      const list = [...(s.desperate_conditions ?? [])];
      if (!list[i]) list[i] = {};
      list[i] = { ...list[i], [k]: v };
      return { ...s, desperate_conditions: list };
    });
  const addDesperate = () => setSub((s: any) => ({ ...s, desperate_conditions: [...(s.desperate_conditions ?? []), {}] }));
  const removeDesperate = (i: number) => setSub((s: any) => ({ ...s, desperate_conditions: (s.desperate_conditions ?? []).filter((_: any, j: number) => j !== i) }));
  const updateVehicle = (i: number, k: string, v: string) => setSub((s: any) => {
    const assets = [...(s.assets ?? [])];
    const current = assets[i] ?? { asset_type: 'vehicle', label: `Vehicle ${i + 1}`, details: {} };
    assets[i] = { ...current, asset_type: 'vehicle', details: { ...(current.details ?? {}), [k]: v } };
    return { ...s, assets };
  });
  const addVehicle = () => setSub((s: any) => ({ ...s, assets: [...(s.assets ?? []), { asset_type: 'vehicle', label: `Vehicle ${(s.assets?.length ?? 0) + 1}`, details: {} }] }));
  const removeVehicle = (i: number) => setSub((s: any) => ({ ...s, assets: (s.assets ?? []).filter((_: any, j: number) => j !== i) }));

  return (
    <div>
      <div className="mb-6">
        <div role="tablist" aria-label="Person profile details" className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { value: 'basic', label: 'Basic' },
            { value: 'health', label: 'Health' },
            { value: 'residence', label: 'Residence' },
            { value: 'emergency', label: 'Emergency' },
            { value: 'desperate', label: 'Medical' },
            { value: 'vehicles', label: 'Vehicles' },
            ...(profile.member_type !== 'underage' ? [{ value: 'employment', label: 'Work' }] : []),
          ].map((item) => <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)} className={`min-h-10 rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:text-[13px] ${tab === item.value ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'}`}>{item.label}</button>)}
        </div>
      </div>

      {tab === 'basic' && (
        <>
          <IOSListGroup title="Basic details">
            <div className="flex flex-col items-center gap-2 border-b border-separator px-4 py-4 last:border-b-0">
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-glass-subtle text-ink-tertiary"
              >
                {basic.pic_url ? (
                  <img src={basic.pic_url} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={36} />
                )}
                <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary text-white">
                  <Camera size={14} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="text-[13px] font-medium text-accent-primary"
              >
                {basic.pic_url ? 'Change photo' : 'Add photo (max 1MB)'}
              </button>
            </div>
            <IOSInput label="First name" value={basic.first_name} onChange={(e) => setBasicField('first_name', e.target.value)} />
            <IOSInput label="Middle name" value={basic.middle_name} onChange={(e) => setBasicField('middle_name', e.target.value)} />
            <IOSInput label="Last name" value={basic.last_name} onChange={(e) => setBasicField('last_name', e.target.value)} />
            <IOSSelect label="Gender" value={basic.gender} onChange={(v) => setBasicField('gender', v)}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </IOSSelect>
            <IOSInput label="Birthdate" type="date" value={basic.birthdate} onChange={(e) => setBasicField('birthdate', e.target.value)} />
            <IOSSelect label="Nationality" value={basic.nationality} onChange={(v) => setBasicField('nationality', v)}>
              <option value="Tanzanian">Tanzanian</option>
              <option value="Foreign">Foreign</option>
            </IOSSelect>
            {basic.nationality === 'Tanzanian' ? (
              <IOSInput label="NIDA number" value={basic.nida_number} onChange={(e) => setBasicField('nida_number', e.target.value)} />
            ) : (
              <IOSInput label="Passport number" value={basic.passport_number} onChange={(e) => setBasicField('passport_number', e.target.value)} />
            )}
            <IOSInput label="Fluent language" value={basic.fluent_language} onChange={(e) => setBasicField('fluent_language', e.target.value)} />
          </IOSListGroup>
          <GlassButton onClick={() => onSaveBasic(basic)}>Save basic details</GlassButton>
        </>
      )}

      {tab === 'health' && (
        <>
          <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-[13px] leading-5 text-sky-950"><strong>Health information and sharing.</strong> Health details are not automatically attached to service requests. Basic blood group, height, and weight may appear on the public ID/QR profile under existing visibility settings. Detailed condition records below are excluded from public QR profiles.</div>
          <IOSListGroup title="Basic health details">
            <IOSSelect label="Blood group" value={sub.health?.blood_group ?? ''} onChange={(v) => setHealth('blood_group', v)}>
              <option value="">—</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </IOSSelect>
            <IOSInput label="Height (cm)" inputMode="numeric" value={sub.health?.height ?? ''} onChange={(e) => setHealth('height', e.target.value)} />
            <IOSInput label="Weight (kg)" inputMode="numeric" value={sub.health?.weight ?? ''} onChange={(e) => setHealth('weight', e.target.value)} />
          </IOSListGroup>
          <GlassButton onClick={() => onSaveSubForms({ health: sub.health })}>Save health details</GlassButton>
        </>
      )}

      {tab === 'vehicles' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
            <div><div className="text-sm font-bold text-emerald-950">Your vehicle records</div><p className="mt-1 text-[13px] leading-5 text-emerald-950/75">Keep details ready for breakdown, repair, towing, or recovery requests. These records stay on your profile and are not automatically sent to garages.</p></div>
            <button type="button" onClick={addVehicle} disabled={(sub.assets?.length ?? 0) >= 20} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[13px] font-semibold text-emerald-800 disabled:opacity-50"><Plus size={15}/> Add vehicle</button>
          </div>
          {!sub.assets?.length && <div className="mb-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center"><div className="font-semibold text-slate-800">No vehicles added</div><p className="mt-1 text-[13px] text-slate-500">Add a car or other vehicle so its details are easy to use when requesting roadside help.</p></div>}
          <div className="space-y-4">{sub.assets?.map((asset: any, i: number) => <section key={asset.id ?? i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div className="font-semibold text-slate-900">{asset.details?.make_model || `Vehicle ${i + 1}`}</div><button type="button" onClick={() => removeVehicle(i)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Remove</button></div><div className="grid gap-3 p-4 sm:grid-cols-2">
            {[['make_model','Make and model'],['year','Year'],['registration_number','Registration number'],['vehicle_type','Vehicle type'],['color','Color'],['condition','Current condition'],['current_issue','Current issue or warning'],['notes','Other useful details']].map(([key,label])=><label key={key} className={`block text-xs font-semibold text-slate-500 ${key === 'current_issue' || key === 'notes' ? 'sm:col-span-2' : ''}`}>{label}{key === 'notes' || key === 'current_issue' ? <textarea value={asset.details?.[key] ?? ''} onChange={(e) => updateVehicle(i,key,e.target.value)} maxLength={2000} className="mt-1.5 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"/> : <input value={asset.details?.[key] ?? ''} onChange={(e) => updateVehicle(i,key,e.target.value)} maxLength={160} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"/>}</label>)}
          </div></section>)}</div>
          {!!sub.assets?.length && <GlassButton className="mt-4" onClick={() => onSaveSubForms({ assets: sub.assets.map((asset: any, i: number) => ({ ...asset, asset_type: 'vehicle', label: asset.details?.make_model?.trim() || `Vehicle ${i + 1}` })) })}>Save vehicle details</GlassButton>}
        </>
      )}

      {tab === 'residence' && (
        <>
          <IOSListGroup title="Residence">
            <IOSInput label="Region" value={sub.residence?.region ?? ''} onChange={(e) => setRes('region', e.target.value)} />
            <IOSInput label="District" value={sub.residence?.district ?? ''} onChange={(e) => setRes('district', e.target.value)} />
            <IOSInput label="Ward" value={sub.residence?.ward ?? ''} onChange={(e) => setRes('ward', e.target.value)} />
            <IOSInput label="Local authority" value={sub.residence?.local_authority_name ?? ''} onChange={(e) => setRes('local_authority_name', e.target.value)} />
            <IOSInput label="Street" value={sub.residence?.street ?? ''} onChange={(e) => setRes('street', e.target.value)} />
            <IOSTextArea label="Extra physical details" value={sub.residence?.extra_physical_details ?? ''} onChange={(e) => setRes('extra_physical_details', e.target.value)} />
            <IOSInput label="Neighborhood friend name" value={sub.residence?.neighborhood_friend_name ?? ''} onChange={(e) => setRes('neighborhood_friend_name', e.target.value)} />
            <IOSInput label="Neighborhood friend contacts" value={sub.residence?.neighborhood_friend_contacts ?? ''} onChange={(e) => setRes('neighborhood_friend_contacts', e.target.value)} />
          </IOSListGroup>
          <GlassButton onClick={() => onSaveSubForms({ residence: sub.residence })}>Save residence</GlassButton>
        </>
      )}

      {tab === 'emergency' && (
        <>
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[13px] text-ink-secondary">Up to 3 contacts · 1st = Prime</span>
            {(sub.emergency_contacts?.length ?? 0) < 3 && (
              <button onClick={addEmergency} className="flex items-center gap-1 rounded-button bg-accent-primary/10 px-3 py-1.5 text-[13px] font-medium text-accent-primary">
                <Plus size={14} /> Add
              </button>
            )}
          </div>
          {sub.emergency_contacts?.map((c: any, i: number) => (
            <IOSListGroup key={i} title={`Contact ${i + 1}${i === 0 ? ' (Prime)' : ''}`}>
              {i > 0 && (
                <button onClick={() => removeEmergency(i)} className="flex items-center gap-1 px-4 py-2 text-[13px] text-accent-danger">
                  <X size={14} /> Remove
                </button>
              )}
              <IOSInput label="Full name" value={c.full_name ?? ''} onChange={(e) => updateEmergency(i, 'full_name', e.target.value)} />
              <IOSInput label="Mobile 1" inputMode="tel" value={c.mobile_1 ?? ''} onChange={(e) => updateEmergency(i, 'mobile_1', e.target.value)} />
              <IOSInput label="Mobile 2" inputMode="tel" value={c.mobile_2 ?? ''} onChange={(e) => updateEmergency(i, 'mobile_2', e.target.value)} />
              <IOSInput label="Alt number 1" inputMode="tel" value={c.alt_number_1 ?? ''} onChange={(e) => updateEmergency(i, 'alt_number_1', e.target.value)} />
              <IOSInput label="Alt number 2" inputMode="tel" value={c.alt_number_2 ?? ''} onChange={(e) => updateEmergency(i, 'alt_number_2', e.target.value)} />
              <IOSSelect label="Relation" value={c.relation_type ?? ''} onChange={(v) => updateEmergency(i, 'relation_type', v)}>
                <option value="">—</option>
                {['Mother', 'Father', 'Son', 'Daughter', 'Husband', 'Wife', 'Guardian', 'Grandfather', 'Grandmother', 'Next_of_Kin', 'Employer', 'Friend'].map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </IOSSelect>
              <IOSInput label="Region" value={c.region ?? ''} onChange={(e) => updateEmergency(i, 'region', e.target.value)} />
              <IOSInput label="District" value={c.district ?? ''} onChange={(e) => updateEmergency(i, 'district', e.target.value)} />
              <IOSTextArea label="Extra notes" value={c.extra_notes ?? ''} onChange={(e) => updateEmergency(i, 'extra_notes', e.target.value)} />
            </IOSListGroup>
          ))}
          <GlassButton onClick={() => onSaveSubForms({ emergency_contacts: sub.emergency_contacts })}>Save emergency contacts</GlassButton>
        </>
      )}

      {tab === 'desperate' && (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
            <div><div className="text-sm font-bold text-rose-950">Detailed medical conditions</div><p className="mt-1 max-w-2xl text-[13px] leading-5 text-rose-950/75">Add any illness or condition in your own words, including HIV, malaria, cancer, or another diagnosis. Record only what you choose. These detailed records are not shown on public QR profiles or automatically attached to service requests.</p><p className="mt-2 text-[12px] leading-5 text-rose-950/75">To tell a hospital, enter the relevant details in that hospital service’s request form. Review each form and share only information you are comfortable sending.</p></div>
            <button type="button" onClick={addDesperate} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-[13px] font-semibold text-rose-800 hover:bg-rose-50">
              <Plus size={14} /> Add health condition
            </button>
          </div>
          <datalist id="acute-condition-options">{lookups?.acute_conditions?.map((a: any) => <option key={a.code} value={a.label}>{a.label}</option>)}</datalist>
          {sub.desperate_conditions?.map((c: any, i: number) => (
            <IOSListGroup key={c.id ?? i} title={`Condition ${i + 1}`}>
              <div className="flex justify-end border-b border-slate-100 px-4 py-2"><button type="button" onClick={() => removeDesperate(i)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"><X size={13}/> Remove condition</button></div>
              <IOSInput label="Condition or illness" maxLength={100} list="acute-condition-options" placeholder="Enter a condition name" value={c.acute_condition_code ?? ''} onChange={(e) => updateDesperate(i, 'acute_condition_code', e.target.value)} />
              <IOSInput label="Current status" maxLength={100} placeholder="For example: current, in treatment, follow-up, resolved" value={c.condition_status ?? ''} onChange={(e) => updateDesperate(i, 'condition_status', e.target.value)} />
              <IOSInput label="Stage or severity (if known)" maxLength={100} placeholder="Enter details provided by your clinician" value={c.stage ?? ''} onChange={(e) => updateDesperate(i, 'stage', e.target.value)} />
              <IOSInput label="Date diagnosed (optional)" type="date" value={c.diagnosed_on ?? ''} onChange={(e) => updateDesperate(i, 'diagnosed_on', e.target.value)} />
              <IOSTextArea label="Symptoms, history, or other details" maxLength={5000} value={c.notes ?? ''} onChange={(e) => updateDesperate(i, 'notes', e.target.value)} />
              <IOSTextArea label="Onset or recurrence details" maxLength={2000} value={c.occurrence ?? ''} onChange={(e) => updateDesperate(i, 'occurrence', e.target.value)} />
              <IOSTextArea label="Treatment, medication, or care plan" maxLength={5000} value={c.treatment_details ?? ''} onChange={(e) => updateDesperate(i, 'treatment_details', e.target.value)} />
              <IOSTextArea label="Emergency instructions (optional)" maxLength={2000} value={c.unconscious_treatment_remedy ?? ''} onChange={(e) => updateDesperate(i, 'unconscious_treatment_remedy', e.target.value)} />
              <IOSInput label="Treatment hospital" value={c.treatment_hospital ?? ''} onChange={(e) => updateDesperate(i, 'treatment_hospital', e.target.value)} />
              <IOSInput label="Hospital contacts" value={c.hospital_contacts ?? ''} onChange={(e) => updateDesperate(i, 'hospital_contacts', e.target.value)} />
              <IOSInput label="Doctor name" value={c.doctor_name ?? ''} onChange={(e) => updateDesperate(i, 'doctor_name', e.target.value)} />
              <IOSInput label="Doctor contacts" value={c.doctor_contacts ?? ''} onChange={(e) => updateDesperate(i, 'doctor_contacts', e.target.value)} />
            </IOSListGroup>
          ))}
          {!sub.desperate_conditions?.length && <div className="mb-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center"><div className="font-semibold text-slate-800">No medical conditions recorded</div><p className="mt-1 text-[13px] text-slate-500">Add a condition only if you want it kept in your private profile.</p></div>}
          <GlassButton onClick={() => onSaveSubForms({ desperate_conditions: sub.desperate_conditions })}>Save medical details</GlassButton>
        </>
      )}

      {tab === 'employment' && (
        <>
          <IOSListGroup title="Employment">
            <IOSSelect label="Employment type" value={sub.employment?.employment_type ?? 'Not_Working'} onChange={(v) => setEmp('employment_type', v)}>
              {['Government', 'Foreign_Government', 'Foreign_Agency', 'Company', 'Cooperate', 'Self_Employed', 'Not_Working'].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </IOSSelect>
          </IOSListGroup>

          {notWorking ? (
            <div className="mb-4 rounded-button bg-glass-subtle px-4 py-3 text-[14px] text-ink-secondary">
              Employment details locked — you selected Not Working.
            </div>
          ) : (
            <>
              <IOSListGroup title="Employer">
                <IOSInput label="Employer name" value={sub.employment?.employer?.employer_name ?? ''} onChange={(e) => setEmployer('employer_name', e.target.value)} />
                <IOSInput label="Position" value={sub.employment?.employer?.position_lov ?? ''} onChange={(e) => setEmployer('position_lov', e.target.value)} />
                <IOSInput label="Region" value={sub.employment?.employer?.region ?? ''} onChange={(e) => setEmployer('region', e.target.value)} />
                <IOSInput label="District" value={sub.employment?.employer?.district ?? ''} onChange={(e) => setEmployer('district', e.target.value)} />
                <IOSInput label="Office contacts" value={sub.employment?.employer?.office_contacts ?? ''} onChange={(e) => setEmployer('office_contacts', e.target.value)} />
              </IOSListGroup>
              <IOSListGroup title="Supervisor">
                <IOSInput label="Supervisor name" value={sub.employment?.supervisor?.supervisor_name ?? ''} onChange={(e) => setSupervisor('supervisor_name', e.target.value)} />
                <IOSInput label="Supervisor contacts 1" value={sub.employment?.supervisor?.supervisor_contacts_1 ?? ''} onChange={(e) => setSupervisor('supervisor_contacts_1', e.target.value)} />
                <IOSInput label="Supervisor contacts 2" value={sub.employment?.supervisor?.supervisor_contacts_2 ?? ''} onChange={(e) => setSupervisor('supervisor_contacts_2', e.target.value)} />
                <IOSInput label="Close friend name" value={sub.employment?.supervisor?.close_friend_name ?? ''} onChange={(e) => setSupervisor('close_friend_name', e.target.value)} />
                <IOSInput label="Close friend contacts" value={sub.employment?.supervisor?.close_friend_contacts ?? ''} onChange={(e) => setSupervisor('close_friend_contacts', e.target.value)} />
              </IOSListGroup>
            </>
          )}
          <GlassButton onClick={() => onSaveSubForms({ employment: sub.employment })}>Save employment</GlassButton>
        </>
      )}
    </div>
  );
}

function CreateMemberForm({ accountType, onCreate }: { accountType: string; onCreate: (d: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    member_type: accountType === 'family' ? 'adult' : accountType === 'school' ? 'student' : 'employee',
    first_name: '',
    last_name: '',
    gender: 'Male',
    birthdate: '',
    nationality: 'Tanzanian',
    nida_number: '',
    passport_number: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!open) {
    return (
      <div className="mt-8">
        <GlassButton variant="secondary" onClick={() => setOpen(true)}>
          <span className="flex items-center justify-center gap-2">
            <Plus size={18} /> Add a member
          </span>
        </GlassButton>
      </div>
    );
  }

  const memberOptions =
    accountType === 'family'
      ? [['adult', 'Adult'], ['underage', 'Underage']]
      : accountType === 'school'
        ? [['student', 'Student'], ['employee', 'Employee']]
        : [['employee', 'Employee']];

  return (
    <div className="mt-8">
      <SectionLabel tone="yellow">New member</SectionLabel>
      <IOSListGroup>
        <IOSSelect label="Member type" value={form.member_type} onChange={(v) => set('member_type', v)}>
          {memberOptions.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </IOSSelect>
        <IOSInput label="First name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
        <IOSInput label="Last name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
        <IOSSelect label="Gender" value={form.gender} onChange={(v) => set('gender', v)}>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </IOSSelect>
        <IOSInput label="Birthdate" type="date" value={form.birthdate} onChange={(e) => set('birthdate', e.target.value)} />
        <IOSSelect label="Nationality" value={form.nationality} onChange={(v) => set('nationality', v)}>
          <option value="Tanzanian">Tanzanian</option>
          <option value="Foreign">Foreign</option>
        </IOSSelect>
        {form.nationality === 'Tanzanian' ? (
          <IOSInput label="NIDA number" value={form.nida_number} onChange={(e) => set('nida_number', e.target.value)} />
        ) : (
          <IOSInput label="Passport number" value={form.passport_number} onChange={(e) => set('passport_number', e.target.value)} />
        )}
      </IOSListGroup>
      <GlassButton
        onClick={() => {
          if (!form.first_name || !form.last_name || !form.birthdate) return toast.error('Complete required fields');
          onCreate(form);
          setOpen(false);
          setForm({ ...form, first_name: '', last_name: '', nida_number: '' });
        }}
      >
        Create member
      </GlassButton>
    </div>
  );
}
