import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { Award, Code2, FlaskConical, Gamepad2, Trophy } from 'lucide-react';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { LogoMark } from '@/components/ui/Logo';
import { Thumb } from '@/components/ui/Thumb';
import { useCatalog } from '@/hooks/useCatalog';
import { cn } from '@/lib/utils';

/*
 * The Orrery — the hero's living diagram of the collection.
 * The CurioPlay mark is the sun; games, simulators, achievements, leaderboards and code
 * orbit it on tilted rings. Satellites pass behind the sun (smaller, dimmer) and in front of it.
 * Hover a satellite to pause its orbit; click to jump to that chapter. Pointer tilts the plane.
 */

const ORBITS = [
  { rx: 0.47, ry: 0.235, speed: 0.07, dir: 1, tilt: -12 },
  { rx: 0.34, ry: 0.17, speed: 0.1, dir: -1, tilt: 9 },
  { rx: 0.215, ry: 0.11, speed: 0.15, dir: 1, tilt: -4 },
];

interface SatelliteSpec {
  key: string;
  orbit: 0 | 1 | 2;
  phase: number;
  href: string;
  label: string;
  content: ReactNode;
  mobile?: boolean;
}

function Satellite({
  spec,
  time,
  size,
  onHover,
}: {
  spec: SatelliteSpec;
  time: MotionValue<number>;
  size: number;
  onHover: (h: boolean) => void;
}) {
  const o = ORBITS[spec.orbit];
  const tiltRad = (o.tilt * Math.PI) / 180;
  const angle = useTransform(time, (t) => spec.phase + o.dir * o.speed * t);
  // point on a tilted ellipse
  const x = useTransform(angle, (a) => {
    const ex = Math.cos(a) * o.rx * size;
    const ey = Math.sin(a) * o.ry * size;
    return ex * Math.cos(tiltRad) - ey * Math.sin(tiltRad);
  });
  const y = useTransform(angle, (a) => {
    const ex = Math.cos(a) * o.rx * size;
    const ey = Math.sin(a) * o.ry * size;
    return ex * Math.sin(tiltRad) + ey * Math.cos(tiltRad);
  });
  const depth = useTransform(angle, (a) => (Math.sin(a) + 1) / 2); // 0 = far (behind), 1 = near
  const scale = useTransform(depth, [0, 1], [0.78, 1.04]);
  const opacity = useTransform(depth, [0, 1], [0.55, 1]);
  const zIndex = useTransform(depth, (d) => (d > 0.5 ? 30 : 5));
  const blur = useTransform(depth, [0, 0.45, 1], ['blur(1.2px)', 'blur(0px)', 'blur(0px)']);

  return (
    <motion.a
      href={spec.href}
      aria-label={spec.label}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      style={{ x, y, scale, opacity, zIndex, filter: blur }}
      className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2', !spec.mobile && 'hidden sm:block')}
    >
      <motion.div
        whileHover={{ y: -4, scale: 1.04 }}
        transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        className="group rounded-2xl border border-line bg-surface/95 p-2.5 shadow-float backdrop-blur-sm transition-colors hover:border-brand/50"
      >
        {spec.content}
      </motion.div>
    </motion.a>
  );
}

