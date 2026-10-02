import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { LOGO_SRC } from '@/components/ui/Logo';
import { useBackClose } from '@/lib/backStack';
import { ease, spring } from '@/lib/motion';
import { cn } from '@/lib/utils';

/* Colours lifted from the logo artwork: controller blue, pink, gold, sky, brand. */
const COLORS = ['#5b7fb5', '#e8a5b3', '#d4b06a', '#8bcbff', '#2563eb', '#f4c6cf'];

type Shape = 'rect' | 'dot' | 'star';

interface Piece {
  id: number;
  shape: Shape;
  color: string;
  size: number;
  x: number;
  y: number;
  fall: number;
  rotate: number;
  delay: number;
  duration: number;
}

/** Deterministic pseudo-random so a burst looks the same on every render of the same seed. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makePieces(count: number, spread: number, seed: number): Piece[] {
  const r = rng(seed);
  return Array.from({ length: count }, (_, id) => {
    const angle = r() * Math.PI * 2;
    const dist = spread * (0.35 + r() * 0.65);
    const shapes: Shape[] = ['rect', 'rect', 'dot', 'star'];
    return {
      id,
      shape: shapes[Math.floor(r() * shapes.length)],
      color: COLORS[Math.floor(r() * COLORS.length)],
      size: 6 + r() * 8,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.75 - spread * 0.25,
      fall: spread * (0.45 + r() * 0.5),
      rotate: (r() - 0.5) * 720,
      delay: r() * 0.15,
      duration: 1.5 + r() * 0.9,
    };
  });
}

function PieceShape({ p }: { p: Piece }) {
  if (p.shape === 'dot') return <span className="block rounded-full" style={{ width: p.size * 0.8, height: p.size * 0.8, background: p.color }} />;
  if (p.shape === 'star')
    return (
      <svg viewBox="0 0 24 24" style={{ width: p.size * 1.3, height: p.size * 1.3 }} fill={p.color}>
        <path d="M12 0c.9 6.6 4.5 10.6 12 12-7.5 1.4-11.1 5.4-12 12-.9-6.6-4.5-10.6-12-12C7.5 10.6 11.1 6.6 12 0Z" />
      </svg>
    );
  return <span className="block rounded-[2px]" style={{ width: p.size, height: p.size * 0.45, background: p.color }} />;
}

/** A one-shot confetti burst from the centre of its (relative) parent. */
export function ConfettiBurst({
  count = 60,
  spread = 260,
  seed = 7,
  delay = 0,
  className,
}: {
  count?: number;
  spread?: number;
  seed?: number;
  /** Seconds before the burst fires. */
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pieces = useMemo(() => makePieces(count, spread, seed), [count, spread, seed]);
  if (reduce) return null;
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-visible', className)}>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{
            x: [0, p.x, p.x * 1.1],
            y: [0, p.y, p.y + p.fall],
            opacity: [1, 1, 0],
            scale: [0.4, 1, 0.9],
            rotate: [0, p.rotate * 0.6, p.rotate],
          }}
          transition={{ duration: p.duration, delay: delay + p.delay, times: [0, 0.35, 1], ease: ['easeOut', 'easeIn'] }}
        >
          <PieceShape p={p} />
        </motion.span>
      ))}
    </div>
  );
}

/**
 * The CurioPlay logo, celebrating: it bounces in, then floats; a glow breathes behind it, ripple rings expand from it,
 * and a band of light sweeps across the artwork itself (masked to the logo's own shape). Size it with `className`.
 */
