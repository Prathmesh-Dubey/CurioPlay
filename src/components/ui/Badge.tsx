import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'brand' | 'rose' | 'gold' | 'neutral' | 'success' | 'danger' | 'night';

const soft: Record<BadgeTone, string> = {
  brand: 'bg-brand-soft text-brand-strong',
  rose: 'bg-rose-soft text-brand-strong',
  gold: 'bg-gold-soft text-gold-strong',
  neutral: 'bg-surface-2 text-ink-muted',
  success: 'bg-rose-soft text-brand-strong',
  danger: 'bg-red-500/10 text-red-700 dark:text-red-400',
  night: 'bg-white/10 text-night-sage',
};

const outline: Record<BadgeTone, string> = {
  brand: 'border border-brand/35 text-brand-strong',
  rose: 'border border-rose text-brand-strong',
  gold: 'border border-gold/60 text-gold-strong',
  neutral: 'border border-line-strong text-ink-muted',
  success: 'border border-brand/35 text-brand-strong',
  danger: 'border border-red-500/40 text-red-700 dark:text-red-400',
  night: 'border border-white/20 text-night-sage',
};

const dotColor: Record<BadgeTone, string> = {
  brand: 'bg-brand',
  rose: 'bg-rose',
  gold: 'bg-gold',
  neutral: 'bg-ink-faint',
  success: 'bg-brand',
  danger: 'bg-red-500',
  night: 'bg-night-sage',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: 'soft' | 'outline';
  /** Leading status dot; `pulse` animates it (use for live state only). */
  dot?: boolean | 'pulse';
}

export function Badge({ tone = 'brand', variant = 'soft', dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-wider',
        variant === 'soft' ? soft[tone] : outline[tone],
        className,
      )}
      {...rest}
    >
      {dot && (
        <span className="relative flex size-1.5">
          {dot === 'pulse' && <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', dotColor[tone])} />}
          <span className={cn('relative size-1.5 rounded-full', dotColor[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}
