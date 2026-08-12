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
    <div className={cn('glass flex rounded-button p-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'btn-scale flex-1 rounded-[10px] px-3 py-2 text-[15px] font-medium transition-colors',
            value === opt.value ? 'bg-white shadow-sm text-ink-primary' : 'text-ink-secondary',
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
          stroke="#3B82F6"
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
    <div className="glass flex flex-col items-center justify-center p-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-glass-subtle text-ink-tertiary">
        {icon}
      </div>
      <div className="text-[17px] font-semibold text-ink-primary">{title}</div>
      {subtitle && <div className="mt-1 text-[13px] text-ink-secondary">{subtitle}</div>}
    </div>
  );
}
