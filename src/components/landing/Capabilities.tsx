import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, LayoutGroup, motion, useInView, useReducedMotion } from 'motion/react';
import { Award, Check, Code2, Gamepad2, MousePointer2, Play, Trophy } from 'lucide-react';
import { Container, SectionHeading } from '@/components/layout/Section';
import { gamepadAnchor } from './gamepad/gamepadStore';
import { SlidingNumber } from '@/components/motion/sliding-number';
import { RevealGroup, RevealItem } from '@/components/motion/reveal';
import { ease, spring } from '@/lib/motion';
import { cn } from '@/lib/utils';

/*
 * № 04 — Capabilities. Every tile demonstrates its feature instead of describing it:
 * a launch you can watch, a variable you can drag, a score that ticks, a leaderboard
 * that re-orders, a medal that's earned, code that compiles. Loops run only while visible.
 */

/** Advances through `steps` every `ms` while the element is visible (static under reduced motion). */
function useStepper(ref: RefObject<Element | null>, steps: number, ms: number) {
  const inView = useInView(ref, { margin: '-10% 0px' });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % steps), ms);
    return () => window.clearInterval(id);
  }, [inView, reduce, steps, ms]);
  return reduce ? steps - 1 : step;
}

function Tile({
  className,
  index,
  title,
  text,
  children,
  tone = 'surface',
}: {
  className?: string;
  index: string;
  title: string;
  text: string;
  children: ReactNode;
  tone?: 'surface' | 'sage' | 'gold' | 'night';
}) {
  const night = tone === 'night';
  return (
    <RevealItem className={className}>
      <article
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 transition-[border-color,box-shadow] duration-500 sm:p-7',
          tone === 'surface' && 'border-line bg-surface hover:shadow-card',
          tone === 'sage' && 'border-transparent bg-rose-soft',
          tone === 'gold' && 'border-gold/25 bg-gold-soft',
          night && 'grain border-white/10 bg-navy text-white',
        )}
      >
        <p className={cn('label-mono', night ? 'text-night-gold' : 'text-gold-strong')}>{index}</p>
        <h3 className={cn('mt-3 font-semiwide text-2xl font-extrabold leading-tight', night ? 'text-white' : 'text-ink')}>{title}</h3>
        <p className={cn('mt-2 max-w-sm text-[15px] leading-relaxed', night ? 'text-white/65' : 'text-ink-muted')}>{text}</p>
        <div className="relative mt-7 flex-1">{children}</div>
      </article>
    </RevealItem>
  );
}

