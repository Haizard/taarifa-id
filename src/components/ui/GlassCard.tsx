import { cn } from '@/lib/utils';

export const ACCENT_CHIP: Record<'blue' | 'lavender' | 'yellow' | 'red' | 'green', string> = {
  blue: 'bg-accent-primary/15 text-accent-primary',
  lavender: 'bg-accent-secondary/15 text-accent-secondary',
  yellow: 'bg-accent-warning/15 text-accent-warning',
  red: 'bg-accent-danger/15 text-accent-danger',
  green: 'bg-accent-success/15 text-accent-success',
};

export type AccentTone = keyof typeof ACCENT_CHIP;

export const ACCOUNT_TYPE_TONE: Record<string, AccentTone> = {
  individual: 'blue',
  family: 'lavender',
  school: 'yellow',
  business: 'red',
  institution: 'green',
};

export function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('glass p-5', className)}>{children}</div>;
}

export function GlassButton({
  variant = 'primary',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
}) {
  const styles = {
    primary: 'border border-emerald-700 bg-emerald-700 text-white shadow-[0_8px_20px_rgba(4,120,87,.18)] hover:bg-emerald-800 hover:border-emerald-800',
    secondary: 'border border-slate-200 bg-white text-emerald-800 shadow-sm hover:border-emerald-200 hover:bg-emerald-50',
    destructive: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
    ghost: 'bg-transparent text-accent-primary hover:bg-glass-subtle',
  }[variant];
  return (
    <button
      className={cn(
        'btn-scale min-h-[48px] w-full rounded-xl px-5 py-3 font-semibold text-[15px] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatCard({
  icon,
  value,
  label,
  trend,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: string;
  tone?: AccentTone;
}) {
  const chip = ACCENT_CHIP[tone];
  return (
    <div className="glass min-w-0 overflow-hidden p-4">
      <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-full', chip)}>
        {icon}
      </div>
      <div className="break-all text-[28px] font-bold leading-tight text-ink-primary">{value}</div>
      <div className="mt-1 break-words text-[13px] text-ink-secondary">{label}</div>
      {trend && (
        <div className="mt-1 inline-block max-w-full rounded-full bg-glass-subtle px-2 py-0.5 text-[12px] text-accent-success">
          {trend}
        </div>
      )}
    </div>
  );
}

export function Badge({ tone = 'grey', children }: { tone?: 'green' | 'grey' | 'blue' | 'lavender' | 'yellow' | 'orange' | 'red'; children: React.ReactNode }) {
  const tones = {
    green: 'bg-accent-success/15 text-accent-success',
    grey: 'bg-glass-subtle text-ink-secondary',
    blue: 'bg-accent-primary/15 text-accent-primary',
    lavender: 'bg-accent-secondary/15 text-accent-secondary',
    yellow: 'bg-accent-warning/15 text-accent-warning',
    orange: 'bg-accent-warning/15 text-accent-warning',
    red: 'bg-accent-danger/15 text-accent-danger',
  }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium', tones)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function LargeTitleHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-1 pb-5 pt-2">
      <div className="min-w-0">
        <h1 className="break-words text-[28px] font-bold leading-tight tracking-[-0.5px] text-slate-900 sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 break-words text-[14px] text-slate-500">{subtitle}</p>}
      </div>
      {right && <div className="min-w-0 shrink-0">{right}</div>}
    </div>
  );
}

export function SectionLabel({ children, tone = 'blue' }: { children: React.ReactNode; tone?: AccentTone }) {
  const dot = {
    blue: 'bg-accent-primary',
    lavender: 'bg-accent-secondary',
    yellow: 'bg-accent-warning',
    red: 'bg-accent-danger',
    green: 'bg-accent-success',
  }[tone];
  return (
    <div className="mb-2 mt-6 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[.13em] text-slate-500">
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      {children}
    </div>
  );
}