export function AnimatedLogo({ className, delay = 0 }: { className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const loop = (duration: number, extra = 0) => ({ duration, repeat: Infinity, ease: 'easeInOut' as const, delay: delay + extra });

  return (
    <div className={cn('relative aspect-[1225/873]', className)}>
      <motion.span
        aria-hidden="true"
        className="absolute inset-[-14%] rounded-full bg-brand/35 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.45, 1, 0.45], scale: [0.9, 1.1, 0.9] }}
        transition={loop(3.4)}
      />
      {!reduce &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="absolute inset-[10%] rounded-[44%] border-2 border-[#8bcbff]/50"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0.7, 0], scale: [0.85, 1.55] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: delay + 0.6 + i * 1.1 }}
          />
        ))}

      <motion.div
        className="relative size-full"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25, rotate: -14, y: 36 }}
        animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
        transition={{ delay, type: 'spring', bounce: 0.55, duration: 1.15 }}
      >
        <motion.div
          className="relative size-full"
          animate={reduce ? undefined : { y: [0, -7, 0], rotate: [0, 1.2, 0, -1.2, 0] }}
          transition={{ y: loop(3.2, 1.1), rotate: loop(6.4, 1.1) }}
        >
          <img src={LOGO_SRC} alt="CurioPlay" draggable={false} className="size-full select-none object-contain drop-shadow-[0_20px_40px_rgb(0_0_0/0.4)]" />
          {/* Sweep of light, clipped to the logo's silhouette. */}
          {!reduce && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{
                WebkitMaskImage: `url(${LOGO_SRC})`,
                maskImage: `url(${LOGO_SRC})`,
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
              }}
            >
              <motion.span
                className="absolute inset-y-[-10%] left-0 w-1/3 -skew-x-[18deg] bg-gradient-to-r from-transparent via-white/80 to-transparent"
                initial={{ x: '-150%' }}
                animate={{ x: ['-150%', '420%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut', delay: delay + 1 }}
              />
            </span>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Sign-up: a full-screen "Congratulations" moment. Continues on its own, or on the button. */
export function SignupCelebration({ username, onContinue, autoMs = 3200 }: { username: string; onContinue: () => void; autoMs?: number }) {
  const reduce = useReducedMotion();

  useBackClose(true, onContinue);

  useEffect(() => {
    const t = window.setTimeout(onContinue, autoMs);
    return () => window.clearTimeout(t);
  }, [onContinue, autoMs]);

  return createPortal(
    <motion.div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="signup-celebration-title"
      className="fixed inset-0 z-[100] grid place-items-center bg-navy/70 p-5 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Two bursts: one big, one a beat later, for a "pop pop" feel. */}
      <ConfettiBurst count={90} spread={420} seed={11} />
      <ConfettiBurst count={50} spread={300} seed={29} delay={0.45} />

      <motion.div
        className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-surface p-7 text-center shadow-float sm:p-8"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 40, rotate: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
        transition={spring.pop}
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-brand/25 blur-3xl" />

        <AnimatedLogo delay={0.1} className="relative mx-auto w-52" />

        <motion.p
          className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-strong"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: ease.out }}
        >
          Account created
        </motion.p>

        <motion.h2
          id="signup-celebration-title"
          className="relative mt-3 font-semiwide text-3xl font-extrabold leading-tight text-ink"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45, ease: ease.out }}
        >
          Congratulations{username ? ',' : '!'}
          {username && <span className="block truncate text-brand-strong">{username}!</span>}
        </motion.h2>

        <motion.p
          className="relative mt-3 text-sm leading-relaxed text-ink-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          Welcome to the club. Your scores, medals and leaderboard spot start now.
        </motion.p>

        <motion.button
          type="button"
          onClick={onContinue}
          className="group relative mt-6 inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand font-semibold text-white shadow-card transition-colors hover:bg-brand-strong"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4, ease: ease.out }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          autoFocus
        >
          <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 transition-transform duration-700 group-hover:translate-x-[420%]" />
          Let's play <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </motion.button>

        {/* Auto-continue timer */}
        <div className="relative mx-auto mt-4 h-1 w-24 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full bg-gradient-to-r from-brand via-[#e8a5b3] to-[#d4b06a]"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: autoMs / 1000, ease: 'linear' }}
          />
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/** Login: a lighter in-card celebration — badge pop, a small burst, and a hello. */
export function LoginCelebration({ username }: { username: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring.soft}
      className="relative flex flex-col items-center py-4 text-center"
      role="status"
    >
      <div className="relative grid w-full place-items-center">
        <ConfettiBurst count={44} spread={210} seed={5} />
        <AnimatedLogo className="w-56 sm:w-60" />
      </div>
      <motion.h2
        className="mt-5 font-semiwide text-2xl font-extrabold text-ink"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4, ease: ease.out }}
      >
        Welcome back{username ? ',' : '!'} {username && <span className="text-brand-strong">{username}!</span>}
      </motion.h2>
      <motion.p className="mt-2 text-sm text-ink-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        Opening your field guide…
      </motion.p>
      <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full bg-brand" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.4, ease: 'linear' }} />
      </div>
    </motion.div>
  );
}
