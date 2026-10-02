import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/** Crop-mark corners for specimen-like cards. Parent must be `relative`. */
export function CornerTicks({ className, size = 10, inset = 10 }: { className?: string; size?: number; inset?: number }) {
  const s = { width: size, height: size };
  const base = 'pointer-events-none absolute border-current';
  return (
    <span aria-hidden="true" className={cn('text-ink-faint/70', className)}>
      <span className={cn(base, 'border-l border-t')} style={{ ...s, top: inset, left: inset }} />
      <span className={cn(base, 'border-r border-t')} style={{ ...s, top: inset, right: inset }} />
      <span className={cn(base, 'border-b border-l')} style={{ ...s, bottom: inset, left: inset }} />
      <span className={cn(base, 'border-b border-r')} style={{ ...s, bottom: inset, right: inset }} />
    </span>
  );
}

/** Catalogue index like "№ 03" or "EXP-014". */
export function PlateTag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('label-mono text-ink-faint', className)}>{children}</span>;
}

/** Eyebrow line used above section titles: index · label. */
export function Eyebrow({ index, children, className, night }: { index?: string; children: ReactNode; className?: string; night?: boolean }) {
  return (
    <p className={cn('label-mono flex items-center gap-3', night ? 'text-night-sage/80' : 'text-brand-strong', className)}>
      {index && (
        <>
          <span className={night ? 'text-night-gold' : 'text-gold-strong'}>№ {index}</span>
          <span className={cn('h-px w-8', night ? 'bg-white/25' : 'bg-line-strong')} aria-hidden="true" />
        </>
      )}
      <span>{children}</span>
    </p>
  );
}

/** Dotted orbit ellipses with drifting satellites — the logo's language as a background. */
export function OrbitLines({ className, night, animate = true }: { className?: string; night?: boolean; animate?: boolean }) {
  const reduce = useReducedMotion();
  const stroke = night ? 'rgb(205 232 255 / 0.22)' : 'var(--cp-rose)';
  const rings = [
    { rx: 46, ry: 16, rot: -18, dur: 38, sat: 'var(--cp-gold)' },
    { rx: 36, ry: 12, rot: 24, dur: 30, sat: night ? '#cde8ff' : 'var(--cp-brand)' },
    { rx: 26, ry: 9, rot: -50, dur: 24, sat: night ? '#9db3cf' : 'var(--cp-rose)' },
  ];
  return (
    <svg viewBox="0 0 100 100" className={cn('pointer-events-none', className)} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {rings.map((r, i) => {
        const path = `M ${50 - r.rx},50 a ${r.rx},${r.ry} 0 1,0 ${r.rx * 2},0 a ${r.rx},${r.ry} 0 1,0 ${-r.rx * 2},0`;
        return (
          <g key={i} transform={`rotate(${r.rot} 50 50)`}>
            <ellipse cx="50" cy="50" rx={r.rx} ry={r.ry} fill="none" stroke={stroke} strokeWidth="0.3" strokeDasharray="0.6 1.4" />
            <circle cx={animate && !reduce ? 0 : 50 + r.rx} cy={animate && !reduce ? 0 : 50} r="1.1" fill={r.sat}>
              {animate && !reduce && <animateMotion dur={`${r.dur}s`} repeatCount="indefinite" path={path} />}
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
