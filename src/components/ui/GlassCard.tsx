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
    primary:
      'bg-gradient-to-br from-accent-primary to-accent-secondary text-white shadow-glass border border-white/25',
    secondary: 'glass text-accent-primary',
    destructive: 'bg-glass text-accent-danger border border-glass-border',
    ghost: 'bg-transparent text-accent-primary hover:bg-glass-subtle',
  }[variant];
  return (
    <button
      className={cn(
        'btn-scale h-[50px] w-full rounded-button px-5 font-semibold text-[17px] transition-colors disabled:opacity-50',
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
    <div className="glass p-4">
      <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-full', chip)}>
        {icon}
      </div>
      <div className="text-[28px] font-bold leading-tight text-ink-primary">{value}</div>
      <div className="mt-1 text-[13px] text-ink-secondary">{label}</div>
      {trend && (
        <div className="mt-1 inline-block rounded-full bg-glass-subtle px-2 py-0.5 text-[12px] text-accent-success">
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
    <div className="flex items-end justify-between px-1 pb-5 pt-2">
      <div>
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.4px] text-ink-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-secondary">{subtitle}</p>}
      </div>
      {right}
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
    <div className="mb-2 mt-6 flex items-center gap-1.5 px-1 text-[13px] font-medium uppercase tracking-[0.5px] text-ink-secondary">
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {children}
    </div>
  );
}
