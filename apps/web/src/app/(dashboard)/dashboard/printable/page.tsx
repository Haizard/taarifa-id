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
    if (user?.profile_id) setCardUrl(`${window.location.origin}/profile/${user.profile_id}`);
  }, [user]);

  const { data: profiles } = useQuery({ queryKey: ['profiles', user?.sub], queryFn: () => api.get('/profiles'), enabled: !!user });

  const current = profiles?.find((p: any) => p.id === selectedProfileId) ?? profiles?.[0];

  const toggleField = (k: string) =>
    setSelectedFields((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const handlePrint = () => {
    toast.success('Opening print dialog…');
    setTimeout(() => window.print(), 300);
  };

  const FIELD_KEYS = ['first_name', 'last_name', 'gender', 'birthdate', 'nationality', 'fluent_language', 'blood_group', 'region', 'district', 'ward'];

  return (
    <div>
      <LargeTitleHeader title="ID Card" subtitle="Printable card preview" />

      <SectionLabel>Profile</SectionLabel>
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

      <SectionLabel>Card preview</SectionLabel>
      <div className="flex justify-center">
        <div className="relative w-full max-w-sm overflow-hidden rounded-[20px] p-6 shadow-glass" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10" />
          <div className="relative text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25">
                  <UserRound size={20} />
                </div>
                <div>
                  <div className="text-[18px] font-bold">
                    {current?.first_name} {current?.last_name}
                  </div>
                  <div className="text-[12px] capitalize text-white/80">{current?.member_type}</div>
                </div>
              </div>
              <div className="rounded-xl bg-white p-1.5">
                {cardUrl && <QRCode value={cardUrl} size={72} />}
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-white/15 px-4 py-3 text-center font-mono text-[16px] font-semibold tracking-widest">
              {user?.profile_id}
            </div>
            <div className="mt-4 flex justify-between text-[12px] text-white/90">
              <span>{current?.gender}</span>
              {current?.birthdate && <span>{new Date(current.birthdate).getFullYear()}</span>}
              <span>{current?.nationality}</span>
            </div>
          </div>
        </div>
      </div>

      <SectionLabel>Fields to print (optional on card)</SectionLabel>
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
