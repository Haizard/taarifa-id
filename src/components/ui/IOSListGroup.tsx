import { cn } from '@/lib/utils';

export function IOSListGroup({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-6', className)}>
      {title && (
        <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">{title}</div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,.045)]">{children}</div>
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
      className={cn('flex min-h-[52px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0', onClick && 'cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100', className)}
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
    <label className="block border-b border-slate-100 px-4 py-3.5 last:border-b-0">
      {label && <div className="mb-1.5 text-[12px] font-semibold text-slate-500">{label}</div>}
      <input
        className={cn('block w-full border-0 bg-transparent p-0 text-left text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0', className)}
        {...props}
      />
    </label>
  );
}

export function IOSTextArea({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block border-b border-slate-100 px-4 py-3.5 last:border-b-0">
      {label && <div className="mb-1.5 text-[12px] font-semibold text-slate-500">{label}</div>}
      <textarea
        className={cn('block w-full resize-y border-0 bg-transparent p-0 text-left text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0', className)}
        {...props}
      />
    </label>
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
    <label className={cn('block border-b border-slate-100 px-4 py-3.5 last:border-b-0', className)}>
      {label && <div className="mb-1.5 text-[12px] font-semibold text-slate-500">{label}</div>}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="block w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-left text-[15px] text-slate-900 outline-none focus:ring-0"
      >
        {children}
      </select>
    </label>
  );
}
