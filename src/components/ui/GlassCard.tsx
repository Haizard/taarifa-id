import { cn } from '@/lib/utils';

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
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: string;
}) {
  return (
    <div className="glass p-4">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-primary/15 text-accent-primary">
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

export function Badge({ tone = 'grey', children }: { tone?: 'green' | 'grey' | 'orange' | 'red'; children: React.ReactNode }) {
  const tones = {
    green: 'text-accent-success',
    grey: 'text-ink-secondary',
    orange: 'text-accent-warning',
    red: 'text-accent-danger',
  }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-glass-subtle px-3 py-1.5 text-[12px] font-medium', tones)}>
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

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 px-1 text-[13px] font-medium uppercase tracking-[0.5px] text-ink-secondary">
      {children}
    </div>
  );
}
