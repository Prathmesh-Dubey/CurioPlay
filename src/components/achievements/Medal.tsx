import { useId, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { dur, ease, spring } from '@/lib/motion';

/** Reeded coin edge, computed once: 44 teeth alternating between two radii. */
const TEETH = 44;
const EDGE = Array.from({ length: TEETH * 2 }, (_, i) => {
  const r = i % 2 === 0 ? 48 : 45.6;
  const a = (i / (TEETH * 2)) * Math.PI * 2 - Math.PI / 2;
  return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
}).join(' ');

interface MedalProps {
  unlocked: boolean;
  /** Rendered size in px. Omit to size it with className (e.g. `size-14 sm:size-24`). */
  size?: number;
  /** Pop + single sheen when it first enters the viewport (unlocked only). */
  animate?: boolean;
  /** Locked medal drawn for a night (navy) surface. */
  night?: boolean;
  className?: string;
}

/**
 * A struck medal bearing the CurioPlay mark (curiosity ring + play triangle).
 * Locked = blind-embossed outline in line-strong; unlocked = gold, with one slow sheen on reveal.
 */
export function Medal({ unlocked, size, animate = true, night, className }: MedalProps) {
  const uid = useId().replace(/:/g, '');
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const play = animate && unlocked && !reduce;

  return (
    <motion.span
      ref={ref}
      aria-hidden="true"
      className={cn('relative inline-grid size-16 shrink-0 place-items-center', className)}
      style={size ? { width: size, height: size } : undefined}
      initial={play ? { scale: 0.62, opacity: 0, rotate: -8 } : false}
      animate={play ? (inView ? { scale: 1, opacity: 1, rotate: 0 } : undefined) : undefined}
      transition={spring.pop}
    >
      <svg viewBox="0 0 100 100" className="size-full overflow-visible">
        <defs>
          <linearGradient id={`${uid}-face`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="var(--cp-gold)" />
            <stop offset="55%" stopColor="var(--cp-gold)" />
            <stop offset="100%" stopColor="var(--cp-gold-strong)" />
          </linearGradient>
          <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${uid}-clip`}>
            <polygon points={EDGE} />
          </clipPath>
        </defs>

        {unlocked ? (
          <>
            <polygon points={EDGE} fill="var(--cp-gold-strong)" />
            <circle cx="50" cy="50" r="42.5" fill={`url(#${uid}-face)`} />
            <circle cx="50" cy="50" r="42.5" fill="none" stroke="var(--cp-gold-strong)" strokeOpacity="0.55" strokeWidth="1" />
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="var(--cp-navy)"
              strokeOpacity="0.28"
              strokeWidth="0.9"
              strokeDasharray="0.8 2.4"
            />
            <g transform="translate(20 20) scale(1.5)" fill="none">
              <path
                d="M29.5 14.2A11.5 11.5 0 1 0 29.5 25.8"
                stroke="var(--cp-navy)"
                strokeOpacity="0.82"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M17.6 15.6v8.8a.9.9 0 0 0 1.38.76l6.9-4.4a.9.9 0 0 0 0-1.52l-6.9-4.4a.9.9 0 0 0-1.38.76Z"
                fill="var(--cp-navy)"
                fillOpacity="0.82"
              />
              <circle cx="31.6" cy="9.4" r="1.9" fill="var(--cp-navy)" fillOpacity="0.82" />
            </g>
            {/* top-left highlight to suggest relief */}
            <path d="M18 38a34 34 0 0 1 22-22" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" />
            {play && (
              <g clipPath={`url(#${uid}-clip)`}>
                <g transform="rotate(20 50 50)">
                  <motion.rect
                    y="-20"
                    width="34"
                    height="140"
                    fill={`url(#${uid}-sheen)`}
                    initial={{ x: -60 }}
                    animate={inView ? { x: 140 } : { x: -60 }}
                    transition={{ duration: dur.cinematic * 1.3, ease: ease.inOut, delay: 0.35 }}
                  />
                </g>
              </g>
            )}
          </>
        ) : (
          (() => {
            const line = night ? 'rgb(205 232 255 / 0.38)' : 'var(--cp-line-strong)';
            return (
              <>
                <polygon
                  points={EDGE}
                  fill={night ? 'rgb(255 255 255 / 0.04)' : 'var(--cp-surface)'}
                  stroke={line}
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42.5"
                  fill={night ? 'rgb(255 255 255 / 0.05)' : 'var(--cp-surface-2)'}
                  stroke={line}
                  strokeWidth="1"
                />
                {/* blind emboss: light lip above, soft shadow below */}
                <path
                  d="M14 46a36 36 0 0 1 72 0"
                  fill="none"
                  stroke={night ? 'rgb(255 255 255 / 0.12)' : 'var(--cp-surface)'}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M86 54a36 36 0 0 1-72 0"
                  fill="none"
                  stroke={night ? '#000' : 'var(--cp-ink)'}
                  strokeOpacity={night ? 0.25 : 0.07}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="50" r="35" fill="none" stroke={line} strokeWidth="0.9" strokeDasharray="0.8 2.6" />
                <g
                  transform="translate(20 20) scale(1.5)"
                  fill="none"
                  stroke={line}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M29.5 14.2A11.5 11.5 0 1 0 29.5 25.8" />
                  <path d="M17.6 15.6v8.8a.9.9 0 0 0 1.38.76l6.9-4.4a.9.9 0 0 0 0-1.52l-6.9-4.4a.9.9 0 0 0-1.38.76Z" />
                  <circle cx="31.6" cy="9.4" r="1.6" />
                </g>
              </>
            );
          })()
        )}
      </svg>
    </motion.span>
  );
}
