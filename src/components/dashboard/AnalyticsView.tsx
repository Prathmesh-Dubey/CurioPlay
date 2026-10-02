/*
 * THE INSTRUMENT ROOM — concept
 * Analytics as the observatory's instrument room: each panel is a calibrated instrument with a plate number,
 * reading only real sessions and scores. One range dial (7d / 30d / All) re-tunes every instrument at once,
 * client-side. Readouts first (stat cards with sparklines), then the score trace (crosshair + tooltip) beside
 * the 12-week activity calendar, then the per-experience ledger and the session log. The platform pulse
 * closes the room as a single night chapter.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Activity, Award, BarChart3, CalendarDays, Clock, FlaskConical, Gamepad2, ListOrdered, Medal, Target, Users } from 'lucide-react';
import type { GameSession, User, UserAchievement } from '@/api/api';
import {
  useAchievements,
  useDailyActiveUsers,
  useGames,
  useSessionCount,
  useSimulators,
  useTotalPlayTime,
  useUserAchievements,
  useUserScores,
  useUserSessions,
} from '@/hooks';
import { dur, ease } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevealGroup, RevealItem } from '@/components/motion/reveal';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { Badge, Button, Card, EmptyState, ErrorState, Eyebrow, OrbitLines, PlateTag, Progress, Skeleton, Tabs } from '@/components/ui';
import { ScoreChart, type ChartPoint } from '@/components/analytics/ScoreChart';
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap';
import {
  DAY,
  RANGE_LABEL,
  clockTime,
  formatDuration,
  rangeStart,
  shortDate,
  splitDuration,
  startOfDay,
  toTime,
  useMediaQuery,
  type RangeKey,
} from '@/components/analytics/utils';

interface AnalyticsViewProps {
  user: User;
}

interface Experience {
  title: string;
  kind: 'game' | 'simulator';
}

/** A session with no end older than this is shown as unfinished rather than "in progress". */
const LIVE_WINDOW = 6 * 60 * 60 * 1000;

