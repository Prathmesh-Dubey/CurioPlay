import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { Container, SectionHeading } from '@/components/layout/Section';
import { buttonClasses } from '@/components/ui/Button';
import { CornerTicks } from '@/components/ui/Decor';
import { Thumb } from '@/components/ui/Thumb';
import { Skeleton } from '@/components/ui/Skeleton';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { RevealGroup, RevealItem } from '@/components/motion/reveal';
import { useCatalog, type CatalogItem } from '@/hooks/useCatalog';
import { entryPath, experiencePath } from '@/lib/session';
import { cn } from '@/lib/utils';

/*
 * № 03 — The Laboratory (night chapter). Graph paper, film grain, an oscilloscope whose
 * phase is driven by scroll (no idle loop), live readouts, a field index, and specimen
 * sheets pinned slightly askew on the bench — they straighten when you pick one up.
 */

function Oscilloscope({ progress }: { progress: MotionValue<number> }) {
  const W = 1200;
  const H = 120;
  const path = (phase: number, amp: number, freq: number) => {
    let d = '';
    for (let x = 0; x <= W; x += 8) {
      const env = Math.sin((x / W) * Math.PI); // fade at the edges
      const y = H / 2 + Math.sin((x / W) * Math.PI * 2 * freq + phase) * amp * env;
      d += `${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)} `;
    }
    return d;
  };
  const d1 = useTransform(progress, (p) => path(p * 14, 38, 4));
  const d2 = useTransform(progress, (p) => path(p * 10 + 1.2, 22, 6.5));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-24 w-full sm:h-28" aria-hidden="true">
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="rgb(205 232 255 / 0.18)" strokeDasharray="4 8" />
      <motion.path d={d2} fill="none" stroke="#9db3cf" strokeOpacity="0.55" strokeWidth="1.5" />
      <motion.path d={d1} fill="none" stroke="#cde8ff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Specimen({ item, exp, tilt }: { item: CatalogItem; exp: number; tilt: number }) {
  return (
    <Link
      to={experiencePath(item.id, 'simulator')}
      style={{ ['--tilt' as string]: `${tilt}deg` }}
      className="group relative block rotate-[var(--tilt)] rounded-[18px] bg-[#ffffff] p-3 text-[#071a2e] shadow-[0_20px_40px_-20px_rgb(0_0_0/0.6)] transition-[transform,translate,scale,rotate,box-shadow] duration-500 ease-out-expo hover:-translate-y-2 hover:rotate-0 hover:shadow-[0_30px_60px_-20px_rgb(0_0_0/0.7)] focus-visible:rotate-0"
    >
      <CornerTicks className="text-[#071a2e]/30" inset={8} size={8} />
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#071a2e]/10 bg-[#cde8ff]">
        <Thumb
          src={item.thumbnail}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
          fallback={
            <div className="bg-graph grid size-full place-items-center">
              <FlaskConical className="size-8 text-[#2563eb]" />
            </div>
          }
        />
      </div>
      <div className="flex items-start justify-between gap-3 px-1 pb-1 pt-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1e6fb8]">
            EXP-{String(exp).padStart(3, '0')}
          </p>
          <p className="mt-1 truncate text-[15px] font-bold leading-tight">{item.title}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#3e5674]">
            Field · {item.category || 'General'}
          </p>
        </div>
        <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-[#2563eb] text-white transition-transform duration-300 group-hover:translate-x-0.5">
          <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

export function LabChapter() {
  const { simulators, isLoading } = useCatalog();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  const { expById, fields, newest } = useMemo(() => {
    const asc = [...simulators].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const map = new Map(asc.map((s, i) => [s.id, i + 1]));
    const counts = new Map<string, number>();
    simulators.forEach((s) => {
      const k = s.category?.trim() || 'General';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    const f = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return { expById: map, fields: f, newest: asc[asc.length - 1] };
  }, [simulators]);

  const specimens = useMemo(
    () => [...simulators].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [simulators],
  );
  const tilts = [-1.6, 1.1, -0.6, 1.4, -1.2, 0.8];

  return (
    <section id="simulators" ref={ref} className="scroll-mt-24 px-3 sm:px-5">
      <div className="grain relative isolate overflow-hidden rounded-[32px] bg-navy py-20 text-white sm:rounded-[40px] sm:py-28">
        <div className="bg-graph-night pointer-events-none absolute inset-0 -z-10" />
        <div className="pointer-events-none absolute -right-32 top-0 -z-10 size-[520px] rounded-full bg-brand/30 blur-3xl" />

        <Container>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              night
              index="03"
              eyebrow="The laboratory · Simulators"
              title="A laboratory that fits in a browser tab."
              description="Physics, statistics, chemistry and more — experiments you can run, tweak and measure, without a single piece of equipment."
            />
            <Link to={entryPath()} className={buttonClasses('night', 'md')}>
              Enter the lab <ArrowRight data-icon="trailing" className="size-4" />
            </Link>
          </div>

          {/* instrument band */}
          <div className="mt-14 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { k: 'Experiments', v: simulators.length },
                { k: 'Fields', v: fields.length },
              ].map((r) => (
                <div key={r.k}>
                  <p className="label-mono text-night-sage/70">{r.k}</p>
                  {isLoading ? (
                    <Skeleton className="mt-2 h-10 w-16 bg-white/10" />
                  ) : (
                    <AnimatedNumber value={r.v} className="mt-1 block font-wide text-5xl font-extrabold tabular-nums" />
                  )}
                </div>
              ))}
              <div className="min-w-0">
                <p className="label-mono text-night-sage/70">Newest specimen</p>
                <p className="mt-2 truncate text-lg font-semibold">{isLoading ? '…' : newest?.title ?? '—'}</p>
                <p className="label-mono mt-1 text-night-gold">{newest ? `EXP-${String(expById.get(newest.id)).padStart(3, '0')}` : ''}</p>
              </div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-2">
              <Oscilloscope progress={scrollYProgress} />
            </div>
          </div>

          {/* field index */}
          {fields.length > 0 && (
            <div className="mt-10">
              <p className="label-mono mb-4 text-night-sage/70">Field index</p>
              <ul className="flex flex-wrap gap-2">
                {fields.slice(0, 8).map(([name, n], i) => (
                  <motion.li
                    key={name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-sm"
                  >
                    <span className="font-medium">{name}</span>
                    <span className="font-mono text-[11px] text-night-gold">{String(n).padStart(2, '0')}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* specimen bench */}
          <div className="mt-14">
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3.6] rounded-[18px] bg-white/10" />
                ))}
              </div>
            ) : specimens.length === 0 ? (
              <p className="rounded-[20px] border border-dashed border-white/20 px-6 py-12 text-center text-white/70">
                The lab is being calibrated — simulators will appear here soon.
              </p>
            ) : (
              <RevealGroup className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
                {specimens.map((s, i) => (
                  <RevealItem key={s.id} className={cn(i % 3 === 1 && 'lg:translate-y-8')}>
                    <Specimen item={s} exp={expById.get(s.id) ?? i + 1} tilt={tilts[i % tilts.length]} />
                  </RevealItem>
                ))}
              </RevealGroup>
            )}
          </div>
        </Container>
      </div>
    </section>
  );
}