function MiniWave() {
  return (
    <svg viewBox="0 0 80 24" className="h-6 w-20" aria-hidden="true">
      <path d="M0 12 C 10 0, 20 0, 30 12 S 50 24, 60 12 S 75 2, 80 8" fill="none" stroke="var(--cp-brand)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Orrery({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(520);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { margin: '0px 0px -10% 0px' });
  const time = useMotionValue(0);
  const { games, simulators, isLoading } = useCatalog();
  const cover = games.find((g) => g.thumbnail)?.thumbnail;

  // pointer tilt (desktop)
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), { stiffness: 90, damping: 18 });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), { stiffness: 90, damping: 18 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    if (reduce || paused || !inView) return;
    time.set(time.get() + Math.min(delta, 50) / 1000);
  });

  const count = (n: number) =>
    isLoading ? <span className="inline-block h-4 w-6 animate-pulse rounded bg-surface-2 align-middle" /> : <AnimatedNumber value={n} className="tabular-nums" />;

  const satellites: SatelliteSpec[] = [
    {
      key: 'games',
      orbit: 0,
      phase: 0.4,
      href: '#games',
      label: `Games — ${games.length} to play`,
      mobile: true,
      content: (
        <div className="flex w-40 items-center gap-2.5">
          <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-navy text-night-sage">
            <Thumb src={cover} className="size-full object-cover" fallback={<Gamepad2 className="size-5" />} />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="label-mono text-ink-faint">Games</p>
            <p className="font-semiwide text-lg font-extrabold text-ink">{count(games.length)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'sims',
      orbit: 0,
      phase: 0.4 + Math.PI,
      href: '#simulators',
      label: `Simulators — ${simulators.length} experiments`,
      mobile: true,
      content: (
        <div className="w-40">
          <div className="flex items-center justify-between">
            <p className="label-mono flex items-center gap-1.5 text-ink-faint">
              <FlaskConical className="size-3" /> Lab
            </p>
            <p className="font-semiwide text-lg font-extrabold leading-none text-ink">{count(simulators.length)}</p>
          </div>
          <MiniWave />
        </div>
      ),
    },
    {
      key: 'achievements',
      orbit: 1,
      phase: 2.2,
      href: '#features',
      label: 'Achievements',
      mobile: true,
      content: (
        <div className="flex items-center gap-2 pr-1">
          <span className="grid size-8 place-items-center rounded-full bg-gold-soft text-gold-strong ring-1 ring-gold/40">
            <Award className="size-4" />
          </span>
          <span className="text-sm font-semibold text-ink">Achievements</span>
        </div>
      ),
    },
    {
      key: 'leaderboard',
      orbit: 1,
      phase: 2.2 + Math.PI,
      href: '#how',
      label: 'Leaderboards',
      content: (
        <div className="flex items-center gap-2 pr-1">
          <span className="grid size-8 place-items-center rounded-full bg-rose-soft text-brand-strong">
            <Trophy className="size-4" />
          </span>
          <span className="text-sm font-semibold text-ink">Leaderboards</span>
        </div>
      ),
    },
    {
      key: 'code',
      orbit: 2,
      phase: 4.6,
      href: '#features',
      label: 'Publish your own TSX experiences',
      content: (
        <div className="flex items-center gap-2 font-mono text-xs font-semibold text-ink">
          <Code2 className="size-4 text-brand-strong" /> &lt;Experiment /&gt;
        </div>
      ),
    },
  ];

  return (
    <div
      className={cn('relative mx-auto aspect-square w-full max-w-[580px] select-none', className)}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <motion.div ref={ref} className="absolute inset-0" style={{ rotateX, rotateY, transformPerspective: 1100 }}>
        {/* orbit rings */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
          <defs>
            <radialGradient id="orrery-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--cp-brand)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--cp-brand)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="40" fill="url(#orrery-halo)" />
          {ORBITS.map((o, i) => (
            <ellipse
              key={i}
              cx="50"
              cy="50"
              rx={o.rx * 100}
              ry={o.ry * 100}
              transform={`rotate(${o.tilt} 50 50)`}
              fill="none"
              stroke="var(--cp-ink)"
              strokeOpacity={0.16 - i * 0.02}
              strokeWidth="0.25"
              strokeDasharray={i === 0 ? '0.5 1.2' : undefined}
            />
          ))}
          {/* catalogue ticks on the outer ring */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const o = ORBITS[0];
            const t = (o.tilt * Math.PI) / 180;
            const ex = Math.cos(a) * o.rx * 100;
            const ey = Math.sin(a) * o.ry * 100;
            const cx = 50 + ex * Math.cos(t) - ey * Math.sin(t);
            const cy = 50 + ex * Math.sin(t) + ey * Math.cos(t);
            return <circle key={i} cx={cx} cy={cy} r={i % 6 === 0 ? 0.55 : 0.25} fill="var(--cp-ink)" fillOpacity={i % 6 === 0 ? 0.35 : 0.18} />;
          })}
        </svg>

        {/* the sun: CurioPlay mark */}
        <div className="absolute left-1/2 top-1/2 z-20 grid size-[24%] -translate-x-1/2 -translate-y-1/2 place-items-center">
          <motion.div
            aria-hidden="true"
            className="absolute inset-[-28%] rounded-full bg-brand/15 blur-2xl"
            animate={reduce ? undefined : { scale: [0.9, 1.08, 0.9], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <LogoMark className="relative size-[125%] max-w-none drop-shadow-xl" />
        </div>

        {satellites.map((s) => (
          <Satellite key={s.key} spec={s} time={time} size={size} onHover={setPaused} />
        ))}
      </motion.div>

      {/* plate caption */}
      <p className="label-mono absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-ink-faint">
        Plate I — The collection in orbit
      </p>
    </div>
  );
}
