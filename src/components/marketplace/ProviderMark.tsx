'use client';

import { Building2, GraduationCap, HeartPulse, Wrench } from 'lucide-react';

type Category = 'hospital' | 'school' | 'garage' | string;

const appearance: Record<string, { icon: typeof Building2; shell: string }> = {
  hospital: { icon: HeartPulse, shell: 'bg-rose-50 text-rose-600 ring-rose-100' },
  school: { icon: GraduationCap, shell: 'bg-amber-50 text-amber-700 ring-amber-100' },
  garage: { icon: Wrench, shell: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
};

export function ProviderMark({ name, category, logoUrl, size = 'md' }: { name: string; category: Category; logoUrl?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const style = appearance[category] ?? { icon: Building2, shell: 'bg-slate-50 text-slate-600 ring-slate-100' };
  const Icon = style.icon;
  const safeLogoUrl = logoUrl && (/^https:\/\//i.test(logoUrl) || /^\/[^/]/.test(logoUrl)) ? logoUrl : null;
  const dimensions = size === 'lg' ? 'h-16 w-16 rounded-2xl' : size === 'sm' ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl';
  return <div className={`${dimensions} ${safeLogoUrl ? 'bg-white' : style.shell} flex shrink-0 items-center justify-center overflow-hidden ring-1`} aria-label={`${name} logo`}>
    {safeLogoUrl ? <img src={safeLogoUrl} alt={`${name} logo`} loading="lazy" className="h-full w-full object-contain p-1.5" /> : <Icon size={size === 'lg' ? 27 : size === 'sm' ? 19 : 23} aria-hidden="true" />}
  </div>;
}
