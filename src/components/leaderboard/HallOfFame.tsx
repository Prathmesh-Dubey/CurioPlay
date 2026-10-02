import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Crown } from 'lucide-react';
import type { GlobalRank, User } from '@/api/api';
import { cn } from '@/lib/utils';
import { dur, ease, spring, stagger } from '@/lib/motion';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { Avatar } from '@/components/ui/Avatar';
import { Eyebrow, OrbitLines } from '@/components/ui/Decor';
import { ErrorState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { HallOfFameBackdrop } from './HallOfFameBackdrop';

/** Desktop podium geometry: 2 · 1 · 3. Gold is reserved for #1. */
const PLACE = {
  1: { col: 'md:col-start-2', plinth: 'h-44', edge: 'border-t-night-gold', numeral: 'text-night-gold', avatar: 'md:size-24 border-night-gold' },
  2: { col: 'md:col-start-1', plinth: 'h-32', edge: 'border-t-night-sage', numeral: 'text-night-sage', avatar: 'md:size-[4.5rem] border-white/25' },
  3: { col: 'md:col-start-3', plinth: 'h-24', edge: 'border-t-night-sage/50', numeral: 'text-white/70', avatar: 'md:size-[4.5rem] border-white/25' },
} as const;

type Place = keyof typeof PLACE;

interface HallOfFameProps {
  ranks: GlobalRank[];
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  userMap: Map<string, User>;
  meId: string;
  onViewProfile: (userId: string) => void;
}

export function HallOfFame({ ranks, loading, isError, onRetry, userMap, meId, onViewProfile }: HallOfFameProps) {
  const top3 = ranks.slice(0, 3);
  const myIndex = ranks.findIndex((r) => r.userId === meId);
  const me = myIndex >= 0 ? ranks[myIndex] : undefined;

  let body: ReactNode;
  if (loading) {
    body = <PodiumSkeleton />;
  } else if (isError && ranks.length === 0) {
    body = (
      <div className="px-5 pb-6 sm:px-8 lg:px-10">
        <div className="rounded-[20px] bg-surface">
          <ErrorState title="The Hall of Fame didn't load" onRetry={onRetry} compact />
        </div>
      </div>
    );
  } else if (top3.length === 0) {
    body = <EmptyPodium />;
  } else {
    body = (
      <ol className="mx-auto grid w-full max-w-5xl gap-2.5 px-5 pb-5 md:grid-cols-3 md:items-end md:gap-5 md:px-10 md:pb-0 md:pt-10 lg:px-16">
        {top3.map((r, i) => (
          <PodiumEntry
            key={r.userId}
            place={(i + 1) as Place}
            entry={r}
            profile={userMap.get(r.userId)}
            isMe={r.userId === meId}
            delay={[1, 0, 2][i] * stagger.hero}
            onOpen={() => onViewProfile(r.userId)}
          />
        ))}
      </ol>
    );
  }

  return (
    <section aria-labelledby="hof-title" className="grain relative isolate overflow-hidden rounded-[28px] bg-navy text-white">
      <HallOfFameBackdrop />
      <OrbitLines night animate={false} className="absolute -right-24 -top-28 -z-10 size-[26rem] opacity-50 sm:-right-10" />

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 p-5 sm:p-8 lg:p-10">
        <div className="min-w-0">
          <Eyebrow night>All-time · every game</Eyebrow>
          <h2 id="hof-title" className="mt-3 font-wide text-[1.9rem] font-extrabold leading-[0.95] sm:text-[2.6rem]">
            Hall of Fame
          </h2>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-white/70">Total points across the collection. Three places on the podium.</p>
        </div>
        <dl className="shrink-0">
          <dt className="label-mono text-night-sage/75">Ranked explorers</dt>
          <dd className="mt-1 font-wide text-[2rem] font-extrabold leading-none">
            {loading ? <Skeleton className="h-8 w-16 bg-white/10" /> : <AnimatedNumber value={ranks.length} />}
          </dd>
        </dl>
      </div>

      {body}

      {/* the stage floor + your standing */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/15 px-5 py-4 text-sm sm:px-8 lg:px-10">
        {loading ? (
          <Skeleton className="h-4 w-64 bg-white/10" />
        ) : me ? (
          <p className="text-white/80">
            You are <span className="font-bold text-white">#{myIndex + 1}</span> of {ranks.length} with{' '}
            <span className="font-semibold tabular-nums text-white">{me.totalScore.toLocaleString()}</span> points.
          </p>
        ) : (
          <p className="text-white/70">Set a score in any game to enter the Hall of Fame.</p>
        )}
        <span className="label-mono text-white/40">Totals · all time</span>
      </div>
    </section>
  );
}

function PodiumEntry({
  place,
  entry,
  profile,
  isMe,
  delay,
  onOpen,
}: {
  place: Place;
  entry: GlobalRank;
  profile?: User;
  isMe: boolean;
  delay: number;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const p = PLACE[place];
  const first = place === 1;

  return (
    <motion.li
      className={cn('min-w-0 list-none md:row-start-1', p.col)}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.soft, delay }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${entry.username}, rank ${place}, ${entry.totalScore.toLocaleString()} points. View profile`}
        className={cn(
          'group flex w-full items-center gap-4 rounded-2xl border p-3.5 text-left transition-colors duration-200 md:flex-col md:gap-0 md:rounded-b-none md:border-0 md:bg-transparent md:p-0 md:text-center md:hover:bg-transparent',
          first ? 'border-night-gold/40 bg-white/[0.07] hover:bg-white/10' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]',
        )}
      >
        <span className={cn('w-7 shrink-0 text-center font-wide text-2xl font-extrabold md:hidden', p.numeral)}>{place}</span>

        <span className="relative shrink-0 transition-transform duration-300 ease-out-expo md:group-hover:-translate-y-1">
          {first && (
            <>
              {/* Halo that breathes around the champion. */}
              {!reduce && (
                <motion.span
                  aria-hidden="true"
                  className="absolute -inset-3 hidden rounded-full border border-night-gold/60 md:block"
                  animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <motion.span
                aria-hidden="true"
                className="absolute -top-6 left-1/2 hidden -translate-x-1/2 md:block"
                animate={reduce ? undefined : { y: [0, -4, 0], rotate: [-4, 4, -4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Crown className="size-5 text-night-gold drop-shadow-[0_0_8px_rgb(139_203_255/0.8)]" />
              </motion.span>
            </>
          )}
          <Avatar
            url={profile?.avatarUrl}
            seed={profile?.avatarSeed}
            name={entry.username}
            className={cn('size-12 border-2', p.avatar, isMe && 'ring-2 ring-brand ring-offset-2 ring-offset-navy')}
          />
        </span>

        <span className="min-w-0 flex-1 md:mt-3 md:w-full md:flex-none">
          <span className="block truncate font-bold">
            {entry.username}
            {isMe && <span className="ml-1.5 text-xs font-semibold text-night-sage">(you)</span>}
          </span>
          <span className="mt-0.5 flex items-baseline gap-1.5 md:justify-center">
            <AnimatedNumber
              value={entry.totalScore}
              className={cn('font-wide text-xl font-extrabold [text-shadow:0_2px_14px_rgb(4_20_39/0.95)] md:text-2xl', first ? 'text-night-gold' : 'text-white')}
            />
            <span className="label-mono text-white/50">pts</span>
          </span>
        </span>

        {/* plinth — rises from the stage floor */}
        <span className={cn('relative mt-5 hidden w-full overflow-hidden md:block', p.plinth)} aria-hidden="true">
          <motion.span
            className={cn(
              'absolute inset-0 flex justify-center rounded-t-2xl border-x border-t-2 border-x-white/10 bg-white/[0.06] pt-4 transition-colors duration-300 group-hover:bg-white/[0.1]',
              p.edge,
            )}
            initial={reduce ? false : { y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out, delay: delay + 0.1 }}
          >
            <span className={cn('font-wide text-6xl font-extrabold leading-none', p.numeral)}>{place}</span>
          </motion.span>
        </span>
      </button>
    </motion.li>
  );
}

function PodiumSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-5 md:px-10 md:pb-0 md:pt-10 lg:px-16" aria-busy="true" aria-label="Loading the Hall of Fame">
      <div className="space-y-2.5 md:hidden">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[76px] rounded-2xl bg-white/10" />
        ))}
      </div>
      <div className="hidden grid-cols-3 items-end gap-5 md:grid">
        {([2, 1, 3] as Place[]).map((place) => (
          <div key={place} className="flex flex-col items-center">
            <Skeleton className={cn('rounded-full bg-white/10', place === 1 ? 'size-24' : 'size-[4.5rem]')} />
            <Skeleton className="mt-3 h-4 w-24 bg-white/10" />
            <Skeleton className="mt-2 h-6 w-20 bg-white/10" />
            <Skeleton className={cn('mt-5 w-full rounded-b-none rounded-t-2xl bg-white/[0.06]', PLACE[place].plinth)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Empty stage: three unclaimed plinths. */
function EmptyPodium() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-5 md:px-10 md:pb-0 md:pt-6 lg:px-16">
      <p className="mb-4 text-center text-sm text-white/70 md:mb-6">No one has scored yet. The podium is waiting for its first name.</p>
      <div className="hidden grid-cols-3 items-end gap-5 md:grid" aria-hidden="true">
        {([2, 1, 3] as Place[]).map((place) => (
          <div
            key={place}
            className={cn(
              'flex justify-center rounded-t-2xl border-x border-t border-dashed border-white/20 pt-4 font-wide text-5xl font-extrabold text-white/20',
              PLACE[place].plinth,
            )}
          >
            {place}
          </div>
        ))}
      </div>
    </div>
  );
}
