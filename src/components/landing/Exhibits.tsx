import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Gamepad2, Play } from 'lucide-react';
import { Container, SectionHeading } from '@/components/layout/Section';
import { buttonClasses } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { OrbitLines } from '@/components/ui/Decor';
import { Thumb } from '@/components/ui/Thumb';
import { Spotlight } from '@/components/motion/spotlight';
import { RevealGroup, RevealItem } from '@/components/motion/reveal';
import { useCatalog, type CatalogItem } from '@/hooks/useCatalog';
import { entryPath, experiencePath } from '@/lib/session';
import { cn } from '@/lib/utils';

/*
 * № 02 — The exhibit hall (games). A gallery wall, not a card grid: one large exhibit,
 * two companions, then a drawer of more. Covers drift against the cursor (parallax),
 * a soft spotlight follows it, and the play affordance slides in. Labels read like museum placards.
 */

const LETTERS = ['A', 'B', 'C'];

function Cover({ item, className }: { item: CatalogItem; className?: string }) {
  return (
    <Thumb
      src={item.thumbnail}
      className={cn('size-full object-cover', className)}
      fallback={
        <div className={cn('relative grid size-full place-items-center bg-navy', className)}>
          <OrbitLines night className="absolute inset-0 size-full opacity-70" />
          <Gamepad2 className="relative size-10 text-night-sage" />
        </div>
      }
    />
  );
}

function Exhibit({ item, letter, size }: { item: CatalogItem; letter: string; size: 'lg' | 'md' }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(useTransform(mx, [-0.5, 0.5], [14, -14]), { stiffness: 120, damping: 20 });
  const y = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 20 });

  return (
    <Link
      to={experiencePath(item.id, 'game')}
      aria-label={`Play ${item.title}`}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className={cn(
        'group relative isolate block h-full overflow-hidden rounded-[28px] border border-line bg-navy text-white shadow-soft transition-shadow duration-500 hover:shadow-float',
        size === 'lg' ? 'min-h-[420px] lg:min-h-[600px]' : 'min-h-[280px]',
      )}
    >
      <motion.div style={{ x, y, scale: 1.08 }} className="absolute inset-0 -z-10">
        <Cover item={item} className="transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.06]" />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/45 to-transparent" />
      <Spotlight size={size === 'lg' ? 420 : 300} className="from-white/25 via-white/10 to-transparent dark:from-white/25 dark:via-white/10 dark:to-transparent" />

      <div className="flex h-full flex-col justify-between p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="label-mono rounded-full border border-white/20 bg-navy/40 px-3 py-1.5 text-night-sage backdrop-blur">
            Exhibit {letter}
          </span>
          {item.category && (
            <span className="label-mono rounded-full bg-white/10 px-3 py-1.5 text-white/80 backdrop-blur">{item.category}</span>
          )}
        </div>

        <div>
          <h3 className={cn('font-wide font-extrabold leading-[0.95]', size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl')}>
            {item.title}
          </h3>
          <p
            className={cn(
              'mt-3 max-w-md text-sm leading-relaxed text-white/70 transition-all duration-500 ease-out-expo',
              size === 'lg' ? 'line-clamp-3' : 'line-clamp-2',
              '[@media(hover:hover)]:max-h-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:max-h-24 [@media(hover:hover)]:group-hover:opacity-100',
            )}
          >
            {item.description || 'An interactive experience that runs right in your browser.'}
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-sm font-semibold text-navy transition-transform duration-300 group-hover:translate-x-1">
            <span className="grid size-7 place-items-center rounded-full bg-brand text-white">
              <Play className="size-3 translate-x-px fill-current" />
            </span>
            Play now
          </span>
        </div>
      </div>
    </Link>
  );
}

function DrawerCard({ item, index }: { item: CatalogItem; index: number }) {
  return (
    <Link
      to={experiencePath(item.id, 'game')}
      className="group flex w-[15rem] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border border-line bg-surface transition-[transform,translate,scale,rotate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card sm:w-[17rem]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-navy">
        <Cover item={item} className="transition-transform duration-700 ease-out-expo group-hover:scale-105" />
        <span className="label-mono absolute left-3 top-3 rounded-full bg-navy/60 px-2 py-1 text-night-sage backdrop-blur">
          № {String(index).padStart(2, '0')}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{item.title}</span>
          <span className="label-mono mt-1 block truncate text-ink-faint">{item.category || 'Game'}</span>
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-ink-faint transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-strong" />
      </div>
    </Link>
  );
}

export function Exhibits() {
  const { games, isLoading } = useCatalog();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [a, b, c, ...rest] = games;

  const scrollDrawer = (dir: 1 | -1) => drawerRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });

  return (
    <section id="games" className="scroll-mt-24 pb-24 sm:pb-32">
      <Container>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <SectionHeading index="02" eyebrow="The exhibit hall · Games" title="Play something worth remembering." />
          <Link to={entryPath()} className={buttonClasses('outline', 'md')}>
            Open the arcade <ArrowRight data-icon="trailing" className="size-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-5 lg:grid-cols-12">
            <Skeleton className="h-[420px] rounded-[28px] lg:col-span-7 lg:row-span-2 lg:h-[600px]" />
            <Skeleton className="h-[280px] rounded-[28px] lg:col-span-5" />
            <Skeleton className="h-[280px] rounded-[28px] lg:col-span-5" />
          </div>
        ) : !a ? (
          <EmptyState
            icon={<Gamepad2 className="size-5" />}
            title="The exhibit hall is being arranged"
            description="New games are added regularly. Create an account to be first in line."
            action={
              <Link to="/login" className={buttonClasses('primary', 'md')}>
                Join CurioPlay
              </Link>
            }
          />
        ) : (
          <RevealGroup className="grid gap-5 lg:grid-cols-12 lg:grid-rows-2" stagger={0.1}>
            <RevealItem className={cn('lg:col-span-7 lg:row-span-2', !b && 'lg:col-span-12')}>
              <Exhibit item={a} letter={LETTERS[0]} size="lg" />
            </RevealItem>
            {b && (
              <RevealItem className="lg:col-span-5">
                <Exhibit item={b} letter={LETTERS[1]} size="md" />
              </RevealItem>
            )}
            {c && (
              <RevealItem className="lg:col-span-5">
                <Exhibit item={c} letter={LETTERS[2]} size="md" />
              </RevealItem>
            )}
          </RevealGroup>
        )}

        {rest.length > 0 && (
          <div className="mt-14">
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="label-mono text-ink">
                More from the arcade <span className="text-ink-faint">· {rest.length}</span>
              </p>
              <div className="hidden gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => scrollDrawer(-1)}
                  aria-label="Scroll left"
                  className="grid size-10 place-items-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-brand/50 hover:text-ink"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollDrawer(1)}
                  aria-label="Scroll right"
                  className="grid size-10 place-items-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-brand/50 hover:text-ink"
                >
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
            <div
              ref={drawerRef}
              className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 scrollbar-none sm:-mx-8 sm:px-8"
              role="list"
              aria-label="More games"
            >
              {rest.map((item, i) => (
                <div role="listitem" key={item.id}>
                  <DrawerCard item={item} index={i + 4} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
