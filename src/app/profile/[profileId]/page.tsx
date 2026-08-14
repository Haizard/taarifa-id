'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, UserRound, HeartPulse, Phone, ShieldAlert, UsersRound } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import { api } from '@/lib/api';

interface PublicProfile {
  profile_id: string;
  account_type: string;
  is_reseller: boolean;
  expired: boolean;
  renewal_url?: string;
  message?: string;
  qr_data_url?: string;
  profiles?: Array<Record<string, any>>;
  entity?: Record<string, any> | null;
}

export default function PublicProfilePage() {
  const params = useParams<{ profileId: string }>();
  const router = useRouter();
  const [data, setData] = useState<PublicProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PublicProfile>(`/public/profiles/${params.profileId}`)
      .then((d) => {
        setData(d);
        if (d.expired && d.renewal_url) {
          router.replace(d.renewal_url);
          return;
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.profileId, router]);

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

  if (!data || data.expired) return null;

  const profiles = data.profiles ?? [];
  const isFamily = profiles.length > 1;

  return (
    <div className="app-bg min-h-screen px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-[16px] font-bold text-white">
            T
          </div>
          <span className="text-[20px] font-bold text-ink-primary">TAARIFA ID</span>
        </div>

        <div className="glass-strong relative mb-4 overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/20" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="text-[13px] capitalize text-ink-secondary">{data.account_type} profile</div>
                <div className="mt-1 break-words font-mono text-[16px] font-semibold tracking-wider text-ink-primary">
                  {data.profile_id}
                </div>
              </div>
              {data.qr_data_url && <img src={data.qr_data_url} alt="QR code" className="h-24 w-24 rounded-xl" />}
            </div>
            {isFamily && (
              <div className="mt-4 flex items-center gap-2 rounded-button bg-accent-primary/10 px-3 py-2 text-[13px] font-medium text-accent-primary">
                <UsersRound size={16} />
                {profiles.length} members on this profile
              </div>
            )}
          </div>
        </div>

        {isFamily ? (
          <MemberList profiles={profiles} accountType={data.account_type} />
        ) : (
          <SingleMemberCard profile={profiles[0]} qrUrl={`/profile/${data.profile_id}`} />
        )}

        <a
          href="/register"
          className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-button bg-accent-primary text-[17px] font-semibold text-white"
        >
          Get your own TAARIFA ID <ArrowRight size={18} />
        </a>

        <div className="mt-6 text-center text-[12px] text-ink-tertiary">
          Powered by Sunriver Systems · Only public fields are shown.
        </div>
      </div>
    </div>
  );
}

function SingleMemberCard({ profile, qrUrl }: { profile: any; qrUrl: string }) {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  const details: Array<[string, any]> = [];
  for (const k of ['first_name', 'last_name', 'gender', 'birthdate', 'nationality', 'fluent_language']) {
    if (profile?.[k] !== undefined) details.push([k.replace(/_/g, ' '), profile[k]]);
  }
  if (profile?.health) {
    for (const k of ['blood_group', 'height', 'weight']) if (profile.health[k]) details.push([`health: ${k}`, profile.health[k]]);
  }
  if (profile?.residence) {
    for (const k of ['region', 'district', 'ward', 'street']) if (profile.residence[k]) details.push([k, profile.residence[k]]);
  }

  return (
    <div className="glass-strong relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/20" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-accent-primary/15 text-accent-primary">
              {profile?.pic_url ? <img src={profile.pic_url} alt="Profile" className="h-full w-full object-cover" /> : <UserRound size={24} />}
            </div>
            <div className="mt-3 text-[17px] font-semibold text-ink-primary">
              {profile?.first_name} {profile?.last_name}
            </div>
            <div className="mt-0.5 text-[13px] capitalize text-ink-secondary">{profile?.member_type}</div>
          </div>
        </div>
        <div className="mt-5">
          {details.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-separator py-2.5 last:border-b-0">
              <span className="text-[14px] capitalize text-ink-secondary">{k}</span>
              <span className="text-[15px] font-medium text-ink-primary">{v}</span>
            </div>
          ))}
        </div>
        {profile?.emergency_contacts?.length > 0 && (
          <div className="mt-5 rounded-button bg-accent-danger/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-accent-danger">
              <Phone size={14} /> Emergency contacts
            </div>
            {profile.emergency_contacts.map((c: any, i: number) => (
              <div key={i} className="flex justify-between py-1 text-[14px]">
                <span className="text-ink-primary">{c.full_name}</span>
                <span className="text-ink-secondary">{c.mobile_1 ?? c.mobile_2 ?? ''}</span>
              </div>
            ))}
          </div>
        )}
        {profile?.desperate_conditions?.length > 0 && (
          <div className="mt-4 rounded-button bg-accent-warning/15 p-4">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-accent-warning">
              <HeartPulse size={14} /> Desperate conditions
            </div>
            {profile.desperate_conditions.map((c: any, i: number) => (
              <div key={i} className="py-1 text-[14px] text-ink-primary">{c.acute_condition_code}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberList({ profiles, accountType }: { profiles: any[]; accountType: string }) {
  return (
    <div className="space-y-3">
      {profiles.map((p: any) => (
        <a
          key={p.id}
          href={p.profile_code ? `/profile/by-code/${p.profile_code}` : '#'}
          className="glass-strong btn-scale flex items-center gap-4 p-4"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-primary/15 text-accent-primary">
            {p.pic_url ? (
              <img src={p.pic_url} alt={p.first_name} className="h-full w-full object-cover" />
            ) : (
              <UserRound size={26} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] font-semibold text-ink-primary">
              {p.first_name} {p.last_name}
            </div>
            <div className="truncate text-[12px] capitalize text-ink-secondary">{p.member_type}</div>
          </div>
          <ArrowRight size={18} className="shrink-0 text-ink-tertiary" />
        </a>
      ))}
    </div>
  );
}