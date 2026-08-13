'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { LargeTitleHeader, GlassButton, SectionLabel } from '@/components/ui/GlassCard';
import { IOSListGroup, IOSInput, IOSListRow } from '@/components/ui/IOSListGroup';
import { IOSSwitch } from '@/components/ui/IOSListGroup';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState({
    sms_updates: true,
    sms_payments: true,
    sms_renewals: true,
  });

  const changePassword = async () => {
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword });
      toast.success('Password changed');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotif = (k: keyof typeof notif) => setNotif((n) => ({ ...n, [k]: !n[k] }));

  return (
    <div>
      <LargeTitleHeader title="Settings" subtitle="Account preferences" />

      <SectionLabel tone="blue">Account</SectionLabel>
      <IOSListGroup>
        <IOSListRow label="Username" value={user?.username} />
        <IOSListRow label="Account type" value={user?.account_type} />
        <IOSListRow label="Role" value={user?.role} />
        <IOSListRow label="Profile ID" value={user?.profile_id} />
      </IOSListGroup>

      <SectionLabel tone="red">Change password</SectionLabel>
      <IOSListGroup>
        <IOSInput label="Current password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        <IOSInput label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <IOSInput label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </IOSListGroup>
      <GlassButton onClick={changePassword} disabled={loading}>
        {loading ? 'Saving…' : 'Update password'}
      </GlassButton>

      <SectionLabel tone="yellow">SMS notifications</SectionLabel>
      <IOSListGroup>
        <IOSListRow label="Profile updates">
          <IOSSwitch checked={notif.sms_updates} onChange={() => toggleNotif('sms_updates')} />
        </IOSListRow>
        <IOSListRow label="Payments">
          <IOSSwitch checked={notif.sms_payments} onChange={() => toggleNotif('sms_payments')} />
        </IOSListRow>
        <IOSListRow label="Renewal reminders">
          <IOSSwitch checked={notif.sms_renewals} onChange={() => toggleNotif('sms_renewals')} />
        </IOSListRow>
      </IOSListGroup>
      <div className="mt-3 text-center text-[12px] text-ink-tertiary">
        Notifications are sent via SMS to {user?.mobile_number}
      </div>
    </div>
  );
}
