import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { dur, ease } from '@/lib/motion';
import { clockTime, compactNumber, longDate, monotonePath, niceMax, shortDate, useElementWidth } from './utils';

export interface ChartPoint {
  id: string;
  value: number;
  /** epoch ms */
  at: number;
  /** what produced the point, e.g. the experience title */
  label: string;
}

interface ScoreChartProps {
  /** Oldest → newest. */
  points: ChartPoint[];
  className?: string;
  /** Tall variant height on ≥480px containers. */
  height?: number;
  /** Prefix for the accessible summary, e.g. "Your scores". */
  subject?: string;
}

const PAD = { l: 46, r: 14, t: 26, b: 34 };

/**
 * Hand-built score trace: true-pixel SVG (text never scales), monotone line, peak marker,
 * pointer + keyboard crosshair with a tooltip and a live readout for screen readers.
 */
export function ScoreChart({ points, className, height = 280, subject = 'Scores' }: ScoreChartProps) {
  const gid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const inView = useInView(wrapRef, { once: true, margin: '-60px' });
  const [active, setActive] = useState<number | null>(null);

  const n = points.length;
  const W = Math.max(width, 260);
  const H = width && width < 480 ? 220 : height;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;

  const geo = useMemo(() => {
    const values = points.map((p) => p.value);
    const peak = values.length ? Math.max(...values) : 0;
    const peakIndex = values.lastIndexOf(peak);
    const max = niceMax(peak * 1.08);
    const x = (i: number) => PAD.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v: number) => PAD.t + ih - (v / max) * ih;
    const pts = points.map((p, i) => [x(i), y(p.value)] as const);
    const line = monotonePath(pts);
    const area = n > 1 ? `${line}L${pts[n - 1][0].toFixed(1)},${PAD.t + ih}L${pts[0][0].toFixed(1)},${PAD.t + ih}Z` : '';
    const tickCount = ih < 150 ? 3 : 4;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (i / tickCount) * max);
    const maxLabels = Math.max(2, Math.floor(iw / 92));
    const every = Math.max(1, Math.ceil(n / maxLabels));
    const labels: number[] = [];
    for (let i = 0; i < n; i += every) labels.push(i);
    if (n > 1 && labels[labels.length - 1] !== n - 1) {
      // keep the newest date, dropping a neighbour that would collide with it
      if (n - 1 - labels[labels.length - 1] < every * 0.6) labels.pop();
      labels.push(n - 1);
    }
    return { peak, peakIndex, x, y, pts, line, area, ticks, labels };
  }, [points, n, iw, ih]);

  const summary = useMemo(() => {
    if (n === 0) return `${subject}: no data.`;
    const first = points[0];
    const last = points[n - 1];
    return `${subject}: ${n} recorded, from ${first.value.toLocaleString()} on ${longDate(
      first.at,
    )} to ${last.value.toLocaleString()} on ${longDate(last.at)}. Peak ${geo.peak.toLocaleString()} on ${longDate(
      points[geo.peakIndex].at,
    )}.`;
  }, [points, n, geo.peak, geo.peakIndex, subject]);

  const pick = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = n === 1 ? 0 : Math.round((px / rect.width) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    const cur = active ?? n - 1;
    if (e.key === 'ArrowRight') next = Math.min(n - 1, cur + (active === null ? 0 : 1));
    if (e.key === 'ArrowLeft') next = Math.max(0, cur - (active === null ? 0 : 1));
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = n - 1;
    if (e.key === 'Escape') {
      setActive(null);
      return;
    }
    if (next !== null) {
      e.preventDefault();
      setActive(next);
    }
  };

  const a = active !== null ? points[active] : null;
  const ax = active !== null ? geo.x(active) : 0;
  const ay = a ? geo.y(a.value) : 0;
  const tipLeft = Math.min(Math.max(ax, 78), W - 78);
  const tipBelow = ay < 70;
  const animateLine = !reduce;

  return (
    <div className={cn('relative', className)}>
      <div
        ref={wrapRef}
        tabIndex={n ? 0 : -1}
        role="group"
        aria-roledescription="chart"
        aria-label={`${summary} Use the arrow keys to read individual scores.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        className="relative w-full rounded-xl outline-none"
        style={{ height: H }}
      >
        {width > 0 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block overflow-visible text-ink-faint" aria-hidden="true">
            <defs>
              <linearGradient id={`${gid}-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cp-brand)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--cp-brand)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* axis titles */}
            <text x={0} y={11} fontSize="10" letterSpacing="1.4" fill="currentColor" className="font-mono uppercase">
              SCORE
            </text>
            <text x={W - PAD.r} y={H - 2} fontSize="10" letterSpacing="1.4" textAnchor="end" fill="currentColor" className="font-mono">
              DATE SUBMITTED →
            </text>

            {/* gridlines + y labels */}
            {geo.ticks.map((t, i) => (
              <g key={t}>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={geo.y(t)}
                  y2={geo.y(t)}
                  stroke="var(--cp-line)"
                  strokeWidth="1"
                  strokeDasharray={i === 0 ? undefined : '2 4'}
                />
                <text x={PAD.l - 10} y={geo.y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor" className="tabular-nums">
                  {compactNumber(t)}
                </text>
              </g>
            ))}

            {/* x labels */}
            {geo.labels.map((i) => {
              const p = points[i];
              return (
                <text
                  key={p.id}
                  x={geo.x(i)}
                  y={H - 16}
                  textAnchor={n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                  fontSize="11"
                  fill="currentColor"
                >
                  {shortDate(p.at)}
                </text>
              );
            })}

            {n > 1 && (
              <>
                <motion.path
                  d={geo.area}
                  fill={`url(#${gid}-area)`}
                  initial={animateLine ? { opacity: 0 } : false}
                  animate={{ opacity: inView || !animateLine ? 1 : 0 }}
                  transition={{ duration: dur.slow, delay: 0.25, ease: ease.out }}
                />
                <motion.path
                  d={geo.line}
                  fill="none"
                  stroke="var(--cp-brand)"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={animateLine ? { pathLength: 0 } : false}
                  animate={{ pathLength: inView || !animateLine ? 1 : 0 }}
                  transition={{ duration: dur.cinematic, ease: ease.out }}
                />
              </>
            )}

            {/* peak reference */}
            {n > 0 && (
              <g>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={geo.y(geo.peak)}
                  y2={geo.y(geo.peak)}
                  stroke="var(--cp-gold)"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                  strokeDasharray="1 5"
                  strokeLinecap="round"
                />
                <text
                  x={W - PAD.r}
                  y={geo.y(geo.peak) - 6}
                  textAnchor="end"
                  fontSize="10"
                  letterSpacing="1.2"
                  className="fill-gold-strong font-mono"
                >
                  PEAK {geo.peak.toLocaleString()}
                </text>
              </g>
            )}

            {/* markers: all when sparse, otherwise first/last/peak */}
            {geo.pts.map(([px, py], i) => {
              const isPeak = i === geo.peakIndex;
              const sparse = n <= 36;
              if (!sparse && !isPeak && i !== n - 1 && i !== 0) return null;
              return (
                <circle
                  key={points[i].id}
                  cx={px}
                  cy={py}
                  r={isPeak ? 4.5 : 3.25}
                  fill={isPeak ? 'var(--cp-gold)' : 'var(--cp-surface)'}
                  stroke={isPeak ? 'var(--cp-surface)' : 'var(--cp-brand)'}
                  strokeWidth={isPeak ? 2 : 1.75}
                />
              );
            })}

            {/* crosshair */}
            {a && (
              <g pointerEvents="none">
                <line x1={ax} x2={ax} y1={PAD.t} y2={PAD.t + ih} stroke="var(--cp-ink)" strokeOpacity="0.35" strokeWidth="1" />
                <line x1={PAD.l} x2={W - PAD.r} y1={ay} y2={ay} stroke="var(--cp-ink)" strokeOpacity="0.12" strokeWidth="1" />
                <circle cx={ax} cy={ay} r="6.5" fill="var(--cp-brand)" fillOpacity="0.18" />
                <circle cx={ax} cy={ay} r="4" fill="var(--cp-brand)" stroke="var(--cp-surface)" strokeWidth="2" />
              </g>
            )}

            {/* hit area */}
            <rect
              x={PAD.l - 8}
              y={PAD.t}
              width={iw + 16}
              height={ih}
              fill="transparent"
              onPointerMove={pick}
              onPointerDown={pick}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
              style={{ touchAction: 'pan-y' }}
            />
          </svg>
        )}

        {a && (
          <div
            className="pointer-events-none absolute left-0 top-0 z-10 w-max max-w-[11rem] rounded-xl bg-navy px-3 py-2 text-white shadow-float transition-transform duration-150 ease-out-expo"
            style={{
              transform: `translate(${tipLeft}px, ${tipBelow ? ay + 14 : ay - 14}px) translate(-50%, ${tipBelow ? '0' : '-100%'})`,
            }}
          >
            <p className="font-semiwide text-lg font-extrabold leading-none tabular-nums">{a.value.toLocaleString()}</p>
            <p className="mt-1 truncate text-xs font-semibold text-night-sage">{a.label}</p>
            <p className="label-mono mt-0.5 text-[10px] text-white/60">
              {shortDate(a.at)} · {clockTime(a.at)}
            </p>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {a
          ? `${a.value.toLocaleString()} points in ${a.label}, ${longDate(a.at)} at ${clockTime(a.at)}. Score ${(active ?? 0) + 1} of ${n}.`
          : ''}
      </p>
    </div>
  );
}
