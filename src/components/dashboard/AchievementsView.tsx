/*
 * THE CABINET — concept
 * A museum drawer of struck medals, read like an instrument. The night "collection" plate reports the
 * catalogue: a ring that turns gold only for the earned share, "x of y catalogued", and the next milestone
 * with its distance to go. Below, every achievement is a catalogued specimen (№ by target): locked ones are
 * blind-embossed outlines measuring your best score against the target; earned ones are struck in gold,
 * catch a single sheen as they appear and carry a dated catalogue stamp. Filter the drawer with tabs, open
 * any specimen for its full record (requirement, your best, date, and rarity when it can be measured).
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Award, Lock, Target, Trophy } from 'lucide-react';
import { userAchievementApi, userApi, type Achievement, type Score, type User } from '@/api/api';
import { useAchievements, useUserAchievements, useUserScores } from '@/hooks';
import { queryKeys } from '@/lib/queryKeys';
import { dur, ease, spring, stagger } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { AnimatedNumber } from '@/components/motion/animated-number';
import {
  Badge,
  Button,
  CornerTicks,
  Dialog,
  EmptyState,
  ErrorState,
  Eyebrow,
  OrbitLines,
  PlateTag,
  Progress,
  ProgressRing,
  Select,
  Skeleton,
  Tabs,
} from '@/components/ui';
import { Medal } from '@/components/achievements/Medal';
import { clockTime, longDate } from '@/components/analytics/utils';

interface AchievementsViewProps {
  user: User;
}

type Filter = 'all' | 'unlocked' | 'progress';
type SortKey = 'recent' | 'closest' | 'catalogue';

interface Entry {
  a: Achievement;
  /** Catalogue number, assigned by ascending target. */
  no: number;
  at: string | null;
  unlocked: boolean;
  /** 0–1, best score against the target. */
  progress: number;
  /** Best score capped at the target. */
  reached: number;
  toGo: number;
}

const plate = (no: number) => `№ ${String(no).padStart(2, '0')}`;
const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Recently earned' },
  { value: 'closest', label: 'Closest to unlock' },
  { value: 'catalogue', label: 'Catalogue order' },
];

