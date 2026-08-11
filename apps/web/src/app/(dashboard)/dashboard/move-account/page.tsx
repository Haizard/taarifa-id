'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeftRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { LargeTitleHeader, GlassButton, SectionLabel } from '@/components/ui/GlassCard';
import { IOSListGroup, IOSInput } from '@/components/ui/IOSListGroup';
import { SegmentedControl } from '@/components/ui/Control';

export default function MoveAccountPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [scheme, setScheme] = useState<'family' | 'school' | 'business' | 'institution'>('school');
  const [profileId, setProfileId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!profileId || !username || !password) return toast.error('Provide Profile ID and credentials');
    setLoading(true);
    try {
      await api.post('/accounts/move', { target_scheme: scheme, profile_id: profileId, username, password });
      toast.success('Account moved');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <LargeTitleHeader title="Move Account" subtitle="Transfer your profile to another scheme" />
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="glass flex h-16 w-16 items-center justify-center rounded-full text-accent-primary">
            <ArrowLeftRight size={28} />
          </div>
        </div>

        <SectionLabel>Target scheme</SectionLabel>
        <div className="mb-6">
          <SegmentedControl
            value={scheme}
            onChange={setScheme}
            options={[
              { value: 'family', label: 'Family' },
              { value: 'school', label: 'School' },
              { value: 'business', label: 'Business' },
              { value: 'institution', label: 'Institution' },
            ]}
          />
        </div>

        <IOSListGroup title="Account to move">
          <IOSInput label="Profile ID" value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="TID-XXXX" />
          <IOSInput label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
          <IOSInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </IOSListGroup>

        <GlassButton onClick={submit} disabled={loading}>
          {loading ? 'Moving…' : 'Move my account'}
        </GlassButton>
      </div>
    </div>
  );
}
