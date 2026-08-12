'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { GlassButton } from '@/components/ui/GlassCard';
import { IOSInput } from '@/components/ui/IOSListGroup';
import { OTPInput } from '@/components/ui/OTPInput';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);

  const request = async () => {
    if (!/^255\d{9}$/.test(mobile)) return toast.error('Enter a valid 255 mobile number');
    setLoading(true);
    try {
      const res = await api.post<{ sms_code_dev?: string }>('/auth/forgot-password', { mobile_number: mobile });
      setDevCode(res.sms_code_dev ?? '');
      setStep('reset');
      toast.success('Reset code sent via SMS');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (code.length < 4) return toast.error('Enter the confirmation code');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    if (newPassword !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { mobile_number: mobile, otp_code: code, new_password: newPassword });
      toast.success('Password reset! Log in with your new password.');
      router.push('/login');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-[16px] font-bold text-white">
          T
        </div>
        <span className="text-[20px] font-bold text-ink-primary">TAARIFA ID</span>
      </div>

      <div className="w-full max-w-md">
        <div className="glass-strong p-6">
          {step === 'request' ? (
            <>
              <h1 className="mb-1 text-[28px] font-bold text-ink-primary">Forgot password</h1>
              <p className="mb-6 text-[15px] text-ink-secondary">We&apos;ll send a reset code to your registered mobile number.</p>
              <IOSInput label="Mobile number" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
              <div className="mt-6">
                <GlassButton onClick={request} disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset code'}
                </GlassButton>
              </div>
            </>
          ) : (
            <>
              <h1 className="mb-1 text-[28px] font-bold text-ink-primary">Reset password</h1>
              <p className="mb-6 text-[15px] text-ink-secondary">Enter the code sent to {mobile}.</p>
              {devCode && (
                <div className="mb-4 rounded-button bg-accent-warning/15 px-4 py-3 text-[13px] text-accent-warning">
                  DEV MODE — your code is <b>{devCode}</b>
                </div>
              )}
              <OTPInput value={code} onChange={setCode} />
              <div className="mt-5 space-y-1">
                <IOSInput label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <IOSInput label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <div className="mt-6">
                <GlassButton onClick={reset} disabled={loading}>
                  {loading ? 'Resetting…' : 'Reset password'}
                </GlassButton>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[14px] text-ink-secondary">
          <Link href="/login" className="font-medium text-accent-primary">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
