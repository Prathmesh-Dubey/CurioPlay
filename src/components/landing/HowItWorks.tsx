import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { Award, FlaskConical, Gamepad2, Search, Trophy } from 'lucide-react';
import { Container, SectionHeading } from '@/components/layout/Section';
import { SlidingNumber } from '@/components/motion/sliding-number';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ease, spring } from '@/lib/motion';
import { cn } from '@/lib/utils';

/*
 * № 05 — How it works, as a pinned scroll sequence. The left column is the story
 * (three numbered moves on a progress rail); the right is a miniature CurioPlay that
 * acts each move out: search filters the shelf, a card becomes a stage, the score climbs
 * and a medal lands. Desktop: driven by scroll. Phones: plays through on its own.
 */

const STEPS = [
  { n: '01', title: 'Discover', text: 'Search the collection or wander the shelves. Every exhibit says what it is and how it scores.' },
  { n: '02', title: 'Launch', text: 'One click opens it on its own stage. Your session starts and the experience runs right in the browser.' },
  { n: '03', title: 'Explore', text: 'Play, experiment, improve. Scores save to your profile, medals unlock, rankings update.' },
];

const SHELF = [
  { id: 'a', title: 'Free Fall', tag: 'Physics', sim: true },
  { id: 'b', title: 'Flappy bird', tag: 'Casual', sim: false },
  { id: 'c', title: 'Projectile', tag: 'Physics', sim: true },
  { id: 'd', title: 'Memory match', tag: 'Puzzle', sim: false },
  { id: 'e', title: 'Regression', tag: 'Statistics', sim: true },
  { id: 'f', title: 'Bubble Burst', tag: 'Puzzle', sim: false },
];

function Typed({ text, active }: { text: string; active: boolean }) {
  const [n, setN] = useState(active ? 0 : text.length);
  useEffect(() => {
    if (!active) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 90);
    return () => window.clearInterval(id);
  }, [active, text]);
  return (
    <span>
      {text.slice(0, n)}
      <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-ink" />
    </span>
  );
}

