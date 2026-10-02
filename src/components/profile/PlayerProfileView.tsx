/*
 * PLAYER PROFILE — public and your own
 * Opens on the Player Card (see PlayerCard.tsx): identity, presence, global standing and four key figures. Below it,
 * quiet performance data: personal bests as a ranked list beside the score history (trace + ledger), then medals.
 * `own` is your Profile tab: the same view other players get of you, with no back link. It is read-only by design —
 * editing lives in Settings → Profile.
 */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Cake, CalendarDays, FlaskConical, Gamepad2, Globe, MapPin, Medal as MedalIcon, Trophy, UserX } from 'lucide-react';
import type { User } from '@/api/api';
import { useAchievements, useGames, useProfile, useSimulators, useUser, useUserAchievements, useUserScores } from '@/hooks';
import { cn } from '@/lib/utils';
import { Button, ButtonLink, EmptyState, ErrorState, Skeleton, Thumb } from '@/components/ui';
import { contactPath } from '@/lib/contact';
import { Medal } from '@/components/achievements/Medal';
import { ScoreChart, type ChartPoint } from '@/components/analytics/ScoreChart';
import { longDate, shortDate, websiteHref, websiteLabel } from '@/components/analytics/utils';
import { CardChip, PlayerCard, PlayerCardSkeleton, Presence, SectionHeader, formatLongDate, useGlobalStanding, type CardDetail } from '@/components/profile/PlayerCard';

interface PlayerProfileViewProps {
  userId: string;
  currentUser: User;
  /** Back to the leaderboard (public profiles only). */
  onBack?: () => void;
  /** Your own Profile tab: no back link, and your signed-in account backs the card if the directory lags. */
  own?: boolean;
}

interface Experience {
  title: string;
  thumbnail: string | null;
  kind: 'game' | 'simulator';
}

const HISTORY_STEP = 10;

/** Link style for the website on the night card. */
const NIGHT_LINK = 'font-medium text-night-sage underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-night-sage';