export default function AchievementsView({ user }: AchievementsViewProps) {
  const achQ = useAchievements();
  const unlockedQ = useUserAchievements(user.id);
  const scoresQ = useUserScores(user.id);
  const achievements = useMemo(() => achQ.data ?? [], [achQ.data]);
  const unlocked = useMemo(() => unlockedQ.data ?? [], [unlockedQ.data]);
  const scores = useMemo(() => scoresQ.data ?? [], [scoresQ.data]);

  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [detail, setDetail] = useState<Entry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const bestScore = useMemo(() => scores.reduce<Score | null>((b, s) => (!b || s.scoreValue > b.scoreValue ? s : b), null), [scores]);
  const best = bestScore?.scoreValue ?? 0;

  const entries = useMemo<Entry[]>(() => {
    const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));
    return [...achievements]
      .sort((x, y) => x.requiredScore - y.requiredScore || x.title.localeCompare(y.title))
      .map((a, i) => {
        const at = unlockedMap.get(a.id) ?? null;
        const progress = a.requiredScore > 0 ? Math.min(1, best / a.requiredScore) : 1;
        return {
          a,
          no: i + 1,
          at,
          unlocked: !!at,
          progress,
          reached: Math.min(best, a.requiredScore),
          toGo: Math.max(0, a.requiredScore - best),
        };
      });
  }, [achievements, unlocked, best]);

  const counts = useMemo(
    () => ({
      all: entries.length,
      unlocked: entries.filter((e) => e.unlocked).length,
      progress: entries.filter((e) => !e.unlocked && e.progress > 0).length,
    }),
    [entries],
  );

  const visible = useMemo(() => {
    const list = entries.filter((e) => (filter === 'unlocked' ? e.unlocked : filter === 'progress' ? !e.unlocked && e.progress > 0 : true));
    const byRecent = (x: Entry, y: Entry) => time(y.at) - time(x.at);
    const byClosest = (x: Entry, y: Entry) => x.toGo - y.toGo || y.progress - x.progress || x.no - y.no;
    return list.sort((x, y) => {
      if (sort === 'catalogue') return x.no - y.no;
      if (sort === 'closest') {
        if (x.unlocked !== y.unlocked) return x.unlocked ? 1 : -1;
        return x.unlocked ? byRecent(x, y) : byClosest(x, y);
      }
      if (x.unlocked !== y.unlocked) return x.unlocked ? -1 : 1;
      return x.unlocked ? byRecent(x, y) : y.progress - x.progress || x.no - y.no;
    });
  }, [entries, filter, sort]);

  const next = useMemo(() => entries.find((e) => !e.unlocked) ?? null, [entries]);
  const latest = useMemo(() => entries.filter((e) => e.unlocked).sort((x, y) => time(y.at) - time(x.at))[0] ?? null, [entries]);

  const loading = achQ.isLoading || unlockedQ.isLoading || scoresQ.isLoading;

  // the drawer staggers in on first paint; later filter changes swap without delay
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (loading || settled) return;
    const id = window.setTimeout(() => setSettled(true), 1200);
    return () => window.clearTimeout(id);
  }, [loading, settled]);
  const failed = achQ.isError || unlockedQ.isError || scoresQ.isError;
  const total = entries.length;
  const pct = total ? Math.round((counts.unlocked / total) * 100) : 0;

  const retry = () => {
    if (achQ.isError) achQ.refetch();
    if (unlockedQ.isError) unlockedQ.refetch();
    if (scoresQ.isError) scoresQ.refetch();
  };

  const openDetail = (e: Entry) => {
    setDetail(e);
    setDetailOpen(true);
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        index="05"
        eyebrow="The Cabinet"
        title="Achievements"
        description="Medals are struck when a score reaches their target. Locked specimens measure your best score against what they ask for."
      />

      {loading ? (
        <CabinetSkeleton />
      ) : failed ? (
        <ErrorState
          title="The cabinet wouldn’t open"
          description="We couldn’t load your achievements or scores. Check your connection and try again."
          onRetry={retry}
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<Award className="size-6" />}
          title="The cabinet is empty"
          description="No achievements have been catalogued yet. When new medals are added they’ll appear here, measured against your best score."
          action={
            <Button variant="outline" size="sm" onClick={() => achQ.refetch()} loading={achQ.isFetching}>
              Check again
            </Button>
          }
        />
      ) : (
        <>
          <CollectionPlate
            earned={counts.unlocked}
            total={total}
            pct={pct}
            best={best}
            inProgress={counts.progress}
            next={next}
            latest={latest}
            onOpen={openDetail}
          />

          <section aria-labelledby="cabinet-drawer" className="flex flex-col gap-5">
            <h2 id="cabinet-drawer" className="sr-only">
              Specimens
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs<Filter>
                label="Filter achievements"
                variant="segmented"
                value={filter}
                onChange={setFilter}
                className="self-start"
                items={[
                  { value: 'all', label: 'All', count: counts.all },
                  { value: 'unlocked', label: 'Unlocked', count: counts.unlocked },
                  { value: 'progress', label: 'In progress', count: counts.progress },
                ]}
              />
              <Select<SortKey> ariaLabel="Sort achievements" value={sort} onChange={setSort} options={SORTS} className="sm:w-56" />
            </div>

            {visible.length === 0 ? (
              filter === 'unlocked' ? (
                <EmptyState
                  compact
                  icon={<Trophy className="size-5" />}
                  title="No medals struck yet"
                  description={
                    next
                      ? `Your closest is “${next.a.title}” — ${next.toGo.toLocaleString()} points to go.`
                      : 'Submit a score in any game to start filling the cabinet.'
                  }
                  action={
                    <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                      View all specimens
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  compact
                  icon={<Target className="size-5" />}
                  title={counts.unlocked === total ? 'Nothing left in progress' : 'Nothing underway yet'}
                  description={
                    counts.unlocked === total
                      ? 'Every specimen in the cabinet has been earned.'
                      : 'Progress starts with your first submitted score. Play any game or simulator, then come back to see each medal measured against it.'
                  }
                  action={
                    <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                      View all specimens
                    </Button>
                  }
                />
              )
            ) : (
              <ul className="relative grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {visible.map((e, i) => (
                    <motion.li
                      key={e.a.id}
                      layout="position"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, transition: { duration: dur.micro } }}
                      transition={{
                        duration: dur.base,
                        ease: ease.out,
                        delay: settled ? 0 : Math.min(i, 12) * stagger.list,
                        layout: spring.snappy,
                      }}
                      className="h-full"
                    >
                      <Specimen e={e} onOpen={() => openDetail(e)} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>
        </>
      )}

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail?.a.title}
        size="md"
        footer={
          <Button variant="outline" onClick={() => setDetailOpen(false)}>
            Close
          </Button>
        }
      >
        {detail && <SpecimenRecord e={detail} best={bestScore} open={detailOpen} />}
      </Dialog>
    </div>
  );
}

/* --------------------------------- Header --------------------------------- */