/* 1 — one-click launch: cursor travels, clicks, the card becomes a stage. */
function LaunchDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useStepper(ref, 4, 1500); // 0 idle · 1 hover · 2 click · 3 playing
  const playing = step === 3;
  return (
    <div ref={ref} className="relative h-full min-h-[300px] rounded-2xl border border-line bg-canvas p-4">
      <LayoutGroup>
        <div className="grid h-full grid-cols-3 gap-3">
          {[0, 1, 2].map((i) =>
            i === 1 && playing ? (
              <div key={i} />
            ) : (
              <motion.div
                key={i}
                layoutId={i === 1 ? 'launch-card' : undefined}
                transition={spring.soft}
                className={cn(
                  'flex flex-col overflow-hidden rounded-xl border border-line bg-surface',
                  i === 1 && step === 1 && 'border-brand/50 shadow-card',
                )}
              >
                <div className={cn('grid flex-1 place-items-center', i === 1 ? 'bg-navy' : 'bg-surface-2')}>
                  <Gamepad2 className={cn('size-6', i === 1 ? 'text-night-sage' : 'text-ink-faint')} />
                </div>
                <div className="space-y-1.5 p-2.5">
                  <div className="h-2 w-3/4 rounded-full bg-line-strong" />
                  <div className="h-1.5 w-1/2 rounded-full bg-line" />
                </div>
              </motion.div>
            ),
          )}
        </div>
        <AnimatePresence>
          {playing && (
            <motion.div
              layoutId="launch-card"
              transition={spring.soft}
              className="absolute inset-3 flex flex-col overflow-hidden rounded-xl bg-navy"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="label-mono text-night-sage">Now playing</span>
                <span className="size-2 animate-pulse rounded-full bg-[#60a5fa]" />
              </div>
              <svg viewBox="0 0 300 120" className="flex-1" preserveAspectRatio="none" aria-hidden="true">
                <motion.path
                  d="M0 60 C 30 10, 60 10, 90 60 S 150 110, 180 60 S 240 10, 300 60"
                  fill="none"
                  stroke="#cde8ff"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, ease: ease.out }}
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
      {/* the visitor's cursor */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 text-ink"
        animate={
          step === 0
            ? { x: '15%', y: '80%', opacity: 0 }
            : step === 3
              ? { x: '80%', y: '85%', opacity: 0 }
              : { x: '48%', y: '45%', opacity: 1, scale: step === 2 ? 0.85 : 1 }
        }
        transition={{ duration: 0.7, ease: ease.inOut }}
        style={{ position: 'absolute' }}
      >
        <MousePointer2 className="size-5 fill-surface" />
        {step === 2 && (
          <motion.span
            className="absolute -left-3 -top-3 size-10 rounded-full border-2 border-brand"
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </motion.div>
    </div>
  );
}

/* 2 — a real control: drag the variable, the system reacts. */
function VariableDemo() {
  const [freq, setFreq] = useState(3);
  const path = useMemo(() => {
    let d = '';
    for (let x = 0; x <= 300; x += 3) {
      const y = 50 + Math.sin((x / 300) * Math.PI * 2 * freq) * 32 * Math.sin((x / 300) * Math.PI);
      d += `${x ? 'L' : 'M'}${x},${y.toFixed(1)} `;
    }
    return d;
  }, [freq]);
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-soft">
      <svg viewBox="0 0 300 100" className="h-28 w-full" aria-hidden="true">
        <line x1="0" x2="300" y1="50" y2="50" stroke="var(--cp-line-strong)" strokeDasharray="3 5" />
        <path d={path} fill="none" stroke="var(--cp-brand)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <label className="mt-3 flex items-center gap-3 text-xs font-semibold text-ink-muted">
        <span className="label-mono">Frequency</span>
        <input
          type="range"
          min={1}
          max={8}
          step={0.5}
          value={freq}
          onChange={(e) => setFreq(Number(e.target.value))}
          aria-label="Wave frequency"
          className="h-1.5 flex-1 cursor-pointer accent-[var(--cp-brand)]"
        />
        <span className="w-10 text-right font-mono tabular-nums text-ink">{freq.toFixed(1)}</span>
      </label>
    </div>
  );
}

/* 3 — scores tick with every round. */
function ScoreDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useStepper(ref, 5, 1400);
  const values = [0, 320, 780, 1140, 1520];
  const gained = step > 0 ? values[step] - values[step - 1] : 0;
  return (
    <div ref={ref} className="flex h-full flex-col justify-end">
      <div className="relative inline-flex items-baseline gap-2">
        <span className="font-wide text-6xl font-extrabold leading-none text-ink">
          <SlidingNumber value={values[step]} />
        </span>
        <span className="label-mono text-ink-faint">pts</span>
        <AnimatePresence>
          {gained > 0 && (
            <motion.span
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: -18 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: ease.out }}
              className="absolute -top-2 right-0 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white"
            >
              +{gained}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* 4 — a leaderboard that actually moves. */
function LeaderboardDemo() {
  const ref = useRef<HTMLOListElement>(null);
  const step = useStepper(ref, 3, 2200);
  const orders = [
    ['Ada', 'Kai', 'You', 'Mo'],
    ['Ada', 'You', 'Kai', 'Mo'],
    ['You', 'Ada', 'Kai', 'Mo'],
  ];
  return (
    <ol ref={ref} className="space-y-2">
      {orders[step].map((name, i) => (
        <motion.li
          layout
          key={name}
          transition={spring.soft}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-3 py-2 text-sm',
            name === 'You' ? 'border-brand/40 bg-brand-soft font-semibold text-brand-strong' : 'border-line bg-surface text-ink',
          )}
        >
          <span className={cn('w-5 font-mono text-xs', i === 0 ? 'text-gold-strong' : 'text-ink-faint')}>{i + 1}</span>
          <span className="flex-1">{name}</span>
          {i === 0 && <Trophy className="size-3.5 text-gold-strong" />}
        </motion.li>
      ))}
    </ol>
  );
}

