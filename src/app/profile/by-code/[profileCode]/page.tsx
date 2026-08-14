'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, UserRound, HeartPulse, Phone, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';

interface PublicMember {
  profile_id: string;
  member_profile_code: string;
  account_type: string;
  is_reseller: boolean;
  expired: boolean;
  renewal_url?: string;
  message?: string;
  qr_data_url?: string;
  member?: Record<string, any>;
  entity?: Record<string, any> | null;
}

export default function PublicMemberPage() {
  const params = useParams<{ profileCode: string }>();
  const router = useRouter();
  const [data, setData] = useState<PublicMember | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PublicMember>(`/public/profiles/by-code/${params.profileCode}`)
      .then((d) => {
        setData(d);
        if (d.expired && d.renewal_url) {
          router.replace(d.renewal_url);
          return;
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.profileCode, router]);

  if (loading) {
    return (
      <div className="app-bg flex min-h-screen items-center justify-center">
        <div className="glass px-6 py-4 text-[15px] text-ink-secondary">Loading profile…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-bg flex min-h-screen flex-col items-center justify-center px-4">
        <div className="glass-strong max-w-md p-8 text-center">
          <ShieldAlert size={40} className="mx-auto mb-4 text-accent-danger" />
          <h1 className="text-[22px] font-bold text-ink-primary">Profile not found</h1>
          <p className="mt-2 text-[15px] text-ink-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.expired || !data.member) return null;

  const m = data.member;

  const details: Array<[string, any]> = [];
  for (const k of ['first_name', 'last_name', 'gender', 'birthdate', 'nationality', 'fluent_language']) {
    if (m[k] !== undefined) details.push([k.replace(/_/g, ' '), m[k]]);
  }
  if (m.health) {
    for (const k of ['blood_group', 'height', 'weight']) if (m.health[k]) details.push([`health: ${k}`, m.health[k]]);
  }
  if (m.residence) {
    for (const k of ['region', 'district', 'ward', 'street']) if (m.residence[k]) details.push([k, m.residence[k]]);
  }

  return (
    <div className="app-bg min-h-screen px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-[16px] font-bold text-white">
            T
          </div>
          <span className="text-[20px] font-bold text-ink-primary">TAARIFA ID</span>
        </div>

        <div className="glass-strong relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/20" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-accent-primary/15 text-accent-primary">
                  {m.pic_url ? <img src={m.pic_url} alt="Profile" className="h-full w-full object-cover" /> : <UserRound size={24} />}
                </div>
                <div className="mt-3 text-[17px] font-semibold text-ink-primary">
                  {m.first_name} {m.last_name}
                </div>
                <div className="mt-0.5 text-[13px] capitalize text-ink-secondary">{data.account_type} · {m.member_type}</div>
              </div>
              {data.qr_data_url && <img src={data.qr_data_url} alt="QR code" className="h-24 w-24 rounded-xl" />}
            </div>

            <div className="mt-5 rounded-button bg-glass-subtle px-4 py-3 text-center font-mono text-[15px] font-semibold tracking-wider text-ink-primary">
              {m.profile_code ?? data.member_profile_code}
            </div>

            <div className="mt-5">
              {details.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-separator py-2.5 last:border-b-0">
                  <span className="text-[14px] capitalize text-ink-secondary">{k}</span>
                  <span className="text-[15px] font-medium text-ink-primary">{v}</span>
                </div>
              ))}
            </div>

            {m.emergency_contacts?.length > 0 && (
              <div className="mt-5 rounded-button bg-accent-danger/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-accent-danger">
                  <Phone size={14} /> Emergency contacts
                </div>
                {m.emergency_contacts.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between py-1 text-[14px]">
                    <span className="text-ink-primary">{c.full_name}</span>
                    <span className="text-ink-secondary">{c.mobile_1 ?? c.mobile_2 ?? ''}</span>
                  </div>
                ))}
              </div>
            )}

            {m.desperate_conditions?.length > 0 && (
              <div className="mt-4 rounded-button bg-accent-warning/15 p-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-accent-warning">
                  <HeartPulse size={14} /> Desperate conditions
                </div>
                {m.desperate_conditions.map((c: any, i: number) => (
                  <div key={i} className="py-1 text-[14px] text-ink-primary">{c.acute_condition_code}</div>
                ))}
              </div>
            )}

            <a
              href="/register"
              className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-button bg-accent-primary text-[17px] font-semibold text-white"
            >
              Get your own TAARIFA ID <ArrowRight size={18} />
            </a>
          </div>
        </div>

        <div className="mt-6 text-center text-[12px] text-ink-tertiary">
          Powered by Sunriver Systems · Only public fields are shown.
        </div>
      </div>
    </div>
  );
}