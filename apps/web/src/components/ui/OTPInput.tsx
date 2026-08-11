'use client';

import { useRef } from 'react';

export function OTPInput({ value, onChange, length = 6 }: { value: string; onChange: (v: string) => void; length?: number }) {
  const refs = useRef<HTMLInputElement[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const handleChange = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '');
    const next = value.split('');
    for (let j = 0; j < clean.length && i + j < length; j++) {
      next[i + j] = clean[j];
    }
    onChange(next.join('').slice(0, length));
    const focusTo = Math.min(i + clean.length, length - 1);
    refs.current[focusTo]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el!;
          }}
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          className="h-14 w-11 rounded-button border border-glass-border bg-white/60 text-center text-[22px] font-semibold text-ink-primary focus:border-accent-primary focus:outline-none"
        />
      ))}
    </div>
  );
}