export default function AnalyticsView({ user }: AnalyticsViewProps) {
  const today = useMemo(() => new Date().toISOString().split('T')[0] + 'T00:00:00', []);
  const now = useMemo(() => Date.now(), []);
  const [range, setRange] = useState<RangeKey>('all');
  const [logLimit, setLogLimit] = useState(8);
  const [showAllRows, setShowAllRows] = useState(false);

  const timeQ = useTotalPlayTime(user.id);
  const countQ = useSessionCount(user.id);
  const scoresQ = useUserScores(user.id);
  const sessionsQ = useUserSessions(user.id);
  const unlockedQ = useUserAchievements(user.id);
  const { data: achievements = [] } = useAchievements();
  const { data: games = [] } = useGames();
  const { data: sims = [] } = useSimulators();
  const dauQ = useDailyActiveUsers(today);

  const scores = useMemo(() => scoresQ.data ?? [], [scoresQ.data]);
  const sessions = useMemo(() => sessionsQ.data ?? [], [sessionsQ.data]);
  const unlocked = useMemo(() => unlockedQ.data ?? [], [unlockedQ.data]);

  const catalog = useMemo(() => {
    const m = new Map<string, Experience>();
    games.forEach((g) => m.set(g.id, { title: g.title, kind: 'game' }));
    sims.forEach((s) => m.set(s.id, { title: s.title, kind: 'simulator' }));
    return m;
  }, [games, sims]);
  const titleOf = useCallback((id: string) => catalog.get(id)?.title ?? 'Unknown experience', [catalog]);

  const from = rangeStart(range, now);

  const scoresIn = useMemo(
    () =>
      scores
        .map((s) => ({ s, t: toTime(s.playedAt) }))
        .filter((x) => Number.isFinite(x.t) && x.t >= from)
        .sort((a, b) => a.t - b.t),
    [scores, from],
  );
  const sessionsIn = useMemo(
    () =>
      sessions
        .map((s) => ({ s, t: toTime(s.startTime) }))
        .filter((x) => Number.isFinite(x.t) && x.t >= from)
        .sort((a, b) => b.t - a.t),
    [sessions, from],
  );

  const stats = useMemo(() => {
    const values = scoresIn.map((x) => x.s.scoreValue);
    const best = values.length ? Math.max(...values) : 0;
    const avg = values.length ? Math.round(values.reduce((a, v) => a + v, 0) / values.length) : 0;
    const playSeconds = range === 'all' ? timeQ.data ?? 0 : sessionsIn.reduce((a, x) => a + (x.s.duration ?? 0), 0);
    const sessionTotal = range === 'all' ? countQ.data ?? 0 : sessionsIn.length;
    const earned = range === 'all' ? unlocked.length : unlocked.filter((u) => toTime(u.unlockedAt) >= from).length;
    return { best, avg, playSeconds, sessionTotal, earned };
  }, [scoresIn, sessionsIn, range, timeQ.data, countQ.data, unlocked, from]);

  /** Sparkline series: equal time buckets across the range (weekly-ish for "All"). */
  const trend = useMemo(() => {
    let start: number;
    let n: number;
    if (range !== 'all') {
      start = from;
      n = range === '7d' ? 7 : 30;
    } else {
      const times = [...scoresIn.map((x) => x.t), ...sessionsIn.map((x) => x.t)];
      if (!times.length) return null;
      start = startOfDay(Math.min(...times));
      const spanDays = Math.max(1, Math.ceil((now - start) / DAY));
      n = Math.min(24, Math.max(2, Math.ceil(spanDays / 7)));
    }
    const size = Math.max(1, (now - start) / n);
    const at = (t: number) => Math.min(n - 1, Math.max(0, Math.floor((t - start) / size)));
    const minutes = new Array<number>(n).fill(0);
    const count = new Array<number>(n).fill(0);
    const peak = new Array<number>(n).fill(0);
    const sum = new Array<number>(n).fill(0);
    const cnt = new Array<number>(n).fill(0);
    sessionsIn.forEach(({ s, t }) => {
      const i = at(t);
      count[i] += 1;
      minutes[i] += (s.duration ?? 0) / 60;
    });
    scoresIn.forEach(({ s, t }) => {
      const i = at(t);
      peak[i] = Math.max(peak[i], s.scoreValue);
      sum[i] += s.scoreValue;
      cnt[i] += 1;
    });
    let run = 0;
    const best = peak.map((v) => (run = Math.max(run, v)));
    let last = 0;
    const avg = sum.map((v, i) => (cnt[i] ? (last = v / cnt[i]) : last));
    const some = (a: number[]) => (a.some((v) => v > 0) ? a : undefined);
    return { minutes: some(minutes), count: some(count), best: some(best), avg: some(avg) };
  }, [range, from, now, scoresIn, sessionsIn]);

  const points = useMemo<ChartPoint[]>(
    () => scoresIn.map(({ s, t }) => ({ id: s.id, value: s.scoreValue, at: t, label: titleOf(s.gameId) })),
    [scoresIn, titleOf],
  );

  const breakdown = useMemo(() => {
    const m = new Map<string, { sessions: number; seconds: number; scores: number; best: number }>();
    const get = (id: string) => m.get(id) ?? { sessions: 0, seconds: 0, scores: 0, best: 0 };
    sessionsIn.forEach(({ s }) => {
      const cur = get(s.gameId);
      m.set(s.gameId, { ...cur, sessions: cur.sessions + 1, seconds: cur.seconds + (s.duration ?? 0) });
    });
    scoresIn.forEach(({ s }) => {
      const cur = get(s.gameId);
      m.set(s.gameId, { ...cur, scores: cur.scores + 1, best: Math.max(cur.best, s.scoreValue) });
    });
    const bySessions = sessionsIn.length > 0;
    const rows = [...m.entries()]
      .map(([gameId, v]) => ({ gameId, ...v, metric: bySessions ? v.sessions : v.scores }))
      .filter((r) => r.sessions > 0 || r.scores > 0)
      .sort((a, b) => b.metric - a.metric || b.scores - a.scores || b.best - a.best);
    return { rows, unit: bySessions ? 'session' : 'score', max: Math.max(1, ...rows.map((r) => r.metric)) };
  }, [sessionsIn, scoresIn]);

  const play = splitDuration(stats.playSeconds);
  const roomy = useMediaQuery('(min-width: 640px)');
  const latestUnlock = useMemo(() => [...unlocked].sort((a, b) => toTime(b.unlockedAt) - toTime(a.unlockedAt))[0] ?? null, [unlocked]);

  const changeRange = (r: RangeKey) => {
    setRange(r);
    setLogLimit(8);
    setShowAllRows(false);
  };

  const mineLoading = scoresQ.isLoading || sessionsQ.isLoading || countQ.isLoading;
  const noActivity = !mineLoading && scores.length === 0 && sessions.length === 0 && (countQ.data ?? 0) === 0;
  const rangeLabel = RANGE_LABEL[range].toLowerCase();
  const showAllTime = range !== 'all' && (
    <Button variant="outline" size="sm" onClick={() => changeRange('all')}>
      Show all time
    </Button>
  );

  const latest = points[points.length - 1];
  const rows = showAllRows ? breakdown.rows : breakdown.rows.slice(0, 6);
  const log = sessionsIn.slice(0, logLimit);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        index="06"
        eyebrow="The Instrument Room"
        title="Analytics"
        description="How you play, read from your real sessions and scores. Tune the range and every instrument re-reads."
        actions={
          <Tabs<RangeKey>
            label="Time range"
            variant="segmented"
            value={range}
            onChange={changeRange}
            items={[
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
              { value: 'all', label: 'All' },
            ]}
          />
        }
      />

      {/* Readouts — sparklines only where the card is wide enough to carry them */}
      <section aria-label={`Readouts, ${rangeLabel}`} className="grid grid-cols-2 gap-3 sm:gap-4 2xl:grid-cols-4">
        <StatCard
          icon={<Clock className="size-4" />}
          label="Play time"
          value={range === 'all' && timeQ.isError ? '—' : play.value}
          suffix={range === 'all' && timeQ.isError ? undefined : play.suffix}
          hint={RANGE_LABEL[range]}
          loading={range === 'all' ? timeQ.isLoading : sessionsQ.isLoading}
          trend={roomy ? trend?.minutes : undefined}
        />
        <StatCard
          icon={<Activity className="size-4" />}
          label="Sessions"
          value={range === 'all' && countQ.isError ? '—' : stats.sessionTotal}
          hint={RANGE_LABEL[range]}
          loading={range === 'all' ? countQ.isLoading : sessionsQ.isLoading}
          tone="rose"
          trend={roomy ? trend?.count : undefined}
        />
        <StatCard
          icon={<Medal className="size-4" />}
          label="Best score"
          value={scoresQ.isError ? '—' : stats.best}
          hint={scoresIn.length ? `from ${scoresIn.length} score${scoresIn.length === 1 ? '' : 's'}` : RANGE_LABEL[range]}
          loading={scoresQ.isLoading}
          tone="gold"
          trend={roomy ? trend?.best : undefined}
        />
        <StatCard
          icon={<Target className="size-4" />}
          label="Average score"
          value={scoresQ.isError ? '—' : stats.avg}
          hint={RANGE_LABEL[range]}
          loading={scoresQ.isLoading}
          trend={roomy ? trend?.avg : undefined}
        />
        <AchievementsReadout
          className="col-span-2 2xl:col-span-4"
          loading={unlockedQ.isLoading}
          error={unlockedQ.isError}
          onRetry={() => unlockedQ.refetch()}
          earnedAllTime={unlocked.length}
          earnedInRange={stats.earned}
          total={achievements.length}
          range={range}
          latest={latestUnlock}
        />
      </section>

      {noActivity ? (
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          title="No readings yet"
          description="These instruments fill in as you play. Open any game or simulator to log a session, and submit a score to start the trace — nothing here is estimated."
          action={
            <Button
              variant="outline"
              size="sm"
              loading={scoresQ.isFetching || sessionsQ.isFetching}
              onClick={() => {
                scoresQ.refetch();
                sessionsQ.refetch();
                countQ.refetch();
              }}
            >
              Check again
            </Button>
          }
        />
      ) : (
        <>
          <RevealGroup className="grid gap-4 sm:gap-6 xl:grid-cols-12" stagger={0.08}>
            <RevealItem className="min-w-0 xl:col-span-8">
              <Instrument
                id="instr-trace"
                plate="INSTR. 01"
                title="Score trace"
                description={
                  scoresQ.isLoading
                    ? 'Reading scores…'
                    : `${points.length} score${points.length === 1 ? '' : 's'} · ${rangeLabel}, oldest to newest`
                }
                action={
                  latest && (
                    <span className="text-right">
                      <span className="label-mono block text-ink-faint">Latest</span>
                      <span className="font-semiwide text-lg font-extrabold tabular-nums text-ink">{latest.value.toLocaleString()}</span>
                    </span>
                  )
                }
              >
                {scoresQ.isLoading ? (
                  <ChartSkeleton />
                ) : scoresQ.isError ? (
                  <ErrorState
                    compact
                    description="Your scores didn’t load, so the trace can’t be drawn."
                    onRetry={() => scoresQ.refetch()}
                  />
                ) : points.length === 0 ? (
                  <EmptyState
                    compact
                    variant="plain"
                    icon={<Target className="size-5" />}
                    title={range === 'all' ? 'No scores yet' : `No scores in the ${rangeLabel}`}
                    description={
                      range === 'all'
                        ? 'Submit a score in any game or simulator and the trace draws itself here, one point per score.'
                        : 'Scores you submit in this window will plot here. Widen the range to see your earlier ones.'
                    }
                    action={showAllTime}
                  />
                ) : (
                  <>
                    <ScoreChart points={points} subject={`Your scores, ${rangeLabel}`} />
                    {points.length === 1 && (
                      <p className="mt-3 text-center text-xs text-ink-faint">One score so far — submit another to draw a trend line.</p>
                    )}
                  </>
                )}
              </Instrument>
            </RevealItem>

            <RevealItem className="min-w-0 xl:col-span-4">
              <Instrument
                id="instr-calendar"
                plate="INSTR. 02"
                title="Activity calendar"
                description={range === 'all' ? 'Sessions started, last 12 weeks' : `Last 12 weeks · ${rangeLabel} highlighted`}
                action={<CalendarDays className="size-4 text-ink-faint" aria-hidden="true" />}
              >
                {sessionsQ.isLoading ? (
                  <HeatmapSkeleton />
                ) : sessionsQ.isError ? (
                  <ErrorState compact description="Your sessions didn’t load." onRetry={() => sessionsQ.refetch()} />
                ) : sessions.length === 0 ? (
                  <EmptyState
                    compact
                    variant="plain"
                    icon={<CalendarDays className="size-5" />}
                    title="No sessions logged"
                    description="A session is logged each time you open a game or simulator. Your days will light up here."
                  />
                ) : (
                  <ActivityHeatmap sessions={sessions} highlightFrom={from} />
                )}
              </Instrument>
            </RevealItem>
          </RevealGroup>

          <RevealGroup className="grid gap-4 sm:gap-6 lg:grid-cols-12" stagger={0.08}>
            <RevealItem className="min-w-0 lg:col-span-5">
              <Instrument
                id="instr-ledger"
                plate="INSTR. 03"
                title="By experience"
                description={`Most played, ${rangeLabel}, measured in ${breakdown.unit === 'session' ? 'sessions' : 'submitted scores'}`}
              >
                {scoresQ.isLoading || sessionsQ.isLoading ? (
                  <BarsSkeleton />
                ) : scoresQ.isError && sessionsQ.isError ? (
                  <ErrorState
                    compact
                    onRetry={() => {
                      scoresQ.refetch();
                      sessionsQ.refetch();
                    }}
                  />
                ) : breakdown.rows.length === 0 ? (
                  <EmptyState
                    compact
                    variant="plain"
                    icon={<Gamepad2 className="size-5" />}
                    title="Nothing to compare yet"
                    description={
                      range === 'all'
                        ? 'Play a couple of different experiences and they’ll be ranked here by how often you return.'
                        : `No play recorded in the ${rangeLabel}.`
                    }
                    action={showAllTime}
                  />
                ) : (
                  <>
                    <ol className="flex flex-col gap-5">
                      {rows.map((r, i) => {
                        const kind = catalog.get(r.gameId)?.kind;
                        return (
                          <li key={r.gameId}>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-2.5">
                                <span className="label-mono w-5 shrink-0 text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
                                {kind === 'simulator' ? (
                                  <FlaskConical className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                                ) : (
                                  <Gamepad2 className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                                )}
                                <span className="truncate text-sm font-semibold text-ink">{titleOf(r.gameId)}</span>
                              </span>
                              <span className="shrink-0 font-semiwide text-base font-extrabold tabular-nums text-ink">
                                {r.metric}
                                <span className="ml-1 text-xs font-semibold text-ink-faint">
                                  {breakdown.unit}
                                  {r.metric === 1 ? '' : 's'}
                                </span>
                              </span>
                            </div>
                            <div className="ml-[1.875rem] mt-2 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                              <motion.div
                                className="h-full w-full origin-left rounded-full bg-brand"
                                initial={{ scaleX: 0 }}
                                whileInView={{ scaleX: r.metric / breakdown.max }}
                                viewport={{ once: true }}
                                transition={{ duration: dur.slow, ease: ease.out, delay: Math.min(i, 8) * 0.05 }}
                              />
                            </div>
                            <p className="ml-[1.875rem] mt-1.5 text-xs text-ink-faint">
                              {r.sessions} session{r.sessions === 1 ? '' : 's'} · {r.scores} score{r.scores === 1 ? '' : 's'}
                              {r.best > 0 && ` · best ${r.best.toLocaleString()}`}
                              {r.seconds > 0 && ` · ${formatDuration(r.seconds)}`}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                    {breakdown.rows.length > 6 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={() => setShowAllRows((v) => !v)}
                        aria-expanded={showAllRows}
                      >
                        {showAllRows ? 'Show top 6' : `Show all ${breakdown.rows.length}`}
                      </Button>
                    )}
                  </>
                )}
              </Instrument>
            </RevealItem>

            <RevealItem className="min-w-0 lg:col-span-7">
              <Instrument
                id="instr-log"
                plate="INSTR. 04"
                title="Session log"
                description={
                  sessionsQ.isLoading
                    ? 'Reading sessions…'
                    : `${sessionsIn.length} session${sessionsIn.length === 1 ? '' : 's'} · ${rangeLabel}, newest first`
                }
                action={<ListOrdered className="size-4 text-ink-faint" aria-hidden="true" />}
              >
                {sessionsQ.isLoading ? (
                  <LogSkeleton />
                ) : sessionsQ.isError ? (
                  <ErrorState compact description="Your sessions didn’t load." onRetry={() => sessionsQ.refetch()} />
                ) : log.length === 0 ? (
                  <EmptyState
                    compact
                    variant="plain"
                    icon={<ListOrdered className="size-5" />}
                    title={range === 'all' ? 'No sessions recorded' : `No sessions in the ${rangeLabel}`}
                    description={
                      range === 'all'
                        ? 'Each time you open a game or simulator, a session is written to this log with its duration.'
                        : 'Widen the range to read earlier entries.'
                    }
                    action={showAllTime}
                  />
                ) : (
                  <>
                    <div className="label-mono hidden grid-cols-[9.5rem_minmax(0,1fr)_auto] gap-4 border-b border-line pb-2 text-ink-faint sm:grid">
                      <span>When</span>
                      <span>Experience</span>
                      <span className="text-right">Duration</span>
                    </div>
                    <ol className="divide-y divide-line">
                      {log.map(({ s, t }) => (
                        <SessionRow key={s.id} s={s} t={t} now={now} experience={catalog.get(s.gameId)} />
                      ))}
                    </ol>
                    {sessionsIn.length > logLimit && (
                      <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setLogLimit((l) => l + 8)}>
                        Show {Math.min(8, sessionsIn.length - logLimit)} more
                      </Button>
                    )}
                  </>
                )}
              </Instrument>
            </RevealItem>
          </RevealGroup>
        </>
      )}

      <PlatformPulse dau={dauQ.data} loading={dauQ.isLoading} error={dauQ.isError} onRetry={() => dauQ.refetch()} />
    </div>
  );
}

/* -------------------------------- Pieces --------------------------------- */

function Instrument({
  id,
  plate,
  title,
  description,
  action,
  children,
}: {
  id: string;
  plate: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card role="region" aria-labelledby={id} className="flex h-full min-w-0 flex-col p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <PlateTag>{plate}</PlateTag>
          <h2 id={id} className="mt-1.5 text-lg font-bold tracking-tight text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="mt-5 min-w-0 flex-1">{children}</div>
    </Card>
  );
}

function SessionRow({ s, t, now, experience }: { s: GameSession; t: number; now: number; experience?: Experience }) {
  const open = s.duration == null;
  const live = open && now - t < LIVE_WINDOW;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 py-3 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto]">
      <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:col-start-2">
        {experience?.kind === 'simulator' ? (
          <FlaskConical className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
        ) : (
          <Gamepad2 className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
        )}
        <span className="truncate text-sm font-semibold text-ink">{experience?.title ?? 'Unknown experience'}</span>
      </span>
      <time dateTime={s.startTime} className="label-mono col-start-1 row-start-2 text-ink-faint sm:row-start-1">
        {shortDate(t)} · {clockTime(t)}
      </time>
      <span className="col-start-2 row-span-2 row-start-1 justify-self-end sm:col-start-3 sm:row-span-1">
        {!open ? (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-ink-muted">
            {formatDuration(s.duration ?? 0)}
          </span>
        ) : live ? (
          <Badge tone="brand" dot="pulse">
            In progress
          </Badge>
        ) : (
          <span className="text-xs text-ink-faint">No end recorded</span>
        )}
      </span>
    </li>
  );
}

