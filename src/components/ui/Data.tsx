import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';

/* --------------------------------- Table --------------------------------- */

export function Table({ className, children, caption }: { className?: string; children: ReactNode; caption?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-line bg-surface', className)}>
      <table className="w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line bg-surface-2/60">{children}</thead>;
}

export function TH({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn('label-mono whitespace-nowrap px-4 py-3 font-medium text-ink-faint', className)} {...rest} />;
}

export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-line transition-colors last:border-0 hover:bg-surface-2/50', className)} {...rest} />;
}

export function TD({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3.5 text-ink', className)} {...rest} />;
}

/* -------------------------------- Progress ------------------------------- */

type Tone = 'brand' | 'gold' | 'sage';

const toneFill: Record<Tone, string> = {
  brand: 'bg-brand',
  gold: 'bg-gradient-to-r from-gold to-gold-strong',
  sage: 'bg-rose',
};

interface ProgressProps {
  /** 0–100 */
  value: number;
  label?: string;
  tone?: Tone;
  size?: 'sm' | 'md';
  className?: string;
  /** Show the percentage next to the label. */
  showValue?: boolean;
}

export function Progress({ value, label, tone = 'brand', size = 'md', className, showValue }: ProgressProps) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
          {label && <span className="truncate font-medium text-ink-muted">{label}</span>}
          {showValue && <span className="shrink-0 font-mono tabular-nums text-ink-faint">{Math.round(v)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(v)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn('overflow-hidden rounded-full bg-surface-2', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <motion.div
          className={cn('h-full rounded-full', toneFill[tone])}
          initial={{ width: 0 }}
          whileInView={{ width: `${v}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: ease.out }}
        />
      </div>
    </div>
  );
}

interface RingProps {
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  children?: ReactNode;
  className?: string;
  label?: string;
  /** Use light track for night surfaces. */
  night?: boolean;
}

export function ProgressRing({ value, size = 96, stroke = 8, tone = 'brand', children, className, label, night }: RingProps) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const color = tone === 'gold' ? 'var(--cp-gold)' : tone === 'sage' ? 'var(--cp-rose)' : 'var(--cp-brand)';
  return (
    <div
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke={night ? 'rgb(255 255 255 / 0.12)' : 'var(--cp-surface-2)'} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: v / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: ease.out }}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

/* --------------------------------- Divider -------------------------------- */

export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn('border-line', className)} />;
  return (
    <div className={cn('flex items-center gap-3', className)} role="separator">
      <span className="h-px flex-1 bg-line" />
      <span className="label-mono text-ink-faint">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
