import { useMemo, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { Container, SectionHeading } from '@/components/layout/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { OrbitLines } from '@/components/ui/Decor';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { RevealGroup, RevealItem } from '@/components/motion/reveal';
import { useCatalog } from '@/hooks/useCatalog';
import { ease } from '@/lib/motion';

/*
 * № 01 — The collection. A museum catalogue index instead of "stat cards":
 * hairline rows, index numbers, wide numerals that count up once when seen.
 * Every number is real (API counts). Rows link to their chapter.
 */

interface Row {
  index: string;
  label: string;
  note: string;
  value?: number;
  href: string;
}

function CatalogueRow({ row, loading, inView }: { row: Row; loading: boolean; inView: boolean }) {
  return (
    <RevealItem>
      <a
        href={row.href}
        className="group relative grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 overflow-hidden border-b border-line py-6 sm:grid-cols-[3.5rem_1fr_auto] sm:py-7"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 origin-left scale-x-0 bg-rose-soft/70 transition-transform duration-500 ease-out-expo group-hover:scale-x-100"
        />
        <span className="label-mono pl-1 text-gold-strong">{row.index}</span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-lg font-bold text-ink sm:text-xl">
            {row.label}
            <ArrowUpRight className="size-4 -translate-x-1 text-brand-strong opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
          </span>
          <span className="mt-0.5 block text-sm text-ink-muted">{row.note}</span>
        </span>
        <span className="pr-1 text-right">
          {loading ? (
            <Skeleton className="h-12 w-20 sm:h-16 sm:w-28" />
          ) : row.value === undefined ? (
            <span className="font-wide text-5xl font-extrabold text-ink-faint sm:text-7xl">—</span>
          ) : (
            <AnimatedNumber
              value={inView ? row.value : 0}
              springOptions={{ bounce: 0, duration: 1600 }}
              className="font-wide text-5xl font-extrabold tabular-nums text-ink sm:text-7xl"
            />
          )}
        </span>
      </a>
    </RevealItem>
  );
}

export function Collection() {
  const { games, simulators, explorers, isLoading, usersLoading } = useCatalog();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });

  const fields = useMemo(() => {
    const set = new Set<string>();
    [...games, ...simulators].forEach((i) => i.category && set.add(i.category.trim().toLowerCase()));
    return set.size;
  }, [games, simulators]);

  const rows: Row[] = [
    { index: '01', label: 'Games', note: 'Browser games with scores, achievements and leaderboards.', value: games.length, href: '#games' },
    { index: '02', label: 'Simulators', note: 'Interactive experiments you can tweak and measure.', value: simulators.length, href: '#simulators' },
    { index: '03', label: 'Fields of study', note: 'From physics and statistics to arcade classics.', value: fields, href: '#simulators' },
    { index: '04', label: 'Explorers', note: 'People already playing, learning and competing.', value: explorers, href: '#about' },
  ];

  return (
    <section id="explore" className="relative scroll-mt-24 py-24 sm:py-32">
      <Container className="grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="relative lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <SectionHeading
              index="01"
              eyebrow="The collection"
              size="title"
              title={
                <>
                  A collection you can <span className="text-brand">pick up</span> and play.
                </>
              }
              description="CurioPlay is a growing archive of things to poke, play and learn from. Every exhibit runs in your browser, keeps your score, and remembers your progress."
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: ease.out }}
              className="mt-10 hidden w-64 lg:block"
            >
              <OrbitLines className="w-full" />
            </motion.div>
          </div>
        </div>

        <div ref={ref} className="lg:col-span-7">
          <div className="flex items-center justify-between border-b border-ink/80 pb-3">
            <span className="label-mono text-ink">Catalogue index</span>
            <span className="label-mono text-ink-faint">Live count</span>
          </div>
          <RevealGroup stagger={0.08}>
            {rows.map((row) => (
              <CatalogueRow
                key={row.index}
                row={row}
                inView={inView}
                loading={row.index === '04' ? usersLoading : isLoading}
              />
            ))}
          </RevealGroup>
        </div>
      </Container>
    </section>
  );
}
