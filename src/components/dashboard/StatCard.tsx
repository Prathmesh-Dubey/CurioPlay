import type { ReactNode } from 'react';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  /** Numeric values animate; pass a string (e.g. "12m") to render as-is. */
  value: number | string;
  suffix?: string;
  hint?: string;
  loading?: boolean;
  tone?: 'brand' | 'rose' | 'gold';
  /** Optional mini series rendered as a sparkline (oldest → newest). */
  trend?: number[];
  className?: string;
}

const tones = {
  brand: 'bg-brand-soft text-brand-strong',
  rose: 'bg-rose-soft text-brand-strong',
  gold: 'bg-gold-soft text-gold-strong',
};

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const w = 88;
  const h = 28;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / (max - min || 1)) * h] as const);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-[88px] overflow-visible" aria-hidden="true">
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="var(--cp-brand)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--cp-brand)" />
    </svg>
  );
}

/** Instrument-panel reading: label tag, big number, quiet hint. */
export function StatCard({ icon, label, value, suffix, hint, loading, tone = 'brand', trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[20px] border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-soft',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="label-mono text-ink-faint">{label}</p>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110', tones[tone])}>
          {icon}
        </span>
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="flex items-baseline gap-1">
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : typeof value === 'number' ? (
            <>
              <AnimatedNumber value={value} className="font-semiwide text-[2rem] font-extrabold leading-none tabular-nums text-ink" />
              {suffix && <span className="text-base font-bold text-ink-muted">{suffix}</span>}
            </>
          ) : (
            <span className="font-semiwide text-[2rem] font-extrabold leading-none text-ink">{value}</span>
          )}
        </div>
        {trend && !loading && <Sparkline values={trend} />}
      </div>
      {hint && <p className="mt-2 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
