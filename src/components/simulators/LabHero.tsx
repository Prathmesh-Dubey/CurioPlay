import { useEffect, useId, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { animate, motion, useInView, useMotionValue, useReducedMotion } from 'motion/react';
import { Plus } from 'lucide-react';
import type { Simulator } from '@/api/api';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Decor';
import { Skeleton } from '@/components/ui/Skeleton';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { formatDate } from './SpecimenSheet';

/* ------------------------------------------------------------------ */
/* Signal bench — a small oscilloscope you can tune                    */
/* ------------------------------------------------------------------ */

const W = 480;
const H = 180;
const MID = H / 2;
const AMP = 54;
const MIN_F = 1;
const MAX_F = 6;
const STEP_F = 0.5;
/** Seconds for the trace to travel one wavelength. */
const SWEEP = 2.4;

/** Sine trace long enough (W + 2λ) to translate by up to 2λ seamlessly. */
function tracePath(cycles: number) {
  const wl = W / cycles;
  const end = W + wl * 2;
  let d = '';
  for (let x = 0; x <= end; x += 3) {
    const y = MID - Math.sin((x / wl) * Math.PI * 2) * AMP;
    d += `${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`;
  }
  return d;
}

const clampF = (v: number) => Math.min(MAX_F, Math.max(MIN_F, Math.round(v / STEP_F) * STEP_F));

function SignalScope({ paused }: { paused: boolean }) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef);
  const sliderId = useId();
  const [cycles, setCycles] = useState(2.5);
  const x = useMotionValue(0);
  const probeX = useMotionValue(W / 2);
  const probeOpacity = useMotionValue(0);
  const d = useMemo(() => tracePath(cycles), [cycles]);

  const running = !reduce && !paused && inView;

  // The page's single ambient loop: the trace scrolls by one wavelength, forever, only while visible.
  useEffect(() => {
    if (!running) return;
    const wl = W / cycles;
    const start = x.get() % wl;
    const controls = animate(x, [start, start - wl], { duration: SWEEP, ease: 'linear', repeat: Infinity });
    return () => controls.stop();
  }, [running, cycles, x]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    probeX.set(ratio * W);
    setCycles(clampF(MIN_F + ratio * (MAX_F - MIN_F)));
  };

  return (
    <figure ref={rootRef} className="relative min-w-0 rounded-[22px] border border-white/10 bg-navy-2/60 p-3 sm:p-4">
      <figcaption className="flex items-center justify-between gap-3 px-1 pb-3">
        <span className="label-mono text-night-sage/80">Signal bench · CH-1</span>
        <span className="label-mono flex items-center gap-2 text-white/60">
          <span className={cn('size-1.5 rounded-full', running ? 'bg-night-sage' : 'bg-white/30')} aria-hidden="true" />
          {reduce ? 'Static' : running ? 'Live' : 'Paused'}
        </span>
      </figcaption>

      <div
        className="relative overflow-hidden rounded-xl border border-white/10 bg-navy bg-graph-night"
        onPointerMove={onPointerMove}
        onPointerEnter={(e) => e.pointerType === 'mouse' && probeOpacity.set(1)}
        onPointerLeave={() => probeOpacity.set(0)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden="true">
          <line x1="0" y1={MID} x2={W} y2={MID} className="stroke-night-sage/30" strokeDasharray="2 6" />
          <line x1={W / 2} y1="0" x2={W / 2} y2={H} className="stroke-night-sage/15" strokeDasharray="2 6" />
          <motion.path
            d={d}
            style={{ x }}
            fill="none"
            className="stroke-night-sage"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <motion.line
            x1="0"
            x2="0"
            y1="0"
            y2={H}
            style={{ x: probeX, opacity: probeOpacity }}
            className="stroke-white/60"
            strokeWidth="1"
          />
        </svg>
        <span className="label-mono pointer-events-none absolute left-3 top-2.5 text-white/45">1 s / screen</span>
        <span className="label-mono pointer-events-none absolute bottom-2.5 right-3 hidden text-white/45 sm:block">
          Sweep to tune
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 px-1">
        <label htmlFor={sliderId} className="label-mono text-night-sage/80">
          Frequency
        </label>
        <input
          id={sliderId}
          type="range"
          min={MIN_F}
          max={MAX_F}
          step={STEP_F}
          value={cycles}
          onChange={(e) => setCycles(clampF(Number(e.target.value)))}
          aria-valuetext={`${cycles.toFixed(1)} hertz`}
          className="h-11 w-full min-w-0 cursor-pointer accent-night-sage"
        />
      </div>

      <dl className="mt-1 grid grid-cols-3 border-t border-white/10 pt-3 text-white">
        {[
          ['Freq', `${cycles.toFixed(1)} Hz`],
          ['Period', `${Math.round(1000 / cycles)} ms`],
          ['Wavelength', `${Math.round(W / cycles)} px`],
        ].map(([k, v], i) => (
          <div key={k} className={cn('min-w-0 px-1', i > 0 && 'border-l border-white/10 pl-3')}>
            <dt className="label-mono text-white/45">{k}</dt>
            <dd className="mt-0.5 truncate font-mono text-sm tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Lab hero                                                            */
/* ------------------------------------------------------------------ */

function Readout({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 bg-navy px-4 py-3.5', className)}>
      <dt className="label-mono text-night-sage/75">{label}</dt>
      <dd className="mt-1.5 min-w-0">{children}</dd>
    </div>
  );
}

interface LabHeroProps {
  loading: boolean;
  experiments: number;
  fields: number;
  latest: Simulator | undefined;
  isAdmin: boolean;
  onNewSimulator: () => void;
  /** Pause the instrument while an experiment is running full-screen. */
  paused: boolean;
}

export function LabHero({ loading, experiments, fields, latest, isAdmin, onNewSimulator, paused }: LabHeroProps) {
  return (
    <motion.section
      aria-labelledby="lab-title"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: ease.out }}
      className="grain relative isolate overflow-hidden rounded-[28px] bg-navy bg-graph-night text-white"
    >
      <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:p-10">
        <div className="min-w-0">
          <Eyebrow night index="03">
            The Laboratory
          </Eyebrow>
          <h1 id="lab-title" className="mt-4 font-wide text-[2.15rem] font-extrabold leading-[0.95] sm:text-[3.1rem] xl:text-[3.5rem]">
            Digital
            <br />
            laboratory
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
            A specimen archive of interactive experiments. Read the sheet, then run it — every variable is yours to tune.
          </p>

          <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-[auto_auto_minmax(0,1fr)]">
            <Readout label="Experiments">
              {loading ? (
                <Skeleton className="h-8 w-14 bg-white/10" />
              ) : (
                <AnimatedNumber value={experiments} className="font-wide text-[2rem] font-extrabold leading-none" />
              )}
            </Readout>
            <Readout label="Fields">
              {loading ? (
                <Skeleton className="h-8 w-10 bg-white/10" />
              ) : (
                <AnimatedNumber value={fields} className="font-wide text-[2rem] font-extrabold leading-none" />
              )}
            </Readout>
            <Readout label="Latest addition" className="col-span-2 sm:col-span-1">
              {loading ? (
                <Skeleton className="h-8 w-40 bg-white/10" />
              ) : latest ? (
                <>
                  <span className="block truncate text-[15px] font-semibold leading-tight">{latest.title}</span>
                  <span className="label-mono mt-1 block text-white/50">{formatDate(latest.createdAt)}</span>
                </>
              ) : (
                <span className="block text-[15px] text-white/60">Nothing logged yet</span>
              )}
            </Readout>
          </dl>

          {isAdmin && (
            <Button variant="night" className="mt-6" leadingIcon={<Plus className="size-4" />} onClick={onNewSimulator}>
              New simulator
            </Button>
          )}
        </div>

        <SignalScope paused={paused} />
      </div>
    </motion.section>
  );
}
