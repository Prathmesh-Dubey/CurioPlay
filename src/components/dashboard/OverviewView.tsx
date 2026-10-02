import { useMemo } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Check,
  Clock,
  FlaskConical,
  Gamepad2,
  Play,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { type User } from '@/api/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Progress, ProgressRing } from '@/components/ui/Data';
import { Skeleton } from '@/components/ui/Skeleton';
import { OrbitLines } from '@/components/ui/Decor';
import { Thumb } from '@/components/ui/Thumb';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { RevealGroup, RevealItem } from '@/components/motion/reveal';
import { Spotlight } from '@/components/motion/spotlight';
import { TextEffect } from '@/components/motion/text-effect';
import { useAchievements, useDailyActiveUsers, useUserData, useUserScores, useUserSessions } from '@/hooks';
import { useCatalog, type CatalogItem } from '@/hooks/useCatalog';
import { type TabId } from './nav';
import { ease } from '@/lib/motion';
import { cn } from '@/lib/utils';

/*
 * Overview — "Today's observations". A calm instrument room: where you left off (big, cover-led),
 * an instrument panel of real readings, an activity log stitched from sessions + scores,
 * the next medals within reach, and a first-steps checklist that disappears once it's done.
 * Every number is from the API; empty states teach instead of pretending.
 */

interface OverviewViewProps {
  user: User;
  onNavigate: (tab: TabId) => void;
  onOpenExperience: (id: string, kind: 'game' | 'simulator') => void;
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function relTime(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function Cover({ item, className }: { item: CatalogItem; className?: string }) {
  const sim = item.kind === 'simulator';
  return (
    <div className={cn('relative overflow-hidden', sim ? 'bg-rose-soft' : 'bg-navy', className)}>
      <Thumb
        src={item.thumbnail}
        className="size-full object-cover"
        fallback={
          <div className={cn('grid size-full place-items-center', sim && 'bg-graph')}>
            {sim ? <FlaskConical className="size-1/3 text-brand-strong" /> : <Gamepad2 className="size-1/3 text-night-sage" />}
          </div>
        }
      />
    </div>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col rounded-[24px] border border-line bg-surface p-5 sm:p-6', className)} aria-label={title}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="label-mono text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function OverviewView({ user, onNavigate, onOpenExperience }: OverviewViewProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0] + 'T00:00:00', []);
  const { data: dau, isLoading: dauLoading } = useDailyActiveUsers(todayStr);
  const data = useUserData(user.id);
  const { totalTime, sessionCount, achievementCount, scores, sessions, achievements: unlocked, isLoading } = data;
  // Same query keys as useUserData (no extra requests). A missing profile is normal for new
  // explorers, so only failed activity queries count as an error worth showing.
  const sessionsQ = useUserSessions(user.id);
  const scoresQ = useUserScores(user.id);
  const isError = sessionsQ.isError || scoresQ.isError;
  const { data: allAchievements = [] } = useAchievements();
  const catalog = useCatalog();
  const isAdmin = user.role === 'ADMIN';

  const byId = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    [...catalog.games, ...catalog.simulators].forEach((i) => map.set(i.id, i));
    return map;
  }, [catalog.games, catalog.simulators]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [sessions],
  );

  const recentlyPlayed = useMemo(() => {
    const seen = new Set<string>();
    const out: { item: CatalogItem; at: string }[] = [];
    sortedSessions.forEach((s) => {
      const item = byId.get(s.gameId);
      if (item && !seen.has(s.gameId)) {
        seen.add(s.gameId);
        out.push({ item, at: s.startTime });
      }
    });
    return out;
  }, [sortedSessions, byId]);

  const playedIds = useMemo(() => new Set(sessions.map((s) => s.gameId)), [sessions]);
  const recommended = useMemo(() => catalog.recent.filter((i) => !playedIds.has(i.id)).slice(0, 6), [catalog.recent, playedIds]);

  const bestScore = scores.length ? Math.max(...scores.map((s) => s.scoreValue)) : 0;
  const scoreTrend = useMemo(
    () =>
      [...scores]
        .sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())
        .slice(-10)
        .map((s) => s.scoreValue),
    [scores],
  );