/* 5 — a medal, earned once. */
function MedalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  return (
    <div ref={ref} className="grid h-full place-items-center">
      <motion.div
        initial={false}
        animate={inView ? { rotateY: 360 } : { rotateY: 0 }}
        transition={{ duration: 1.4, ease: ease.out, delay: 0.3 }}
        className="relative grid size-24 place-items-center overflow-hidden rounded-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-dashed border-line-strong"
          animate={{ opacity: inView ? 0 : 1 }}
          transition={{ delay: 1 }}
        />
        <motion.span
          className="absolute inset-0 rounded-full bg-gradient-to-br from-gold to-gold-strong shadow-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: inView ? 1 : 0 }}
          transition={{ delay: 1, duration: 0.5 }}
        />
        <motion.span
          className="absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/50"
          animate={inView ? { left: '160%' } : {}}
          transition={{ delay: 1.6, duration: 0.9, ease: ease.inOut }}
        />
        <Award className={cn('relative size-10 transition-colors delay-1000 duration-500', inView ? 'text-white' : 'text-ink-faint')} />
      </motion.div>
    </div>
  );
}

/* 6 — publish your own: code types itself, compiles, becomes an exhibit. */
function PublishDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useStepper(ref, 5, 1100);
  const lines = [
    <>
      <span className="text-night-gold">export default</span> <span className="text-night-sage">function</span> Orbit() {'{'}
    </>,
    <>
      {'  '}
      <span className="text-night-sage">const</span> [t, setT] = useState(<span className="text-night-gold">0</span>);
    </>,
    <>
      {'  '}
      <span className="text-night-sage">return</span> &lt;Planet speed={'{'}t{'}'} /&gt;;
    </>,
    <>{'}'}</>,
  ];
  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <pre className="min-h-[124px] overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-[12px] leading-relaxed text-white/85">
        {lines.map((l, i) => (
          <motion.div key={i} initial={false} animate={{ opacity: step > i ? 1 : 0.12 }} transition={{ duration: 0.3 }}>
            {l}
          </motion.div>
        ))}
      </pre>
      <AnimatePresence mode="wait">
        {step === 4 ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.pop}
            className="flex items-center gap-3 rounded-2xl bg-[#ffffff] p-3 pr-4 text-[#071a2e]"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#2563eb] text-white">
              <Play className="size-4 fill-current" />
            </span>
            <span>
              <span className="flex items-center gap-1 text-xs font-bold text-[#2563eb]">
                <Check className="size-3.5" /> Published
              </span>
              <span className="block text-sm font-semibold">Orbit</span>
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-sm text-white/60"
          >
            <Code2 className="size-4" /> Compiling…
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Capabilities() {
  return (
    <section id="features" className="scroll-mt-24 py-24 sm:py-32">
      <Container>
        <div className="relative">
          <SectionHeading
            index="04"
            eyebrow="Capabilities"
            title="Don’t read about it. Watch it work."
            description="Everything in CurioPlay is built to be touched — here’s what that looks like."
          />
          {/* 3D controller waypoint (desktop) */}
          <div
            aria-hidden="true"
            {...gamepadAnchor('features', 4, 'hoverLeft')}
            className="pointer-events-none absolute right-[8%] top-1/2 hidden aspect-[4/3] w-[clamp(200px,17vw,270px)] -translate-y-1/2 xl:block"
          />
        </div>
        <RevealGroup className="mt-14 grid gap-5 lg:grid-cols-12" stagger={0.07}>
          <Tile
            className="lg:col-span-7 lg:row-span-2"
            index="4.1 — Instant"
            title="One click from curious to playing."
            text="No downloads, no setup. Pick an exhibit and it opens on a stage built for it — your session starts tracking right away."
          >
            <LaunchDemo />
          </Tile>
          <Tile
            className="lg:col-span-5"
            tone="sage"
            index="4.2 — Interactive"
            title="Change a variable. Watch it react."
            text="Simulators expose real parameters. Try it — drag the slider."
          >
            <VariableDemo />
          </Tile>
          <Tile className="lg:col-span-5" index="4.3 — Scored" title="Every round counts." text="Scores are saved to your profile the moment you submit them.">
            <ScoreDemo />
          </Tile>
          <Tile className="lg:col-span-4" index="4.4 — Competitive" title="Leaderboards that move." text="Per-game rankings and a global hall of fame.">
            <LeaderboardDemo />
          </Tile>
          <Tile className="lg:col-span-3" tone="gold" index="4.5 — Earned" title="Medals worth keeping." text="Achievements unlock as you improve.">
            <MedalDemo />
          </Tile>
          <Tile
            className="lg:col-span-5"
            tone="night"
            index="4.6 — Open"
            title="Publish your own."
            text="Creators paste a single React TSX file — it compiles in the browser and joins the collection."
          >
            <PublishDemo />
          </Tile>
        </RevealGroup>
      </Container>
    </section>
  );
}