export default function PlayerProfileView({ userId, currentUser, onBack, own = false }: PlayerProfileViewProps) {
  const queryClient = useQueryClient();
  const { data: directoryUser, isLoading: loadingUser, error: userError } = useUser(userId);
  const user = directoryUser ?? (own ? currentUser : null);
  const { data: profile } = useProfile(userId);
  const scoresQ = useUserScores(userId);
  const rawScores = useMemo(() => scoresQ.data ?? [], [scoresQ.data]);
  const { data: games = [] } = useGames();
  const { data: sims = [] } = useSimulators();
  const { data: earned = [] } = useUserAchievements(userId);
  const { data: allMedals = [] } = useAchievements();
  const standing = useGlobalStanding(userId);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_STEP);

  const titles = useMemo(() => {
    const m = new Map<string, Experience>();
    games.forEach((x) => m.set(x.id, { title: x.title, thumbnail: x.thumbnail, kind: 'game' }));
    sims.forEach((x) => m.set(x.id, { title: x.title, thumbnail: x.thumbnail, kind: 'simulator' }));
    return m;
  }, [games, sims]);

  /** Best score per experience, highest first. */
  const bests = useMemo(() => {
    const m = new Map<string, { value: number; attempts: number; at: string }>();
    rawScores.forEach((s) => {
      const cur = m.get(s.gameId);
      if (!cur) m.set(s.gameId, { value: s.scoreValue, attempts: 1, at: s.playedAt });
      else
        m.set(s.gameId, {
          value: Math.max(cur.value, s.scoreValue),
          attempts: cur.attempts + 1,
          at: s.scoreValue > cur.value ? s.playedAt : cur.at,
        });
    });
    return [...m.entries()].map(([gameId, v]) => ({ gameId, ...v })).sort((a, b) => b.value - a.value);
  }, [rawScores]);

  const history = useMemo(
    () => [...rawScores].sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()),
    [rawScores],
  );

  const points = useMemo<ChartPoint[]>(
    () =>
      [...history].reverse().map((s) => ({
        id: s.id,
        value: s.scoreValue,
        at: new Date(s.playedAt).getTime(),
        label: titles.get(s.gameId)?.title ?? 'Unknown experience',
      })),
    [history, titles],
  );

  /** Earned medals first (newest), then the nearest locked targets. */
  const medals = useMemo(() => {
    const at = new Map(earned.map((u) => [u.achievementId, u.unlockedAt]));
    return allMedals
      .map((a) => ({ a, unlocked: at.has(a.id), at: at.get(a.id) ?? null }))
      .sort((x, y) => {
        if (x.unlocked !== y.unlocked) return x.unlocked ? -1 : 1;
        if (x.unlocked) return new Date(y.at ?? 0).getTime() - new Date(x.at ?? 0).getTime();
        return x.a.requiredScore - y.a.requiredScore;
      });
  }, [allMedals, earned]);

  const loading = loadingUser || scoresQ.isLoading;

  const backButton =
    !own && onBack ? (
      <Button variant="ghost" size="sm" onClick={onBack} leadingIcon={<ArrowLeft className="size-4" />} className="-ml-2 h-11 self-start sm:h-9">
        Back to leaderboard
      </Button>
    ) : null;

  if (loading) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading player profile">
        {backButton}
        <PlayerCardSkeleton />
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-6">
          <Skeleton className="h-80 rounded-[22px]" />
          <Skeleton className="h-80 rounded-[22px]" />
        </div>
      </div>
    );
  }

  if (userError && !user) {
    return (
      <div className="flex flex-col gap-6">
        {backButton}
        <ErrorState
          title="This card couldn’t be loaded"
          description={(userError as Error).message || 'We couldn’t reach the explorer directory. Check your connection and try again.'}
          onRetry={() => queryClient.refetchQueries({ queryKey: ['users', 'all'] })}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        {backButton}
        <EmptyState
          icon={<UserX className="size-6" />}
          title="Player not found"
          description="This player may have left, or the link is out of date."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {onBack && (
                <Button variant="secondary" onClick={onBack}>
                  Return to leaderboard
                </Button>
              )}
              <ButtonLink to={contactPath('profile')} variant="outline">
                Report a problem
              </ButtonLink>
            </div>
          }
        />
      </div>
    );
  }

  // Online heuristic: identical to the original implementation.
  const getLatestActivityTimestamp = (id: string) => {
    let latest = 0;
    try {
      const lastActiveStr = localStorage.getItem(`lastActive_${id}`);
      if (lastActiveStr) {
        latest = parseInt(lastActiveStr, 10);
      }
    } catch {
      // ignore
    }

    if (profile?.updatedAt) {
      const profileUpdated = new Date(profile.updatedAt).getTime();
      if (profileUpdated > latest) latest = profileUpdated;
    }

    if (rawScores && rawScores.length > 0) {
      rawScores.forEach((score) => {
        const scoreTime = new Date(score.playedAt).getTime();
        if (scoreTime > latest) latest = scoreTime;
      });
    }

    if (user?.createdAt) {
      const userCreated = new Date(user.createdAt).getTime();
      if (userCreated > latest) latest = userCreated;
    }

    return latest;
  };

  const checkOnlineStatus = (id: string) => {
    const lastActive = getLatestActivityTimestamp(id);
    if (lastActive > 0) {
      const fiveMinutes = 5 * 60 * 1000;
      return Date.now() - lastActive < fiveMinutes;
    }
    return false;
  };

  const getLastActiveText = (id: string) => {
    const lastActive = getLatestActivityTimestamp(id);
    if (lastActive > 0) {
      const diff = Date.now() - lastActive;
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 60) return `Last seen ${minutes}m ago`;
      if (hours < 24) return `Last seen ${hours}h ago`;
      if (days === 1) return `Last seen 1 day ago`;
      return `Last seen ${days} days ago`;
    }
    return 'Offline';
  };

  const isMe = own || user.id === currentUser.id;
  // You're here, so you're online; for everyone else the original heuristic decides.
  const online = own || checkOnlineStatus(user.id);
  const website = profile?.website;
  const born = formatLongDate(profile?.dateOfBirth);
  const joined = formatLongDate(user.createdAt);
  const topBest = bests[0]?.value ?? 0;
  const lastScore = history[0];
  const shownHistory = history.slice(0, historyLimit);

  const details: CardDetail[] = [];
  if (profile?.location) details.push({ icon: <MapPin />, content: profile.location });
  if (website)
    details.push({
      icon: <Globe />,
      content: (
        <a href={websiteHref(website)} target="_blank" rel="noopener noreferrer" className={NIGHT_LINK}>
          {websiteLabel(website)}
        </a>
      ),
    });
  if (born) details.push({ icon: <Cake />, content: `Born ${born}` });
  if (joined) details.push({ icon: <CalendarDays />, content: `Joined ${joined}` });

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      {backButton}

      <PlayerCard
        className={backButton ? '-mt-2' : undefined}
        headingId="player-name"
        name={user.username}
        role={user.role}
        accent={profile?.accentColor || user.accentColor}
        avatarUrl={user.avatarUrl || profile?.avatarUrl}
        avatarSeed={user.avatarSeed || profile?.avatarSeed}
        online={online}
        chips={
          <>
            {isMe && !own && <CardChip tone="accent">You</CardChip>}
            <Presence online={online} text={getLastActiveText(user.id)} />
          </>
        }
        bio={profile?.bio ? <p>{profile.bio}</p> : undefined}
        details={details}
        standing={standing}
        unrankedSubject={isMe ? 'you' : 'them'}
        figures={[
          { label: 'Best score', value: topBest },
          { label: rawScores.length === 1 ? 'Score submitted' : 'Scores submitted', value: rawScores.length },
          { label: bests.length === 1 ? 'Experience played' : 'Experiences played', value: bests.length },
          { label: 'Medals earned', value: earned.length, of: allMedals.length || undefined },
        ]}
      />

      {/* ---------- Performance ---------- */}
      {scoresQ.isError ? (
        <ErrorState
          title="Scores didn’t load"
          description="We couldn’t fetch this player’s scores. Check your connection and try again."
          onRetry={() => scoresQ.refetch()}
        />
      ) : bests.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-6" />}
          title="No scores yet"
          description={
            isMe
              ? 'Play something to put your first score on the board.'
              : 'This player hasn’t submitted any scores yet. Check back after their next session.'
          }
          action={
            onBack && !own ? (
              <Button variant="outline" size="sm" onClick={onBack}>
                Back to leaderboard
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-6">
          {/* Personal bests — a ranking, so it's numbered. */}
          <section aria-labelledby="best-title" className="min-w-0">
            <SectionHeader id="best-title" title="Personal bests" note="Best score in each experience" />
            <ol className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
              {bests.map((b, i) => {
                const info = titles.get(b.gameId);
                const first = i === 0;
                return (
                  <li key={b.gameId} className={cn('flex items-center gap-4 px-4 py-3.5 sm:px-5', first && 'bg-surface-2/60')}>
                    <span className={cn('w-5 shrink-0 text-right font-semiwide text-sm font-bold tabular-nums', first ? 'text-brand-strong' : 'text-ink-faint')}>
                      {i + 1}
                    </span>
                    <span className="size-12 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
                      <Thumb
                        src={info?.thumbnail}
                        className="size-full object-cover"
                        fallback={
                          <span className="grid size-full place-items-center text-ink-faint">
                            {info?.kind === 'simulator' ? <FlaskConical className="size-5" aria-hidden="true" /> : <Gamepad2 className="size-5" aria-hidden="true" />}
                          </span>
                        }
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-semibold text-ink">{info?.title ?? 'Unknown experience'}</h3>
                      <p className="mt-0.5 text-[13px] text-ink-faint">
                        {info?.kind === 'simulator' ? 'Simulator' : 'Game'}, {b.attempts} {b.attempts === 1 ? 'run' : 'runs'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semiwide text-xl font-extrabold leading-none tabular-nums text-ink">{b.value.toLocaleString()}</p>
                      <p className="mt-1.5 text-xs text-ink-faint">{shortDate(b.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Score history — trace + ledger in one panel. */}
          <section aria-labelledby="history-title" className="min-w-0">
            <SectionHeader
              id="history-title"
              title="Score history"
              note={lastScore ? `Last played ${titles.get(lastScore.gameId)?.title ?? 'an experience'}, ${shortDate(lastScore.playedAt)}` : undefined}
            />
            <div className="rounded-[22px] border border-line bg-surface p-5 sm:p-6">
              {points.length > 1 ? (
                <ScoreChart points={points} subject={`${user.username}’s scores`} height={220} />
              ) : (
                <p className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-sm text-ink-muted">
                  The trace appears after a second score.
                </p>
              )}
              <ol className="mt-5 divide-y divide-line border-t border-line">
                {shownHistory.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{titles.get(s.gameId)?.title ?? 'Unknown experience'}</p>
                      <time dateTime={s.playedAt} className="text-xs text-ink-faint">
                        {longDate(s.playedAt)}
                      </time>
                    </div>
                    <span className="shrink-0 font-semiwide text-base font-bold tabular-nums text-ink">{s.scoreValue.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
              {history.length > historyLimit && (
                <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setHistoryLimit((l) => l + HISTORY_STEP)}>
                  Show {Math.min(HISTORY_STEP, history.length - historyLimit)} more
                </Button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ---------- Medals ---------- */}
      {medals.length > 0 && (
        <section aria-labelledby="medals-title">
          <SectionHeader id="medals-title" title="Medals" note={`${earned.length} of ${medals.length} earned`} />
          <div className="rounded-[22px] border border-line bg-surface p-4 sm:p-5">
            <ul
              aria-label="Medals"
              className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] sm:gap-4 sm:overflow-visible sm:px-0"
            >
              {medals.map(({ a, unlocked, at }) => (
                <li key={a.id} className="w-[6.5rem] shrink-0 snap-start text-center sm:w-auto">
                  <Medal unlocked={unlocked} className="mx-auto size-16" />
                  <p className={cn('mt-2 line-clamp-2 text-xs font-semibold leading-snug', unlocked ? 'text-ink' : 'text-ink-muted')}>{a.title}</p>
                  <p className={cn('mt-0.5 text-[11px]', unlocked ? 'text-gold-strong' : 'text-ink-faint')}>
                    {unlocked ? (at ? longDate(at) : 'Earned') : `${a.requiredScore.toLocaleString()} points`}
                  </p>
                  <span className="sr-only">{unlocked ? 'Earned' : 'Locked'}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      {medals.length === 0 && own && (
        <EmptyState compact icon={<MedalIcon className="size-5" />} title="No medals catalogued yet" description="Medals appear here once they’re added to the cabinet." />
      )}
    </div>
  );
}