  // Activity log: sessions and scores, newest first.
  const activity = useMemo(() => {
    const rows: { key: string; at: string; icon: typeof Play; text: React.ReactNode; tone: 'brand' | 'gold' }[] = [];
    sortedSessions.slice(0, 12).forEach((s) => {
      const item = byId.get(s.gameId);
      rows.push({
        key: `s-${s.id}`,
        at: s.startTime,
        icon: item?.kind === 'simulator' ? FlaskConical : Gamepad2,
        tone: 'brand',
        text: (
          <>
            {item?.kind === 'simulator' ? 'Ran' : 'Played'} <strong className="font-semibold text-ink">{item?.title ?? 'an experience'}</strong>
            {s.duration ? <span className="text-ink-faint"> · {formatDuration(s.duration)}</span> : null}
          </>
        ),
      });
    });
    scores.slice(-12).forEach((s) => {
      const item = byId.get(s.gameId);
      rows.push({
        key: `p-${s.id}`,
        at: s.playedAt,
        icon: Trophy,
        tone: 'gold',
        text: (
          <>
            Scored <strong className="font-semibold text-ink">{s.scoreValue.toLocaleString()}</strong> in {item?.title ?? 'a game'}
          </>
        ),
      });
    });
    return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 7);
  }, [sortedSessions, scores, byId]);

  const unlockedIds = useMemo(() => new Set(unlocked.map((u) => u.achievementId)), [unlocked]);
  const nextUp = useMemo(
    () => allAchievements.filter((a) => !unlockedIds.has(a.id)).sort((a, b) => a.requiredScore - b.requiredScore).slice(0, 3),
    [allAchievements, unlockedIds],
  );

  const playedGame = sessions.some((s) => byId.get(s.gameId)?.kind === 'game');
  const ranSim = sessions.some((s) => byId.get(s.gameId)?.kind === 'simulator');
  const checklist = [
    { label: 'Play your first game', done: playedGame, action: () => onNavigate('games') },
    { label: 'Run an experiment in the lab', done: ranSim, action: () => onNavigate('simulators') },
    { label: 'Submit a score', done: scores.length > 0, action: () => onNavigate('games') },
    { label: 'Earn your first medal', done: achievementCount > 0, action: () => onNavigate('achievements') },
    { label: 'Personalise your explorer card', done: !!(user.bio || user.avatarUrl || user.avatarSeed || user.accentColor), action: () => onNavigate('settings') },
  ];
  const checklistDone = checklist.filter((c) => c.done).length;
  const showChecklist = !isLoading && checklistDone < checklist.length;

  const hero = recentlyPlayed[0]?.item ?? catalog.recent[0];
  const resuming = !!recentlyPlayed[0];
  const memberDays = Math.max(1, Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / 86400000));
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* header */}
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.out }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="label-mono flex flex-wrap items-center gap-x-2.5 gap-y-1 text-brand-strong">
              <span className="text-gold-strong">№ 01</span>
              <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
              <span>{dateLabel}</span>
              {Number.isFinite(memberDays) && <span className="text-ink-faint">· Day {memberDays} of your field guide</span>}
            </p>
            <h1 className="mt-3 font-semiwide text-[2rem] font-extrabold leading-[1.02] text-ink sm:text-[2.6rem]">
              <TextEffect as="span" per="word" preset="fade-in-blur" speedSegment={0.4}>
                {`${greeting()}, ${user.username}.`}
              </TextEffect>
            </h1>
          </div>
        </div>
      </motion.header>

      {isError && !isLoading && (
        <ErrorState compact title="Some of your stats didn’t load" description="Your activity will appear once the connection recovers." onRetry={() => {
            sessionsQ.refetch();
            scoresQ.refetch();
          }} />
      )}

      {/* row 1: resume + instrument panel (side by side from lg; the panel never narrower than 20rem). */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <section aria-label="Continue exploring">
          {catalog.isLoading ? (
            <Skeleton className="h-[320px] rounded-[28px]" />
          ) : hero ? (
            <div className="group relative isolate h-full min-h-[300px] overflow-hidden rounded-[28px] bg-navy text-white">
              <Cover item={hero} className="absolute inset-0 -z-20 size-full opacity-55 transition-[opacity,scale] duration-700 group-hover:scale-[1.03] group-hover:opacity-65" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/85 to-navy/20" />
              <Spotlight size={340} className="from-white/20 via-white/5 to-transparent dark:from-white/20 dark:via-white/5 dark:to-transparent" />
              <div className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8">
                <div className="flex items-center gap-2">
                  <Badge tone="night">
                    <Sparkles className="size-3" /> {resuming ? 'Continue exploring' : 'Start here'}
                  </Badge>
                  {resuming && recentlyPlayed[0] && <span className="label-mono text-night-sage/70">Last opened {relTime(recentlyPlayed[0].at)}</span>}
                </div>
                <div className="max-w-lg">
                  <p className="label-mono text-night-gold">{hero.kind === 'game' ? 'Game' : 'Simulator'} · {hero.category ?? 'General'}</p>
                  <h2 className="mt-2 font-wide text-4xl font-extrabold leading-[0.95] sm:text-5xl">{hero.title}</h2>
                  <p className="mt-3 line-clamp-2 text-white/65">{hero.description || 'An interactive experience running right in your browser.'}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button variant="night" size="lg" leadingIcon={<Play className="size-4 fill-current" />} onClick={() => onOpenExperience(hero.id, hero.kind)}>
                      {resuming ? 'Resume' : 'Launch'}
                    </Button>
                    <Button
                      variant="night-outline"
                      size="lg"
                      trailingIcon={<ArrowRight className="size-4" />}
                      onClick={() => onNavigate(hero.kind === 'game' ? 'games' : 'simulators')}
                    >
                      {hero.kind === 'game' ? 'Game library' : 'The lab'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles className="size-5" />}
              title="Nothing to play yet"
              description={isAdmin ? 'Publish the first one from Studio → Creator Studio.' : 'No games or simulators have been published. Check back soon.'}
              className="h-full"
            />
          )}
        </section>

        {/* instrument panel */}
        <section aria-label="Your readings" className="rounded-[28px] border border-line bg-surface p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="label-mono text-ink">Instrument panel</h2>
            <button type="button" onClick={() => onNavigate('analytics')} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong">
              Analytics <ArrowUpRight className="size-3.5" />
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4 lg:grid-cols-2">
            {[
              { icon: Clock, label: 'Play time', value: formatDuration(totalTime), raw: null },
              { icon: Target, label: 'Sessions', value: null, raw: sessionCount },
              { icon: Trophy, label: 'Best score', value: null, raw: bestScore },
              { icon: Award, label: 'Medals', value: null, raw: achievementCount },
            ].map((r) => (
              <div key={r.label} className="bg-surface p-4">
                <dt className="label-mono flex items-center gap-1.5 text-ink-faint">
                  <r.icon className="size-3" /> {r.label}
                </dt>
                <dd className="mt-2 font-semiwide text-2xl font-extrabold tabular-nums text-ink">
                  {isLoading ? <Skeleton className="h-7 w-14" /> : r.value ?? <AnimatedNumber value={r.raw ?? 0} />}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5">
            <p className="label-mono mb-2 flex items-center justify-between text-ink-faint">
              <span>Score trend</span>
              <span>last {scoreTrend.length || 0}</span>
            </p>
            {scoreTrend.length > 1 ? (
              <svg viewBox="0 0 200 48" className="h-12 w-full overflow-visible" role="img" aria-label={`Latest score ${scoreTrend[scoreTrend.length - 1]}`}>
                {(() => {
                  const max = Math.max(...scoreTrend, 1);
                  const pts = scoreTrend.map((v, i) => [(i / (scoreTrend.length - 1)) * 200, 44 - (v / max) * 40] as const);
                  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
                  return (
                    <>
                      <path d={`${d} L200,48 L0,48 Z`} fill="var(--cp-brand)" fillOpacity="0.1" />
                      <motion.path
                        d={d}
                        fill="none"
                        stroke="var(--cp-brand)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.2, ease: ease.out }}
                      />
                    </>
                  );
                })()}
              </svg>
            ) : (
              <p className="rounded-xl bg-surface-2 px-3 py-3 text-xs text-ink-muted">Submit two scores and your trend line appears here.</p>
            )}
          </div>
        </section>
      </div>

      {/* row 2: activity + medals */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12">
        <Panel
          title="Activity log"
          className="lg:col-span-7"
          action={
            <span className="label-mono text-ink-faint">
              {sessionCount} session{sessionCount === 1 ? '' : 's'}
            </span>
          }
        >
          {isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <EmptyState
              variant="plain"
              compact
              icon={<Gamepad2 className="size-5" />}
              title="Your log is empty — for now"
              description="Launch anything and it’ll be recorded here: what you played, for how long, and what you scored."
              action={<Button size="sm" onClick={() => onNavigate('games')}>Browse games</Button>}
            />
          ) : (
            <RevealGroup role="list" className="relative space-y-1" stagger={0.05}>
              <span aria-hidden="true" className="absolute bottom-3 left-[17px] top-3 w-px bg-line" />
              {activity.map((a) => (
                <RevealItem key={a.key} role="listitem" className="relative flex items-center gap-4 rounded-xl py-2 pr-2">
                  <span
                    className={cn(
                      'relative z-10 grid size-[34px] shrink-0 place-items-center rounded-full border-4 border-surface',
                      a.tone === 'gold' ? 'bg-gold-soft text-gold-strong' : 'bg-brand-soft text-brand-strong',
                    )}
                  >
                    <a.icon className="size-3.5" />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm text-ink-muted">{a.text}</p>
                  <span className="label-mono shrink-0 text-ink-faint">{relTime(a.at)}</span>
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </Panel>

        <Panel
          title="Next medals"
          className="lg:col-span-5"
          action={
            <button type="button" onClick={() => onNavigate('achievements')} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong">
              Cabinet <ArrowUpRight className="size-3.5" />
            </button>
          }
        >
          <div className="mb-5 flex items-center gap-4 rounded-2xl bg-gold-soft/70 p-4">
            <ProgressRing value={allAchievements.length ? (achievementCount / allAchievements.length) * 100 : 0} size={64} stroke={6} tone="gold" label="Medals collected">
              <span className="text-sm font-extrabold text-ink">{achievementCount}</span>
            </ProgressRing>
            <div>
              <p className="font-semibold text-ink">
                {achievementCount} of {allAchievements.length || '—'} medals
              </p>
              <p className="text-sm text-ink-muted">
                {nextUp[0] ? `${Math.max(0, nextUp[0].requiredScore - bestScore).toLocaleString()} points to “${nextUp[0].title}”` : 'Your cabinet is complete.'}
              </p>
            </div>
          </div>
          {nextUp.length === 0 ? (
            <p className="text-center text-sm text-ink-muted">{allAchievements.length ? 'Every medal unlocked. Impressive.' : 'No medals are defined yet.'}</p>
          ) : (
            <ul className="space-y-4">
              {nextUp.map((a) => (
                <li key={a.id}>
                  <Progress
                    value={(bestScore / Math.max(a.requiredScore, 1)) * 100}
                    label={a.title}
                    tone="gold"
                    size="sm"
                    showValue
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* row 3: first steps + recommended + pulse */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12">
        {showChecklist && (
          <Panel title="First steps" className="lg:col-span-4" action={<span className="label-mono text-gold-strong">{checklistDone}/{checklist.length}</span>}>
            <ul className="space-y-1">
              {checklist.map((c) => (
                <li key={c.label}>
                  <button
                    type="button"
                    onClick={c.action}
                    disabled={c.done}
                    className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2 disabled:hover:bg-transparent"
                  >
                    <span
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full border transition-colors',
                        c.done ? 'border-brand bg-brand text-white' : 'border-line-strong text-transparent group-hover:border-brand/50',
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    <span className={cn('flex-1 text-sm', c.done ? 'text-ink-faint line-through decoration-line-strong' : 'font-medium text-ink')}>{c.label}</span>
                    {!c.done && <ArrowRight className="size-3.5 text-ink-faint transition-transform group-hover:translate-x-0.5" />}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel
          title="Try something new"
          className={showChecklist ? 'lg:col-span-5' : 'lg:col-span-8'}
          action={
            <button type="button" onClick={() => onNavigate('games')} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong">
              Library <ArrowUpRight className="size-3.5" />
            </button>
          }
        >
          {catalog.isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : recommended.length === 0 ? (
            <p className="text-sm text-ink-muted">You’ve opened everything in the collection. New exhibits arrive regularly.</p>
          ) : (
            <RevealGroup className={cn('grid gap-3', showChecklist ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')} stagger={0.05}>
              {recommended.slice(0, showChecklist ? 4 : 6).map((item) => (
                <RevealItem key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenExperience(item.id, item.kind)}
                    className="group w-full overflow-hidden rounded-2xl border border-line bg-canvas text-left transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card"
                  >
                    <Cover item={item} className="aspect-[16/10] transition-transform duration-500" />
                    <span className="block p-3">
                      <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
                      <span className="label-mono mt-0.5 block truncate text-ink-faint">{item.kind === 'game' ? 'Game' : 'Lab'} · {item.category ?? 'General'}</span>
                    </span>
                  </button>
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </Panel>

        <section
          aria-label="Community"
          className={cn(
            'grain relative flex flex-col justify-between overflow-hidden rounded-[24px] bg-navy p-6 text-white',
            showChecklist ? 'md:col-span-2 lg:col-span-3' : 'lg:col-span-4',
          )}
        >
          <OrbitLines night className="pointer-events-none absolute -right-16 -top-16 size-64 opacity-80" />
          <h2 className="label-mono relative text-night-sage/80">Community pulse</h2>
          <div className="relative mt-8">
            <Users className="size-5 text-night-gold" />
            <p className="mt-3 font-wide text-5xl font-extrabold tabular-nums">{dauLoading ? '—' : <AnimatedNumber value={dau ?? 0} />}</p>
            <p className="mt-1 text-sm text-white/65">explorers active today</p>
          </div>
          <Button variant="night-outline" size="sm" className="relative mt-6 w-fit" trailingIcon={<ArrowRight className="size-3.5" />} onClick={() => onNavigate('leaderboard')}>
            Leaderboard
          </Button>
        </section>
      </div>
    </div>
  );
}
