import { cn } from '@/lib/utils';

export function IOSListGroup({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-6', className)}>
      {title && (
        <div className="mb-2 px-1 text-[13px] font-medium uppercase tracking-[0.5px] text-ink-secondary">{title}</div>
      )}
      <div className="glass overflow-hidden p-0">{children}</div>
    </div>
  );
}

export function IOSListRow({
  label,
  value,
  right,
  children,
  className,
  onClick,
}: {
  label?: string;
  value?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn('flex min-h-[44px] items-center gap-3 border-b border-separator px-4 py-3 last:border-b-0', onClick && 'btn-scale cursor-pointer', className)}
      onClick={onClick}
    >
      {label && <div className="min-w-0 flex-1 break-words text-[17px] text-ink-primary">{label}</div>}
      {children}
      {value !== undefined && <div className="min-w-0 break-words text-right text-[17px] text-ink-secondary">{value}</div>}
      {right}
    </div>
  );
}

export function IOSSwitch({ checked, onChange, disabled }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative h-[31px] w-[51px] shrink-0 rounded-full p-[2px] transition-colors duration-200',
        checked ? 'bg-accent-success' : 'bg-ink-tertiary/40',
        disabled && 'opacity-40',
      )}
    >
      <span
        className={cn(
          'block h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200',
          checked && 'translate-x-[20px]',
        )}
      />
    </button>
  );
}

export function IOSInput({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div className="border-b border-separator px-4 py-3 last:border-b-0">
      {label && <div className="mb-1 text-[13px] text-ink-secondary">{label}</div>}
      <input
        className={cn('w-full border-0 bg-transparent text-right text-[17px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none', className)}
        {...props}
      />
    </div>
  );
}

export function IOSTextArea({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div className="border-b border-separator px-4 py-3 last:border-b-0">
      {label && <div className="mb-1 text-[13px] text-ink-secondary">{label}</div>}
      <textarea
        className={cn('w-full border-0 bg-transparent text-right text-[17px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none', className)}
        {...props}
      />
    </div>
  );
}

export function IOSSelect({
  label,
  children,
  value,
  onChange,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('border-b border-separator px-4 py-3 last:border-b-0', className)}>
      {label && <div className="mb-1 text-[13px] text-ink-secondary">{label}</div>}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full cursor-pointer appearance-none border-0 bg-transparent text-right text-[17px] text-ink-primary focus:outline-none"
      >
        {children}
      </select>
    </div>
  );
}
