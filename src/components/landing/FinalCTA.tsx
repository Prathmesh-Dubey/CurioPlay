import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Section';
import { buttonClasses } from '@/components/ui/Button';
import { Magnetic } from '@/components/motion/magnetic';
import { TextEffect } from '@/components/motion/text-effect';
import { entryPath } from '@/lib/session';
import { cn } from '@/lib/utils';

/*
 * Final chapter — a night sky of curiosities. A deterministic constellation drifts against
 * the pointer (two parallax depths); the headline writes itself in when it's seen; one
 * strong action, one quiet one.
 */

function seeded(n: number) {
  let s = 1337;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: n }, () => ({ x: rnd() * 100, y: rnd() * 100, r: 0.25 + rnd() * 0.55, d: rnd() }));
}

export function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });
  const stars = useMemo(() => seeded(42), []);
  const links = useMemo(() => {
    const out: [number, number][] = [];
    stars.forEach((a, i) =>
      stars.forEach((b, j) => {
        if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < 14) out.push([i, j]);
      }),
    );
    return out;
  }, [stars]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const nearX = useSpring(useTransform(mx, [-0.5, 0.5], [-18, 18]), { stiffness: 60, damping: 20 });
  const nearY = useSpring(useTransform(my, [-0.5, 0.5], [-12, 12]), { stiffness: 60, damping: 20 });
  const farX = useTransform(nearX, (v) => v * 0.4);
  const farY = useTransform(nearY, (v) => v * 0.4);

  return (
    <section className="px-3 py-16 sm:px-5 sm:py-24">
      <div
        ref={ref}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        className="grain relative isolate overflow-hidden rounded-[32px] bg-navy py-24 text-white sm:rounded-[40px] sm:py-36"
      >
        {/* far layer: links */}
        <motion.svg
          style={{ x: farX, y: farY }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 -z-10 size-full"
          aria-hidden="true"
        >
          {links.map(([a, b], i) => (
            <motion.line
              key={i}
              x1={stars[a].x}
              y1={stars[a].y}
              x2={stars[b].x}
              y2={stars[b].y}
              stroke="#cde8ff"
              strokeOpacity="0.12"
              strokeWidth="0.12"
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : {}}
              transition={{ duration: 1.6, delay: 0.2 + (i % 12) * 0.05 }}
            />
          ))}
        </motion.svg>
        {/* near layer: stars */}
        <motion.svg
          style={{ x: nearX, y: nearY }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 -z-10 size-full"
          aria-hidden="true"
        >
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.35} fill={i % 9 === 0 ? '#8bcbff' : '#cde8ff'} fillOpacity={0.35 + s.d * 0.5} />
          ))}
        </motion.svg>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/25 blur-3xl" />

        <Container className="relative text-center">
          <p className="label-mono text-night-sage/80">
            <span className="text-night-gold">№ 08</span> — Explore beyond the ordinary
          </p>
          <h2 className="mx-auto mt-6 max-w-4xl font-wide text-display font-extrabold">
            <TextEffect as="span" per="word" preset="fade-in-blur" trigger={inView} speedSegment={0.5}>
              Your next discovery starts here.
            </TextEffect>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/65">Learn it. Play it. Experience it.</p>

          <div className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic intensity={0.3} range={120}>
              <Link to={entryPath()} className={buttonClasses('night', 'lg', 'w-full sm:w-auto')}>
                Start exploring <ArrowRight data-icon="trailing" className="size-4" />
              </Link>
            </Magnetic>
            <a href="#explore" className={cn(buttonClasses('night-outline', 'lg'), 'w-full sm:w-auto')}>
              Browse the collection
            </a>
          </div>
        </Container>
      </div>
    </section>
  );
}
