import { cn } from '@/lib/utils';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
            value === opt.value ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressRing({ percent, size = 96, stroke = 8, label }: { percent: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#4DA3FF"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-[22px] font-bold text-ink-primary">{Math.round(percent)}%</div>
        {label && <div className="text-[11px] text-ink-secondary">{label}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <div className="text-[17px] font-semibold text-ink-primary">{title}</div>
      {subtitle && <div className="mt-1 text-[13px] text-ink-secondary">{subtitle}</div>}
    </div>
  );
}
