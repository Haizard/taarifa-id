'use client';

import { useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ArrowRight, Camera, ShieldCheck, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { MAX_PHOTO_BYTES, fileToResizedDataUrl } from '@/lib/image';
import { GlassButton } from '@/components/ui/GlassCard';
import { IOSInput, IOSSelect } from '@/components/ui/IOSListGroup';

const ACCOUNT_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'family', label: 'Family' },
  { value: 'school', label: 'School' },
  { value: 'business', label: 'Business' },
  { value: 'institution', label: 'Institution' },
];

const STEPS = ['Account', 'Personal', 'Verify'];

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    account_type: params.get('type') ?? 'individual',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'Male',
    birthdate: '',
    nationality: 'Tanzanian',
    nida_number: '',
    passport_number: '',
    mobile_number: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [photo, setPhoto] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > MAX_PHOTO_BYTES) return toast.error('Photo must not exceed 1MB');
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setPhoto(dataUrl);
      setPhotoFile(file);
    } catch {
      toast.error('Could not read that image');
    }
  };

  const next = () => {
    if (step === 0 && !form.account_type) return toast.error('Select account type');
    if (step === 1) {
      if (!form.first_name || !form.last_name || !form.birthdate) return toast.error('Complete all required fields');
      if (!photo) return toast.error('A profile photo is required');
      if (form.nationality === 'Tanzanian' && !form.nida_number) return toast.error('NIDA number required for Tanzanian nationals');
      if (form.nationality === 'Foreign' && !form.passport_number) return toast.error('Passport number required for foreigners');
      if (!/^255\d{9}$/.test(form.mobile_number)) return toast.error('Mobile must start with 255 and be 12 digits');
      if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
      if (form.password !== form.confirm) return toast.error('Passwords do not match');
    }
    setStep((s) => s + 1);
  };

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ profile_id: string; sms_code_dev?: string; first_login_required: boolean }>('/auth/register', {
        account_type: form.account_type,
        first_name: form.first_name,
        middle_name: form.middle_name || undefined,
        last_name: form.last_name,
        gender: form.gender,
        birthdate: form.birthdate,
        nationality: form.nationality,
        nida_number: form.nationality === 'Tanzanian' ? form.nida_number : undefined,
        passport_number: form.nationality === 'Foreign' ? form.passport_number : undefined,
        mobile_number: form.mobile_number,
        email: form.email || undefined,
        password: form.password,
        pic_url: photo,
      });
      setProfileId(res.profile_id);
      setDevCode(res.sms_code_dev ?? '');
      toast.success('Account created. Confirmation code sent via SMS.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setLoading(true);
    try {
      await api.post('/auth/first-login', {
        mobile_number: form.mobile_number,
        profile_id: profileId,
        otp_code: smsCode,
      });
      toast.success('Verified! You can now log in.');
      router.push('/login');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f6] px-4 py-5 text-slate-900 sm:px-7 lg:px-10 lg:py-8">
      <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
      <aside className="relative hidden min-h-[calc(100vh-4rem)] overflow-hidden rounded-[28px] bg-emerald-950 lg:sticky lg:top-8 lg:block">
        <img src={form.account_type === 'school' ? '/images/marketplace/hero-school.webp' : form.account_type === 'business' ? '/images/marketplace/hero-garage.webp' : '/images/marketplace/hero-healthcare.webp'} alt="People connecting with local services" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/45 to-emerald-950/20" />
        <div className="absolute left-8 top-8 z-10"><Link href="/" className="flex items-center gap-3 text-white"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl font-extrabold">T</span><span className="font-extrabold tracking-wide">TAARIFA ID</span></Link></div>
        <div className="absolute bottom-9 left-8 right-8 z-10 text-white xl:bottom-12 xl:left-10 xl:right-10"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><ShieldCheck size={14}/>A profile for your next step</span><h2 className="mt-5 text-3xl font-bold leading-tight xl:text-4xl">One account. A simpler way to connect.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/80">Find services, manage requests, and keep useful information organized for the moments you need it.</p><div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">{['Healthcare','Education','Roadside support'].map((tag)=><span key={tag} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">{tag}</span>)}</div></div>
      </aside>
      <main className="mx-auto w-full max-w-2xl">
        <Link href="/" className="mb-5 flex items-center gap-2.5 lg:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg font-bold text-white">T</span><span className="font-extrabold">TAARIFA <span className="text-emerald-700">ID</span></span></Link>
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-emerald-700">Join Taarifa ID</div><p className="mt-1 text-sm text-slate-600">Create your account in three guided steps.</p></div><Link href="/login" className="shrink-0 text-sm font-bold text-emerald-700">Log in</Link></div>
        <div className="mt-5 flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= step ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span><span className={`text-xs font-semibold ${i <= step ? 'text-emerald-800' : 'text-slate-400'}`}>{s}</span>{i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />}</div>
          ))}
        </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,.07)] sm:p-7">
          {step === 0 && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-slate-900 sm:text-[28px]">Create your account</h1>
              <p className="mb-6 text-sm text-slate-500">Choose the kind of profile you want to register.</p>
              <IOSSelect label="Account type" value={form.account_type} onChange={(v) => set('account_type', v)}>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </IOSSelect>
              {form.account_type !== 'individual' && (
                <div className="mt-3 rounded-button bg-accent-secondary/15 px-4 py-3 text-[14px] font-medium text-accent-secondary">
                  Organization account — manage your team and services from one profile.
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-slate-900 sm:text-[28px]">Your details</h1>
              <p className="mb-6 text-sm text-slate-500">Add the information for your profile and ID card.</p>

              <div className="mb-5 flex flex-col items-center gap-3">
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-glass-subtle text-ink-tertiary"
                >
                  {photo ? (
                    <img src={photo} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound size={40} />
                  )}
                  <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-white">
                    <Camera size={16} />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="text-[14px] font-medium text-accent-primary"
                >
                  {photo ? 'Change photo' : 'Add photo (required, max 1MB)'}
                </button>
                {photoFile && (
                  <span className="text-[12px] text-ink-tertiary">
                    {(photoFile.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <IOSInput label="First name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
                <IOSInput label="Middle name (optional)" value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)} />
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
                <IOSInput label="Mobile (e.g. 255712345678)" inputMode="tel" value={form.mobile_number} onChange={(e) => set('mobile_number', e.target.value)} />
                <IOSInput label="Email (optional)" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
                <IOSInput label="Password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
                <IOSInput label="Confirm password" type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              {!profileId ? (
                <div>
                  <h1 className="mb-1 text-2xl font-bold text-slate-900 sm:text-[28px]">Review your details</h1>
                  <p className="mb-6 text-sm text-slate-500">Check your profile before creating the account.</p>
                  <div className="mb-6 space-y-2 rounded-button bg-glass-subtle p-4 text-[14px]">
                    {photo && (
                      <div className="mb-3 flex items-center gap-3">
                        <img src={photo} alt="Profile preview" className="h-14 w-14 rounded-full object-cover" />
                        <div>
                          <div className="font-medium text-ink-primary">Profile photo</div>
                          <div className="text-[12px] text-ink-secondary">Shown on your ID card</div>
                        </div>
                      </div>
                    )}
                    <div><span className="text-ink-secondary">Account:</span> <span className="capitalize">{form.account_type}</span></div>
                    <div><span className="text-ink-secondary">Name:</span> {form.first_name} {form.last_name}</div>
                    <div><span className="text-ink-secondary">Mobile:</span> {form.mobile_number}</div>
                    <div><span className="text-ink-secondary">Nationality:</span> {form.nationality}</div>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="mb-1 text-2xl font-bold text-slate-900 sm:text-[28px]">Verify your number</h1>
                  <p className="mb-6 text-sm text-slate-500">
                    We sent a confirmation code to {form.mobile_number}. This code is your first-login credential.
                  </p>
                  {devCode && (
                    <div className="mb-4 rounded-button bg-accent-warning/15 px-4 py-3 text-[13px] text-accent-warning">
                      DEV MODE — your code is <b>{devCode}</b>
                    </div>
                  )}
                  <IOSInput label="Confirmation code" inputMode="numeric" value={smsCode} onChange={(e) => setSmsCode(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {step < 2 ? (
              <GlassButton onClick={next} disabled={loading}>
                <span className="inline-flex items-center gap-2">Continue <ArrowRight size={16}/></span>
              </GlassButton>
            ) : profileId ? (
              <GlassButton onClick={confirm} disabled={loading || smsCode.length < 4}>
                {loading ? 'Verifying…' : 'Verify & continue'}
              </GlassButton>
            ) : (
              <GlassButton onClick={submit} disabled={loading}>
                {loading ? 'Creating…' : 'Create account'}
              </GlassButton>
            )}
            {step > 0 && !profileId && (
              <button onClick={() => setStep((s) => s - 1)} className="w-full py-2 text-center text-[15px] text-ink-secondary hover:text-ink-primary">
                Back
              </button>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-emerald-700">
            Log in
          </Link>
        </p>
      </main>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
