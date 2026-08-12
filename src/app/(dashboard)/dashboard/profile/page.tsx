'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, X, UserRound } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { LargeTitleHeader, GlassButton, SectionLabel } from '@/components/ui/GlassCard';
import { IOSListGroup, IOSInput, IOSSelect, IOSTextArea, IOSSwitch, IOSListRow } from '@/components/ui/IOSListGroup';
import { SegmentedControl, EmptyState } from '@/components/ui/Control';

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

  if (isLoading) return <div className="py-10 text-center text-ink-secondary">Loading…</div>;

  return (
    <div>
      <LargeTitleHeader title="Profile" subtitle={`${user?.account_type} account`} />

      {user?.account_type !== 'individual' && entity && (
        <EntityForm entity={entity} onSave={entityMutation.mutate} entityType={user!.account_type} />
      )}

      <SectionLabel>Person profiles</SectionLabel>
      {profiles?.length ? (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {profiles.map((p: any) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`btn-scale shrink-0 rounded-button px-4 py-2 text-[14px] font-medium ${selected?.id === p.id ? 'bg-accent-primary text-white' : 'glass text-ink-secondary'}`}
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

  return (
    <div className="mb-8">
      <SectionLabel>Organization details</SectionLabel>
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
        <IOSInput label="Region" value={form.region ?? ''} onChange={(e) => set('region', e.target.value)} />
        <IOSInput label="District" value={form.district ?? ''} onChange={(e) => set('district', e.target.value)} />
        <IOSInput label="Ward" value={form.ward ?? ''} onChange={(e) => set('ward', e.target.value)} />
        <IOSInput label="Local authority" value={form.local_authority_name ?? ''} onChange={(e) => set('local_authority_name', e.target.value)} />
        <IOSTextArea label="Extra notes" value={form.extra_notes ?? ''} onChange={(e) => set('extra_notes', e.target.value)} />
        <IOSInput label="Contacts" value={form.business_contacts ?? form.school_contacts ?? form.institution_contacts ?? ''} onChange={(e) => set('contacts', e.target.value)} />
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
  });
  const [sub, setSub] = useState<any>({
    health: profile.health ?? {},
    residence: profile.residence ?? {},
    emergency_contacts: profile.emergencyContacts ?? [],
    desperate_conditions: profile.desperateConditions ?? [],
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

  return (
    <div>
      <div className="mb-6">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'basic', label: 'Basic' },
            { value: 'health', label: 'Health' },
            { value: 'residence', label: 'Residence' },
            { value: 'emergency', label: 'Emergency' },
            { value: 'desperate', label: 'Desperate' },
            ...(profile.member_type !== 'underage' ? [{ value: 'employment', label: 'Work' }] : []),
          ]}
        />
      </div>

      {tab === 'basic' && (
        <>
          <IOSListGroup title="Basic details">
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
          <div className="mb-3 px-1">
            <button onClick={addDesperate} className="flex items-center gap-1 rounded-button bg-accent-primary/10 px-3 py-1.5 text-[13px] font-medium text-accent-primary">
              <Plus size={14} /> Add acute condition
            </button>
          </div>
          {sub.desperate_conditions?.map((c: any, i: number) => (
            <IOSListGroup key={i} title={`Acute condition ${i + 1}`}>
              <IOSSelect label="Condition" value={c.acute_condition_code ?? ''} onChange={(v) => updateDesperate(i, 'acute_condition_code', v)}>
                <option value="">—</option>
                {lookups?.acute_conditions?.map((a: any) => (
                  <option key={a.code} value={a.code}>{a.label}</option>
                ))}
              </IOSSelect>
              <IOSTextArea label="Notes" value={c.notes ?? ''} onChange={(e) => updateDesperate(i, 'notes', e.target.value)} />
              <IOSInput label="Treatment hospital" value={c.treatment_hospital ?? ''} onChange={(e) => updateDesperate(i, 'treatment_hospital', e.target.value)} />
              <IOSInput label="Hospital contacts" value={c.hospital_contacts ?? ''} onChange={(e) => updateDesperate(i, 'hospital_contacts', e.target.value)} />
              <IOSInput label="Doctor name" value={c.doctor_name ?? ''} onChange={(e) => updateDesperate(i, 'doctor_name', e.target.value)} />
              <IOSInput label="Doctor contacts" value={c.doctor_contacts ?? ''} onChange={(e) => updateDesperate(i, 'doctor_contacts', e.target.value)} />
            </IOSListGroup>
          ))}
          <GlassButton onClick={() => onSaveSubForms({ desperate_conditions: sub.desperate_conditions })}>Save desperate conditions</GlassButton>
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
      <SectionLabel>New member</SectionLabel>
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