function AchievementsReadout({
  className,
  loading,
  error,
  onRetry,
  earnedAllTime,
  earnedInRange,
  total,
  range,
  latest,
}: {
  className?: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  earnedAllTime: number;
  earnedInRange: number;
  total: number;
  range: RangeKey;
  latest: UserAchievement | null;
}) {
  const pct = total ? (earnedAllTime / total) * 100 : 0;
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-soft sm:flex-row sm:items-center sm:gap-8',
        className,
      )}
    >
      <div className="flex items-center gap-4 sm:w-60 sm:shrink-0">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-strong">
          <Award className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="label-mono text-ink-faint">{range === 'all' ? 'Achievements' : 'Achievements earned'}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-20" />
          ) : error ? (
            <p className="mt-1 font-semiwide text-[1.75rem] font-extrabold leading-none text-ink">—</p>
          ) : (
            <p className="mt-1 flex items-baseline gap-1.5">
              <AnimatedNumber
                value={range === 'all' ? earnedAllTime : earnedInRange}
                className="font-semiwide text-[1.75rem] font-extrabold leading-none text-ink"
              />
              {range === 'all' && total > 0 && <span className="text-sm font-bold text-ink-muted">/ {total}</span>}
            </p>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        {loading ? (
          <Skeleton className="h-2.5 rounded-full" />
        ) : error ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">Your medals didn’t load.</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <Progress value={pct} tone="gold" size="sm" label={`${earnedAllTime} of ${total} earned all-time`} showValue />
            <p className="mt-2 truncate text-xs text-ink-faint">
              {range !== 'all'
                ? `${earnedInRange} earned in the ${RANGE_LABEL[range].toLowerCase()}`
                : latest
                ? `Latest: ${latest.achievementTitle} · ${shortDate(latest.unlockedAt)}`
                : total
                ? 'No medals yet — the cabinet measures every score you submit.'
                : 'No achievements have been catalogued yet.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function PlatformPulse({ dau, loading, error, onRetry }: { dau?: number; loading: boolean; error: boolean; onRetry: () => void }) {
  return (
    <section
      aria-labelledby="platform-pulse"
      className="grain relative isolate overflow-hidden rounded-[28px] bg-navy p-6 text-white shadow-float sm:p-8"
    >
      <OrbitLines
        night
        animate={false}
        className="pointer-events-none absolute -right-20 top-1/2 -z-10 size-80 -translate-y-1/2 opacity-70"
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Eyebrow night>Platform pulse · Today</Eyebrow>
          <h2 id="platform-pulse" className="mt-3 text-xl font-bold tracking-tight">
            Explorers active on CurioPlay today
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-white/65">
            Platform-wide daily active users — not just you. A quiet reminder that the observatory is shared.
          </p>
        </div>
        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2" aria-live="polite">
          {loading ? (
            <Skeleton className="h-14 w-28 bg-white/10 [&>.skeleton-shimmer]:opacity-10" />
          ) : error ? (
            <>
              <span className="text-sm text-white/65">Unavailable right now</span>
              <Button variant="night-outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            </>
          ) : (
            <span className="flex items-center gap-3">
              <Users className="size-5 text-night-sage" aria-hidden="true" />
              <AnimatedNumber value={dau ?? 0} className="font-wide text-[3.25rem] font-extrabold leading-none sm:text-[4rem]" />
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Skeletons ------------------------------- */

function ChartSkeleton() {
  return (
    <div className="relative h-[220px] sm:h-[280px]" aria-hidden="true">
      <div className="absolute inset-0 flex flex-col justify-between py-6 pl-11">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-px bg-line" />
        ))}
      </div>
      <Skeleton className="absolute bottom-8 left-11 right-3 top-6 rounded-xl opacity-70" />
    </div>
  );
}

function HeatmapSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton className="h-14 rounded-xl" />
      <div className="grid max-w-lg grid-cols-12 gap-[3px]">
        {Array.from({ length: 84 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-[4px]" />
        ))}
      </div>
    </div>
  );
}

function BarsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>
          <Skeleton className="h-2 rounded-full" style={{ width: `${90 - i * 18}%` }} />
        </div>
      ))}
    </div>
  );
}

function LogSkeleton() {
  return (
    <div aria-hidden="true" className="divide-y divide-line">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-3.5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-44 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}
