import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Section';
import { buttonClasses } from '@/components/ui/Button';
import { AnimatedGroup } from '@/components/motion/animated-group';
import { Magnetic } from '@/components/motion/magnetic';
import { TextEffect } from '@/components/motion/text-effect';
import { TextMorph } from '@/components/motion/text-morph';
import { TextShimmer } from '@/components/motion/text-shimmer';
import { entryPath } from '@/lib/session';
import { ease } from '@/lib/motion';
import { Orrery } from './Orrery';

/*
 * Hero — "Plate I". Editorial wide type on ivory paper; the last word of the headline
 * morphs between the rooms of the guide (playground → laboratory → arcade → classroom).
 * A cursor-following light warms the page; the orrery on the right is the live collection.
 * Scrolling away lifts the copy and swings the orrery slightly — a hand-off to the next plate.
 */

const ROOMS = ['playground.', 'laboratory.', 'arcade.', 'classroom.'];

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [room, setRoom] = useState(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const orreryScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const orreryRotate = useTransform(scrollYProgress, [0, 1], [0, 10]);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setRoom((r) => (r + 1) % ROOMS.length), 2800);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <section
      id="top"
      ref={sectionRef}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      className="relative isolate overflow-hidden pb-20 pt-28 sm:pt-32 lg:min-h-[100svh] lg:pb-24 lg:pt-36"
    >
      {/* atmosphere: faint grid + a light that follows the cursor */}
      <div className="cp-grid-bg pointer-events-none absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 [@media(hover:hover)]:opacity-100"
        style={{
          background:
            'radial-gradient(520px circle at var(--mx, 70%) var(--my, 30%), color-mix(in srgb, var(--cp-brand) 11%, transparent), transparent 65%)',
        }}
      />
      <div className="pointer-events-none absolute -left-40 bottom-0 -z-10 size-[480px] rounded-full bg-rose-soft blur-3xl" />

      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-6">
          <motion.div style={{ y: copyY, opacity: copyOpacity }} className="@container lg:col-span-6">
            <AnimatedGroup preset="blur-slide" className="flex flex-col items-start [&>*]:max-w-full">
              <a
                href="#explore"
                className="group inline-flex max-w-full items-center gap-2.5 rounded-full border border-line bg-surface/85 py-1.5 pl-1.5 pr-4 shadow-soft backdrop-blur transition-colors hover:border-brand/40"
              >
                <span className="shrink-0 rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  New
                </span>
                <TextShimmer
                  as="span"
                  duration={3.2}
                  className="min-w-0 truncate text-[13px] font-semibold [--base-color:var(--cp-ink-muted)] [--base-gradient-color:var(--cp-ink)] dark:[--base-color:var(--cp-ink-muted)] dark:[--base-gradient-color:#ffffff]"
                >
                  Introducing CurioPlay — a field guide to curiosity
                </TextShimmer>
                <ArrowRight className="size-3.5 shrink-0 text-ink-faint transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>
            </AnimatedGroup>

            <h1 className="mt-8 font-wide text-[length:clamp(2.1rem,11.2cqw,4.75rem)] font-extrabold leading-[0.95] text-ink">
              <span className="sr-only">Curiosity has a new playground.</span>
              <TextEffect as="span" per="word" preset="fade-in-blur" speedSegment={0.45} className="block whitespace-nowrap" aria-hidden="true">
                Curiosity
              </TextEffect>
              <TextEffect
                as="span"
                per="word"
                preset="fade-in-blur"
                delay={0.18}
                speedSegment={0.45}
                className="block whitespace-nowrap"
                aria-hidden="true"
              >
                has a new
              </TextEffect>
              <motion.span
                aria-hidden="true"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8, ease: ease.out }}
                className="block whitespace-nowrap text-brand"
              >
                <TextMorph as="span" className="inline-flex whitespace-nowrap">
                  {ROOMS[room]}
                </TextMorph>
              </motion.span>
            </h1>

            <AnimatedGroup
              preset="slide"
              variants={{ container: { visible: { transition: { staggerChildren: 0.1, delayChildren: 0.75 } } } }}
              className="flex flex-col items-start"
            >
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-muted">
                Interactive simulators, browser games and hands-on coding experiences — catalogued, scored and one
                click away. Learning you actually look forward to.
              </p>

              <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Magnetic intensity={0.25} range={110}>
                  <a href="#games" className={buttonClasses('primary', 'lg', 'w-full sm:w-auto')}>
                    Explore experiences <ArrowDown data-icon="trailing" className="size-4" />
                  </a>
                </Magnetic>
                <Link to={entryPath()} className={buttonClasses('outline', 'lg')}>
                  Enter CurioPlay <ArrowRight data-icon="trailing" className="size-4" />
                </Link>
              </div>

              <dl className="mt-10 grid w-full max-w-lg grid-cols-3 gap-4 border-t border-line pt-5">
                {[
                  ['Runs', 'In the browser'],
                  ['Installs', 'None needed'],
                  ['Platforms', 'Web & Android'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="label-mono text-ink-faint">{k}</dt>
                    <dd className="mt-1 text-sm font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </AnimatedGroup>
          </motion.div>

          <motion.div
            className="lg:col-span-6"
            style={{ scale: orreryScale, rotate: orreryRotate }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.1, ease: ease.out, delay: 0.2 }}
          >
            <Orrery className="max-w-[420px] sm:max-w-[560px]" />
          </motion.div>
        </div>

        <motion.a
          href="#explore"
          style={{ opacity: copyOpacity }}
          className="mt-14 hidden items-center gap-3 text-ink-faint transition-colors hover:text-ink lg:inline-flex"
        >
          <span className="relative h-10 w-px overflow-hidden bg-line-strong">
            <motion.span
              className="absolute inset-x-0 top-0 h-1/2 bg-brand"
              animate={reduce ? undefined : { y: ['-100%', '200%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: ease.inOut }}
            />
          </span>
          <span className="label-mono">Scroll to explore</span>
        </motion.a>
      </Container>
    </section>
  );
}
