import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronRight, LocateFixed, Play, RotateCw, Trophy } from 'lucide-react';
import type { Score, User } from '@/api/api';
import { cn } from '@/lib/utils';
import { dur, ease, spring, stagger } from '@/lib/motion';
import { SlidingNumber } from '@/components/motion/sliding-number';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TD, TH, THead } from '@/components/ui/Data';
import { useMediaQuery } from '@/hooks/useMediaQuery';

type Change = number | 'new';

interface RankRow {
  key: string;
  rank: number;
  score: Score;
  isMe: boolean;
}

/**
 * Rank snapshots per game for this browser session. Kept outside the component so they survive
 * tab switches: play a game, come back, and the refetched board shows who moved.
 */
const rankSnapshots = new Map<string, Map<string, number>>();

const MOVE_VISIBLE_MS = 4500;

function setOn(iso: string | undefined): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return '—';
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Rank medal: gold for #1 only, brand/sage for #2/#3. */
function RankMark({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? 'bg-gold-soft text-gold-strong ring-1 ring-gold/50'
      : rank === 2
        ? 'bg-brand-soft text-brand-strong ring-1 ring-brand/30'
        : rank === 3
          ? 'bg-rose-soft text-brand-strong ring-1 ring-rose'
          : 'text-ink-muted';
  return (
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-full font-semiwide text-sm font-extrabold tabular-nums', tone)}>
      {rank}
    </span>
  );
}

function Movement({ change }: { change?: Change }) {
  return (
    <AnimatePresence initial={false}>
      {change !== undefined && (
        <motion.span
          key={String(change)}
          initial={{ opacity: 0, y: change !== 'new' && change < 0 ? -6 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: dur.fast } }}
          transition={{ duration: dur.base, ease: ease.out }}
          className={cn(
            'label-mono inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 tabular-nums',
            change === 'new' ? 'bg-rose-soft text-brand-strong' : change > 0 ? 'bg-brand-soft text-brand-strong' : 'bg-surface-2 text-ink-muted',
          )}
        >
          {change === 'new' ? (
            'New'
          ) : (
            <>
              <span aria-hidden="true">{change > 0 ? `▲${change}` : `▼${-change}`}</span>
              <span className="sr-only">{change > 0 ? `up ${change}` : `down ${-change}`}</span>
            </>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 px-4 py-3.5 sm:px-5', className)}>
      <dt className="label-mono text-ink-faint">{label}</dt>
      <dd className="mt-1.5 min-w-0 truncate font-semiwide text-xl font-extrabold leading-tight text-ink">{children}</dd>
    </div>
  );
}

interface RankingBoardProps {
  gameId: string;
  gameTitle: string;
  scores: Score[];
  loading: boolean;
  fetching: boolean;
  isError: boolean;
  onRetry: () => void;
  userMap: Map<string, User>;
  usersLoading: boolean;
  meId: string;
  onViewProfile: (userId: string) => void;
  onPlay: () => void;
}

export function RankingBoard({
  gameId,
  gameTitle,
  scores,
  loading,
  fetching,
  isError,
  onRetry,
  userMap,
  usersLoading,
  meId,
  onViewProfile,
  onPlay,
}: RankingBoardProps) {
  const reduce = useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 768px)', true);
  const uid = useId();

  const rows = useMemo<RankRow[]>(() => {
    const seen = new Set<string>();
    return [...scores]
      .sort((a, b) => b.scoreValue - a.scoreValue)
      .map((s, i) => {
        // One row per player normally; a repeated player falls back to the score id.
        const key = seen.has(s.userId) ? s.id : s.userId;
        seen.add(s.userId);
        return { key, rank: i + 1, score: s, isMe: s.userId === meId };
      });
  }, [scores, meId]);

  const mine = rows.find((r) => r.isMe);
  const rowId = (key: string) => `${uid}-row-${key}`;

  /* ---------- in-session rank movement ---------- */

  const [movement, setMovement] = useState<{ gameId: string; changes: Record<string, Change> } | null>(null);
  const moveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!gameId || loading || isError) return;
    const next = new Map(rows.map((r) => [r.key, r.rank]));
    const prev = rankSnapshots.get(gameId);
    rankSnapshots.set(gameId, next);
    if (!prev) return;
    const changes: Record<string, Change> = {};
    next.forEach((rank, key) => {
      const before = prev.get(key);
      if (before === undefined) changes[key] = 'new';
      else if (before !== rank) changes[key] = before - rank;
    });
    if (Object.keys(changes).length === 0) return;
    setMovement({ gameId, changes });
    window.clearTimeout(moveTimer.current);
    moveTimer.current = window.setTimeout(() => setMovement(null), MOVE_VISIBLE_MS);
  }, [gameId, rows, loading, isError]);

  const changes = movement?.gameId === gameId ? movement.changes : undefined;
  const myChange = mine && changes ? changes[mine.key] : undefined;

  /* ---------- jump to me ---------- */

  const [flashKey, setFlashKey] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(moveTimer.current);
      window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const jumpToMe = () => {
    if (!mine) return;
    const el = document.getElementById(rowId(mine.key));
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    el?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    setFlashKey(mine.key);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashKey(null), 1800);
  };

  /* ---------- states ---------- */

  if (loading) return <BoardSkeleton />;

  if (isError && rows.length === 0) {
    return <ErrorState title="These rankings didn't load" onRetry={onRetry} />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="size-6" />}
        title="No scores yet"
        description="Be the first to set a score on this one and claim rank one."
        action={
          <Button onClick={onPlay} leadingIcon={<Play className="size-4" />}>
            Play {gameTitle}
          </Button>
        }
      />
    );
  }

  const nameOf = (userId: string) => userMap.get(userId)?.username || (usersLoading ? '' : 'Unknown player');

  const entrance = (i: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 12 } as const),
    animate: { opacity: 1, y: 0 },
    transition: { duration: dur.base, ease: ease.out, delay: Math.min(i, 12) * stagger.list, layout: spring.soft },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* readouts */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface sm:flex-row sm:items-stretch">
        <dl className="grid min-w-0 flex-1 grid-cols-2 sm:grid-cols-3">
          <Stat label="On the board">
            <AnimatedNumber value={rows.length} />
          </Stat>
          <Stat label="Top score" className="border-l border-line">
            <AnimatedNumber value={rows[0].score.scoreValue} />
          </Stat>
          <Stat label="Your standing" className="col-span-2 border-t border-line sm:col-span-1 sm:border-l sm:border-t-0">
            {mine ? (
              <span>
                You are #{mine.rank} <span className="font-sans text-base font-semibold text-ink-muted">of {rows.length}</span>
              </span>
            ) : (
              <span className="font-sans text-base font-semibold text-ink-muted">Not on this board yet</span>
            )}
          </Stat>
        </dl>
        <div className="flex items-center gap-2 border-t border-line px-4 py-3 sm:border-l sm:border-t-0 sm:px-4">
          {mine && (
            <Button variant="outline" size="sm" className="h-11 flex-1 sm:h-9 sm:flex-none" leadingIcon={<LocateFixed className="size-4" />} onClick={jumpToMe}>
              Jump to me
            </Button>
          )}
          <IconButton
            label={fetching ? 'Refreshing rankings' : 'Refresh rankings'}
            variant="outline"
            className="size-11 sm:size-9"
            disabled={fetching}
            onClick={onRetry}
            icon={<RotateCw className={cn('size-4', fetching && 'animate-spin')} />}
          />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {changes
          ? myChange !== undefined && myChange !== 'new'
            ? `Rankings updated. You moved ${myChange > 0 ? 'up' : 'down'} ${Math.abs(myChange)} ${Math.abs(myChange) === 1 ? 'place' : 'places'}.`
            : `Rankings updated. ${Object.keys(changes).length} ${Object.keys(changes).length === 1 ? 'player' : 'players'} changed position.`
          : ''}
      </p>

      {isDesktop ? (
        <Table caption={`Rankings for ${gameTitle}`}>
          <THead>
            <tr>
              <TH className="w-32 pl-5">Rank</TH>
              <TH>Player</TH>
              <TH className="hidden lg:table-cell">Set on</TH>
              <TH className="text-right">Score</TH>
              <TH className="w-12 pr-5">
                <span className="sr-only">Open profile</span>
              </TH>
            </tr>
          </THead>
          <tbody>
            <AnimatePresence initial>
              {rows.map((row, i) => {
                const p = userMap.get(row.score.userId);
                const name = nameOf(row.score.userId);
                return (
                  <motion.tr
                    key={row.key}
                    id={rowId(row.key)}
                    layout={reduce ? false : 'position'}
                    {...entrance(i)}
                    exit={{ opacity: 0, transition: { duration: dur.micro } }}
                    onClick={() => onViewProfile(row.score.userId)}
                    className={cn(
                      'group cursor-pointer border-b border-line transition-colors duration-200 last:border-0',
                      row.isMe ? 'bg-brand-soft/70 hover:bg-brand-soft' : 'hover:bg-surface-2/50',
                      flashKey === row.key && 'outline-2 -outline-offset-2 outline-brand',
                    )}
                  >
                    <TD className="pl-5">
                      <span className="flex items-center gap-2">
                        <RankMark rank={row.rank} />
                        <Movement change={changes?.[row.key]} />
                      </span>
                    </TD>
                    <TD>
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar url={p?.avatarUrl} seed={p?.avatarSeed} name={name || '?'} className="size-9" />
                        {name ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewProfile(row.score.userId);
                            }}
                            aria-label={`${name}, rank ${row.rank}, score ${row.score.scoreValue}. View profile`}
                            className="min-w-0 truncate rounded-md text-left font-semibold text-ink underline-offset-4 hover:underline"
                          >
                            {name}
                          </button>
                        ) : (
                          <Skeleton className="h-4 w-28 rounded-md" />
                        )}
                        {row.isMe && <Badge tone="brand">You</Badge>}
                      </span>
                    </TD>
                    <TD className="hidden whitespace-nowrap text-ink-muted lg:table-cell">{setOn(row.score.playedAt)}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end font-semiwide text-lg font-extrabold text-ink">
                        <SlidingNumber value={row.score.scoreValue} />
                      </div>
                    </TD>
                    <TD className="pr-5">
                      <ChevronRight className="size-4 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                    </TD>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </Table>
      ) : (
        <ol className="flex flex-col gap-2.5" aria-label={`Rankings for ${gameTitle}`}>
          <AnimatePresence mode="popLayout" initial>
            {rows.map((row, i) => {
              const p = userMap.get(row.score.userId);
              const name = nameOf(row.score.userId);
              return (
                <motion.li
                  key={row.key}
                  id={rowId(row.key)}
                  layout={reduce ? false : 'position'}
                  {...entrance(i)}
                  exit={{ opacity: 0, transition: { duration: dur.micro } }}
                  className="list-none"
                >
                  <button
                    type="button"
                    onClick={() => onViewProfile(row.score.userId)}
                    aria-label={`${name || 'Player'}, rank ${row.rank}, score ${row.score.scoreValue}. View profile`}
                    className={cn(
                      'flex min-h-[72px] w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-[border-color,box-shadow] duration-200 active:scale-[0.99]',
                      row.isMe ? 'border-brand/50 bg-brand-soft' : 'border-line bg-surface',
                      flashKey === row.key && 'ring-2 ring-brand',
                    )}
                  >
                    <span className="flex w-10 shrink-0 flex-col items-center gap-1">
                      <RankMark rank={row.rank} />
                      <Movement change={changes?.[row.key]} />
                    </span>
                    <Avatar url={p?.avatarUrl} seed={p?.avatarSeed} name={name || '?'} className="size-11" />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        {name ? <span className="truncate font-bold text-ink">{name}</span> : <Skeleton className="h-4 w-24 rounded-md" />}
                        {row.isMe && <Badge tone="brand">You</Badge>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-faint">Set {setOn(row.score.playedAt)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <div className="flex justify-end font-semiwide text-xl font-extrabold text-ink">
                        <SlidingNumber value={row.score.scoreValue} />
                      </div>
                      <span className="label-mono text-ink-faint">pts</span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading rankings">
      <Skeleton className="h-[76px] rounded-2xl" />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0 sm:gap-4 sm:px-5">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded-md sm:max-w-48" />
            <Skeleton className="ml-auto h-6 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