function CollectionPlate({
  earned,
  total,
  pct,
  best,
  inProgress,
  next,
  latest,
  onOpen,
}: {
  earned: number;
  total: number;
  pct: number;
  best: number;
  inProgress: number;
  next: Entry | null;
  latest: Entry | null;
  onOpen: (e: Entry) => void;
}) {
  const complete = earned === total;
  return (
    <section
      aria-labelledby="cabinet-collection"
      className="grain relative isolate overflow-hidden rounded-[28px] bg-navy p-6 text-white shadow-float sm:p-8 lg:p-10"
    >
      <OrbitLines night className="pointer-events-none absolute -right-24 -top-28 -z-10 size-[26rem] opacity-70 sm:-right-10" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 -z-10 size-80 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, var(--cp-brand), transparent)' }}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-center lg:gap-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <ProgressRing value={pct} size={136} stroke={9} tone="gold" night label={`${pct}% of achievements earned`}>
            <span className="block font-wide text-[2.1rem] font-extrabold leading-none tabular-nums">{earned}</span>
            <span className="label-mono mt-1.5 block text-[10px] text-night-sage/80">of {total}</span>
          </ProgressRing>

          <div className="min-w-0">
            <Eyebrow night>Collection</Eyebrow>
            <h2 id="cabinet-collection" className="mt-3 font-wide text-[1.9rem] font-extrabold leading-[0.98] sm:text-[2.5rem]">
              {earned} of {total} catalogued
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
              {complete
                ? 'Every specimen is in the cabinet. A complete collection — new medals will appear here as they’re added.'
                : best > 0
                ? latest
                  ? `Latest addition: “${latest.a.title}”, ${longDate(
                      latest.at!,
                    )}. Every locked medal below measures against your best score.`
                  : 'Every locked medal below measures against your best score.'
                : 'Submit a score in any game or simulator to start measuring the cabinet.'}
            </p>
            <dl className="mt-5 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-4">
              <div>
                <dt className="label-mono text-[10px] text-night-sage/70">Best score</dt>
                <dd className="mt-1 font-semiwide text-lg font-extrabold tabular-nums">
                  <AnimatedNumber value={best} />
                </dd>
              </div>
              <div>
                <dt className="label-mono text-[10px] text-night-sage/70">In progress</dt>
                <dd className="mt-1 font-semiwide text-lg font-extrabold tabular-nums">{inProgress}</dd>
              </div>
              <div>
                <dt className="label-mono text-[10px] text-night-sage/70">Earned</dt>
                <dd className="mt-1 font-semiwide text-lg font-extrabold tabular-nums">{pct}%</dd>
              </div>
            </dl>
          </div>
        </div>

        {next ? (
          <button
            type="button"
            onClick={() => onOpen(next)}
            aria-haspopup="dialog"
            className="group relative rounded-2xl border border-white/12 bg-white/[0.04] p-5 text-left transition-[background-color,border-color,transform,translate,scale,rotate] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07] active:scale-[0.985]"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="label-mono text-night-sage/80">Next milestone</span>
              <span className="label-mono text-white/45">{plate(next.no)}</span>
            </span>
            <span className="mt-3 flex items-center gap-4">
              <Medal unlocked={false} night className="size-12" />
              <span className="min-w-0">
                <span className="block truncate text-base font-bold">{next.a.title}</span>
                <span className="mt-0.5 block text-xs text-white/60">
                  Target {next.a.requiredScore.toLocaleString()} pts · your best {best.toLocaleString()}
                </span>
              </span>
            </span>
            <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-white/12" aria-hidden="true">
              <motion.span
                className="block h-full origin-left rounded-full bg-night-sage"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: next.progress }}
                viewport={{ once: true }}
                transition={{ duration: dur.cinematic, ease: ease.out, delay: 0.2 }}
              />
            </span>
            <span className="mt-2.5 flex items-baseline justify-between gap-3 text-xs">
              <span className="text-white/60">{Math.floor(next.progress * 100)}% there</span>
              <span className="font-semibold text-white">
                {next.toGo > 0 ? (
                  <>
                    <span className="font-semiwide text-base font-extrabold tabular-nums">{next.toGo.toLocaleString()}</span> points to go
                  </>
                ) : (
                  'Target met — awaiting award'
                )}
              </span>
            </span>
          </button>
        ) : (
          <div className="rounded-2xl border border-night-gold/35 bg-white/[0.04] p-5">
            <span className="label-mono text-night-gold">Cabinet complete</span>
            <p className="mt-2 text-sm text-white/70">You’ve earned every medal currently catalogued.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------------------- Specimen -------------------------------- */

function StatusTag({ e }: { e: Entry }) {
  if (e.unlocked)
    return (
      <Badge tone="gold" className="px-2 py-0.5 text-[10px]">
        Earned
      </Badge>
    );
  if (e.progress >= 1)
    return (
      <Badge tone="brand" variant="outline" className="px-2 py-0.5 text-[10px]">
        Target met
      </Badge>
    );
  return (
    <span className="label-mono inline-flex items-center gap-1 text-[10px] text-ink-faint">
      <Lock className="size-3" aria-hidden="true" /> Locked
    </span>
  );
}

function Specimen({ e, onOpen }: { e: Entry; onOpen: () => void }) {
  const { a, unlocked, progress, toGo, at } = e;
  const status = unlocked ? `earned ${longDate(at!)}` : progress >= 1 ? 'target met' : `${toGo.toLocaleString()} points to go`;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${a.title}, ${plate(e.no)}, ${status}. Open record`}
      className={cn(
        'group relative flex h-full w-full items-center gap-4 rounded-[20px] border bg-surface p-4 text-left shadow-soft',
        'transition-[transform,translate,scale,rotate,box-shadow,border-color] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-card active:scale-[0.985]',
        'sm:flex-col sm:items-stretch sm:gap-0 sm:p-5',
        unlocked ? 'border-gold/45 hover:border-gold/70' : 'border-line hover:border-brand/40',
      )}
    >
      {unlocked && <CornerTicks size={8} inset={8} className="hidden text-gold/70 sm:block" />}

      <span className="hidden w-full items-center justify-between sm:flex">
        <PlateTag>{plate(e.no)}</PlateTag>
        <StatusTag e={e} />
      </span>

      <Medal
        unlocked={unlocked}
        className="size-14 transition-transform duration-500 ease-out-expo group-hover:-rotate-6 sm:mx-auto sm:mt-4 sm:size-24"
      />

      <span className="flex min-w-0 flex-1 flex-col sm:mt-4">
        <span className="flex items-center gap-2 sm:hidden">
          <PlateTag className="text-[10px]">{plate(e.no)}</PlateTag>
          <StatusTag e={e} />
        </span>
        <span className="mt-1 line-clamp-2 font-bold leading-snug text-ink sm:mt-0 sm:text-center">{a.title}</span>
        {a.description && (
          <span className="mt-1 hidden text-sm leading-relaxed text-ink-muted sm:line-clamp-2 sm:text-center">{a.description}</span>
        )}

        <span className="mt-3 block sm:mt-auto sm:pt-5">
          {unlocked ? (
            <span className="flex sm:justify-center">
              <span className="label-mono inline-flex -rotate-[1.5deg] items-center gap-1.5 rounded-md border border-gold/60 px-2 py-1 text-[10px] text-gold-strong">
                Catalogued · {longDate(at!)}
              </span>
            </span>
          ) : (
            <>
              <Progress value={progress * 100} size="sm" label={`Progress toward ${a.title}`} className="[&>div:first-child]:sr-only" />
              <span className="mt-2 flex items-baseline justify-between gap-3 text-xs">
                <span className="tabular-nums text-ink-faint">
                  {e.reached.toLocaleString()} / {a.requiredScore.toLocaleString()}
                </span>
                <span className="font-semibold text-ink-muted">
                  {toGo > 0 ? (
                    <>
                      <span className="tabular-nums text-ink">{toGo.toLocaleString()}</span> to go
                    </>
                  ) : (
                    'Awaiting award'
                  )}
                </span>
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}

/* --------------------------------- Record --------------------------------- */

function SpecimenRecord({ e, best, open }: { e: Entry; best: Score | null; open: boolean }) {
  const { a, unlocked, progress, toGo, at } = e;

  // Rarity is only shown when it can be measured: holders of this medal ÷ registered explorers.
  const holdersQ = useQuery({
    queryKey: [...queryKeys.achievements.user.all, 'by-achievement', a.id],
    queryFn: () => userAchievementApi.getByAchievement(a.id),
    staleTime: 10 * 60 * 1000,
    enabled: open,
  });
  const usersQ = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userApi.getAll(),
    staleTime: 60 * 60 * 1000,
    enabled: open,
  });
  const holders = holdersQ.data?.length;
  const players = usersQ.data?.length;
  const share = holders !== undefined && players ? (holders / players) * 100 : null;
  const tier = share === null ? null : share <= 5 ? 'Rare' : share <= 25 ? 'Uncommon' : 'Common';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring.soft}
          className="relative grid size-28 shrink-0 place-items-center rounded-full bg-surface-2/60 sm:size-32"
        >
          <Medal unlocked={unlocked} className="size-24 sm:size-28" />
        </motion.div>
        <div className="min-w-0">
          <p className="label-mono flex flex-wrap items-center gap-2 text-ink-faint">
            <span>{plate(e.no)}</span>
            <span aria-hidden="true">·</span>
            <span className={unlocked ? 'text-gold-strong' : undefined}>
              {unlocked ? 'Earned' : progress >= 1 ? 'Target met' : 'Locked'}
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {a.description || 'Submit a score that reaches the target to strike this medal.'}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        <div className="bg-surface p-4">
          <dt className="label-mono text-ink-faint">Requirement</dt>
          <dd className="mt-1.5 font-semiwide text-xl font-extrabold tabular-nums text-ink">
            {a.requiredScore.toLocaleString()} <span className="text-sm font-bold text-ink-muted">pts</span>
          </dd>
          <dd className="text-xs text-ink-faint">score target</dd>
        </div>
        <div className="bg-surface p-4">
          <dt className="label-mono text-ink-faint">Your best</dt>
          <dd className="mt-1.5 font-semiwide text-xl font-extrabold tabular-nums text-ink">{(best?.scoreValue ?? 0).toLocaleString()}</dd>
          <dd className="text-xs text-ink-faint">{best ? `set ${longDate(best.playedAt)}` : 'no scores yet'}</dd>
        </div>
        <div className="bg-surface p-4">
          <dt className="label-mono text-ink-faint">{unlocked ? 'Catalogued' : 'Distance'}</dt>
          {unlocked ? (
            <>
              <dd className="mt-1.5 text-base font-bold text-gold-strong">{longDate(at!)}</dd>
              <dd className="text-xs text-ink-faint">at {clockTime(at!)}</dd>
            </>
          ) : (
            <>
              <dd className="mt-1.5 font-semiwide text-xl font-extrabold tabular-nums text-ink">
                {toGo > 0 ? toGo.toLocaleString() : '0'} <span className="text-sm font-bold text-ink-muted">to go</span>
              </dd>
              <dd className="text-xs text-ink-faint">
                {toGo > 0 ? `${Math.floor(progress * 100)}% of target` : 'awarded on a qualifying score'}
              </dd>
            </>
          )}
        </div>
        <div className="bg-surface p-4" aria-live="polite">
          <dt className="label-mono text-ink-faint">Rarity</dt>
          {holdersQ.isLoading || usersQ.isLoading ? (
            <dd className="mt-2 space-y-2">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </dd>
          ) : share !== null && holders !== undefined && players ? (
            <>
              <dd className="mt-1.5 font-semiwide text-xl font-extrabold tabular-nums text-ink">
                {share < 1 && holders > 0 ? '<1' : Math.round(share)}
                <span className="text-sm font-bold text-ink-muted">%</span>{' '}
                <span className="label-mono align-middle text-[10px] text-ink-faint">{tier}</span>
              </dd>
              <dd className="text-xs text-ink-faint">
                held by {holders.toLocaleString()} of {players.toLocaleString()} explorers
              </dd>
            </>
          ) : (
            <dd className="mt-1.5 text-sm text-ink-faint">Not available right now</dd>
          )}
        </div>
      </dl>

      {!unlocked && <Progress value={progress * 100} label="Progress to target" showValue />}
    </div>
  );
}

/* -------------------------------- Skeleton -------------------------------- */

function CabinetSkeleton() {
  const dim = 'bg-white/10 [&>.skeleton-shimmer]:opacity-10';
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading achievements">
      <div className="rounded-[28px] bg-navy p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-center lg:gap-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <div className="size-[136px] shrink-0 rounded-full border-[9px] border-white/10" />
            <div className="flex-1 space-y-3">
              <Skeleton className={cn('h-3 w-28 rounded-md', dim)} />
              <Skeleton className={cn('h-9 w-64 max-w-full', dim)} />
              <Skeleton className={cn('h-3.5 w-80 max-w-full rounded-md', dim)} />
              <Skeleton className={cn('h-3.5 w-56 max-w-full rounded-md', dim)} />
            </div>
          </div>
          <Skeleton className={cn('h-40 rounded-2xl', dim)} />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Skeleton className="h-12 w-72 max-w-full rounded-full" />
        <Skeleton className="h-11 w-full sm:w-56" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-4 sm:flex-col sm:p-5">
            <Skeleton className="size-14 shrink-0 rounded-full sm:mt-6 sm:size-24" />
            <div className="w-full flex-1 space-y-2.5 sm:mt-2 sm:flex sm:flex-col sm:items-center">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="hidden h-3 w-2/3 rounded-md sm:block" />
              <Skeleton className="h-1.5 w-full rounded-full sm:mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
