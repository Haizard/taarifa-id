'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { QRCode } from 'react-qr-code';
import { Printer, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { LargeTitleHeader, GlassButton, SectionLabel } from '@/components/ui/GlassCard';
import { IOSListGroup, IOSListRow, IOSSwitch } from '@/components/ui/IOSListGroup';

export default function PrintablePage() {
  const { user } = useAuthStore();
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [cardUrl, setCardUrl] = useState('');

  useEffect(() => {
    api
      .get<{ included_fields: string[] }>('/printable/fields')
      .then((d) => setSelectedFields(d.included_fields ?? []))
      .catch(() => {});
  }, []);

  const { data: profiles } = useQuery({ queryKey: ['profiles', user?.sub], queryFn: () => api.get('/profiles'), enabled: !!user });

  const current = profiles?.find((p: any) => p.id === selectedProfileId) ?? profiles?.[0];

  // Per-member QR so each printed card opens that member's own public URL.
  // Falls back to the account-level URL for legacy rows with no profile_code.
  useEffect(() => {
    if (!current) return;
    const target = current.profile_code
      ? `${window.location.origin}/profile/by-code/${current.profile_code}`
      : `${window.location.origin}/profile/${user?.profile_id}`;
    setCardUrl(target);
  }, [current, user?.profile_id]);

  const saveFields = (fields: string[]) => {
    api
      .put('/printable/fields', { included_fields: fields })
      .catch(() => toast.error('Failed to save card visibility settings'));
  };

  const toggleField = (k: string) =>
    setSelectedFields((s) => {
      const next = s.includes(k) ? s.filter((x) => x !== k) : [...s, k];
      saveFields(next);
      return next;
    });

  const handlePrint = () => {
    toast.success('Opening print dialog…');
    setTimeout(() => window.print(), 300);
  };

  const FIELD_KEYS = ['first_name', 'last_name', 'gender', 'birthdate', 'nationality', 'fluent_language', 'blood_group', 'region', 'district', 'ward'];

  const FIELD_LABELS: Record<string, string> = {
    first_name: 'First name',
    last_name: 'Last name',
    gender: 'Gender',
    birthdate: 'Birth year',
    nationality: 'Nationality',
    fluent_language: 'Language',
    blood_group: 'Blood group',
    region: 'Region',
    district: 'District',
    ward: 'Ward',
  };

  const fieldValue = (p: any, k: string): string | null => {
    if (!p) return null;
    if (k === 'blood_group') return p.health?.blood_group ?? null;
    if (k === 'region' || k === 'district' || k === 'ward') return p.residence?.[k] ?? null;
    if (k === 'birthdate' && p.birthdate) return String(new Date(p.birthdate).getFullYear());
    return p[k] ?? null;
  };

  const optionalFields = selectedFields.filter((k) => k !== 'first_name' && k !== 'last_name');

  return (
    <div>
      <LargeTitleHeader title="ID Card" subtitle="Printable card preview" />

      <SectionLabel tone="blue">Profile</SectionLabel>
      <IOSListGroup>
        {profiles?.length > 1 && (
          <IOSListRow label="Profile">
            <select
              className="bg-transparent text-right text-[17px] text-ink-primary focus:outline-none"
              value={current?.id ?? ''}
              onChange={(e) => setSelectedProfileId(e.target.value)}
            >
              {profiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </IOSListRow>
        )}
        <IOSListRow label="Profile ID" value={user?.profile_id} />
      </IOSListGroup>

      <SectionLabel tone="lavender">Card preview</SectionLabel>
      <div className="flex justify-center">
        <div className="print-area relative w-full max-w-sm overflow-hidden rounded-[20px] p-6 shadow-glass" style={{ background: 'linear-gradient(135deg, #4DA3FF, #A78BFA)' }}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10" />
          <div className="relative text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/25">
                  {current?.pic_url ? (
                    <img src={current.pic_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound size={24} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="break-words text-[18px] font-bold leading-tight">
                    {current?.first_name} {current?.last_name}
                  </div>
                  <div className="text-[12px] capitalize text-white/80">{current?.member_type}</div>
                </div>
              </div>
              <div className="ml-2 shrink-0 rounded-xl bg-white p-1.5">
                {cardUrl && <QRCode value={cardUrl} size={72} />}
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-white/15 px-4 py-3 text-center font-mono text-[16px] font-semibold tracking-widest">
              {user?.profile_id}
            </div>
            {optionalFields.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-white/90">
                {optionalFields.map((k) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-white/60">{FIELD_LABELS[k]}</span>
                    <span className="truncate font-medium capitalize">{fieldValue(current, k) ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SectionLabel tone="yellow">Fields to print (optional on card)</SectionLabel>
      <IOSListGroup>
        {FIELD_KEYS.map((k) => (
          <IOSListRow key={k} label={k.replace(/_/g, ' ')}>
            <IOSSwitch checked={selectedFields.includes(k)} onChange={() => toggleField(k)} />
          </IOSListRow>
        ))}
      </IOSListGroup>

      <div className="mt-2">
        <GlassButton onClick={handlePrint}>
          <span className="flex items-center justify-center gap-2">
            <Printer size={18} /> Print ID card
          </span>
        </GlassButton>
      </div>

      <div className="mt-6 text-center text-[12px] text-ink-tertiary">
        Profile Code and QR code are always printed. Mandatory fields cannot be hidden.
      </div>
    </div>
  );
}