function MiniApp({ step }: { step: number }) {
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setSearched(false);
    if (step !== 0) return;
    const id = window.setTimeout(() => setSearched(true), 900);
    return () => window.clearTimeout(id);
  }, [step]);

  const shelf = step === 0 && !searched ? SHELF : SHELF.filter((s) => s.tag === 'Physics');

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] border border-line bg-canvas shadow-float">
      {/* chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="label-mono ml-3 truncate text-ink-faint">curioplay / {step === 0 ? 'library' : 'lab / free-fall'}</span>
      </div>

      <div className="relative flex-1 p-4 sm:p-5">
        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            {step === 0 && (
              <motion.div key="lib" exit={{ opacity: 0, transition: { duration: 0.2 } }} className="flex h-full flex-col">
                <div className="mb-4 flex h-10 items-center gap-2 rounded-xl border border-brand/50 bg-surface px-3 text-sm text-ink shadow-[var(--cp-ring)]">
                  <Search className="size-4 text-brand-strong" />
                  <Typed text="physics" active={step === 0} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                    {shelf.map((s, i) => (
                      <motion.div
                        key={s.id}
                        layout
                        layoutId={s.id === 'a' ? 'how-card' : undefined}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={spring.soft}
                        className={cn(
                          'overflow-hidden rounded-xl border bg-surface',
                          searched && i === 0 ? 'border-brand/50 shadow-card' : 'border-line',
                        )}
                      >
                        <div className={cn('grid aspect-[4/3] place-items-center', s.sim ? 'bg-graph bg-rose-soft' : 'bg-navy')}>
                          {s.sim ? <FlaskConical className="size-5 text-brand-strong" /> : <Gamepad2 className="size-5 text-night-sage" />}
                        </div>
                        <div className="p-2">
                          <p className="truncate text-[11px] font-semibold text-ink">{s.title}</p>
                          <p className="label-mono truncate text-[9px] text-ink-faint">{s.tag}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {step >= 1 && (
              <motion.div
                key="stage"
                layoutId="how-card"
                transition={spring.soft}
                className={cn('absolute inset-x-4 top-4 flex flex-col overflow-hidden rounded-xl bg-navy sm:inset-x-5 sm:top-5', step === 1 ? 'bottom-4 sm:bottom-5' : 'h-[52%]')}
              >
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                  <span className="label-mono text-night-sage">Free Fall · Live</span>
                  <span className="size-1.5 animate-pulse rounded-full bg-[#60a5fa]" />
                </div>
                <div className="relative flex-1">
                  {/* a pendulum, the experiment */}
                  <motion.div
                    className="absolute left-1/2 top-2 h-[70%] w-px origin-top bg-night-sage/60"
                    animate={{ rotate: [-28, 28, -28] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span className="absolute -bottom-3 left-1/2 size-6 -translate-x-1/2 rounded-full bg-night-gold shadow-[0_0_20px_rgb(139_203_255/0.6)]" />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>

        {/* step 3: results */}
        <AnimatePresence>
          {step === 2 && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: ease.out, delay: 0.25 }}
              className="absolute inset-x-4 bottom-4 grid grid-cols-2 gap-3 sm:inset-x-5 sm:bottom-5"
            >
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="label-mono text-ink-faint">Score</p>
                <div className="mt-1 font-wide text-3xl font-extrabold text-ink">
                  <SlidingNumber value={step === 2 ? 860 : 0} />
                </div>
              </div>
              <div className="space-y-1.5 rounded-xl border border-line bg-surface p-3">
                <p className="label-mono flex items-center gap-1.5 text-ink-faint">
                  <Trophy className="size-3" /> Ranking
                </p>
                {['Ada', 'You'].map((n, i) => (
                  <motion.p
                    layout
                    key={n}
                    className={cn('flex justify-between text-xs', n === 'You' ? 'font-bold text-brand-strong' : 'text-ink-muted')}
                  >
                    <span>
                      {i + 1}. {n}
                    </span>
                    <span className="font-mono">{n === 'You' ? 860 : 910}</span>
                  </motion.p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ ...spring.pop, delay: 0.9 }}
              className="absolute right-6 top-6 flex items-center gap-2.5 rounded-2xl border border-gold/40 bg-surface py-2 pl-2 pr-4 shadow-float"
            >
              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-strong text-white">
                <Award className="size-4" />
              </span>
              <span className="leading-tight">
                <span className="label-mono block text-gold-strong">Unlocked</span>
                <span className="text-xs font-bold text-ink">First Orbit</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const reduce = useReducedMotion();
  const inView = useInView(ref, { margin: '-20% 0px' });
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (!isDesktop) return;
    setStep(p < 0.34 ? 0 : p < 0.67 ? 1 : 2);
  });

  // phones: autoplay through the steps while visible
  useEffect(() => {
    if (isDesktop || !inView || reduce) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % 3), 3600);
    return () => window.clearInterval(id);
  }, [isDesktop, inView, reduce]);

  return (
    <section id="how" ref={ref} className="relative scroll-mt-24 lg:h-[300vh]">
      <div className="py-24 sm:py-32 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:py-0">
        <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <SectionHeading index="05" eyebrow="How it works" size="title" title="From curious to hands-on in three moves." />

            <ol className="relative mt-10 space-y-2">
              {/* progress rail */}
              <span className="absolute bottom-3 left-[1.15rem] top-3 w-px bg-line" aria-hidden="true" />
              <motion.span
                aria-hidden="true"
                className="absolute left-[1.15rem] top-3 w-px origin-top bg-brand"
                animate={{ height: `${(step / 2) * 100}%` }}
                transition={{ duration: 0.5, ease: ease.out }}
                style={{ maxHeight: 'calc(100% - 1.5rem)' }}
              />
              {STEPS.map((s, i) => {
                const on = i === step;
                const done = i < step;
                return (
                  <li key={s.n}>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(i);
                        if (isDesktop && ref.current) {
                          const top = ref.current.offsetTop + (ref.current.offsetHeight - window.innerHeight) * (i / 2 + 0.05);
                          window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
                        }
                      }}
                      aria-current={on ? 'step' : undefined}
                      className="group relative flex w-full items-start gap-5 rounded-2xl p-2 text-left"
                    >
                      <span
                        className={cn(
                          'relative z-10 mt-1 grid size-[2.3rem] shrink-0 place-items-center rounded-full border font-mono text-xs font-semibold transition-colors duration-500',
                          on ? 'border-brand bg-brand text-white' : done ? 'border-brand bg-surface text-brand-strong' : 'border-line-strong bg-canvas text-ink-faint',
                        )}
                      >
                        {s.n}
                      </span>
                      <span className="min-w-0">
                        <span className={cn('block font-semiwide text-2xl font-extrabold transition-colors duration-500', on ? 'text-ink' : 'text-ink-faint')}>
                          {s.title}
                        </span>
                        <motion.span
                          initial={false}
                          animate={{ height: on ? 'auto' : 0, opacity: on ? 1 : 0 }}
                          transition={{ duration: 0.45, ease: ease.out }}
                          className="block overflow-hidden"
                        >
                          <span className="block pt-2 text-[15px] leading-relaxed text-ink-muted">{s.text}</span>
                        </motion.span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="lg:col-span-7">
            <div className="relative aspect-[4/3.4] w-full sm:aspect-[4/3]">
              <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] bg-rose-soft/70 blur-2xl" />
              <MiniApp step={step} />
            </div>
            <p className="label-mono mt-4 text-center text-ink-faint">
              Fig. {STEPS[step].n} — {STEPS[step].title}
            </p>
          </div>
        </Container>
      </div>
    </section>
  );
}
