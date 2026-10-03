/*
 * THE ARCADE WING — the game library, the liveliest room in the field guide.
 * Concept: cover art leads and every cabinet is catalogued (№ plates by order of arrival). The header counts the
 * floor live; a filter strip slides its indicator; the marquee hangs the three newest exhibits in deliberately
 * unequal frames (one poster + two tickets); the permanent collection follows as a masonry wall of pins, each cover
 * at its own proportions (lib/masonry). Cards tilt and catch a spotlight under the cursor, a cover morphs into
 * its detail sheet, and Play expands a night Stage from the card itself (see ExperienceWorkspace).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Gamepad2, Plus, Search, X } from 'lucide-react';
import {
  gameApi,
  scoreApi,
  sessionApi,
  userAchievementApi,
  type Game,
  type GameSession,
  type User,
  type UserAchievement,
} from '@/api/api';
import { evictExperienceCode, getExperienceCode } from '@/lib/cache/catalog';
import { useGames } from '@/hooks';
import { useDebounce } from '@/hooks/useDebounce';
import { queryKeys } from '@/lib/queryKeys';
import { MASONRY_GRID, masonry } from '@/lib/masonry';
import { stagger } from '@/lib/motion';
import { cn } from '@/lib/utils';
import ExperienceWorkspace from '@/components/dashboard/ExperienceWorkspace';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useConfirm, useToast } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { Tabs, type TabItem } from '@/components/ui/Nav';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { RevealGroup, RevealItem } from '@/components/motion/reveal';
import { AchievementUnlock } from './AchievementUnlock';
import { GameExhibit, type ExhibitVariant, type LaunchRequest } from './GameExhibit';
import { timeOf, type LaunchRect } from './format';

export interface GamesViewProps {
  user: User;
  searchGlobal: string;
  setSearchGlobal: (v: string) => void;
  onEditGame: (id: string) => void;
  onNewGame: () => void;
  focusId?: string | null;
  onFocusHandled?: () => void;
}

type SortMode = 'newest' | 'az' | 'category';

/** Sentinel for the "All" filter so a real category called "All" can never collide with it. */
const ALL = '__all__';
const BUILT_IN_IDS = ['game-snake', 'game-clicker', 'game-pong'];
const COUNT_SPRING = { stiffness: 120, damping: 24 };

const SORT_OPTIONS: SelectOption<SortMode>[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'A–Z' },
  { value: 'category', label: 'Category' },
];

const MARQUEE_GRID =
  'grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:grid-rows-2';
/** Masonry wall: two pins on a phone, up to five on wide screens (columns stay ~200–300px wide). */
const COLLECTION_GRID = cn(MASONRY_GRID, 'grid-cols-2 gap-x-3 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7');
/** Skeleton pins borrow a few real cover shapes so loading already reads as a wall. */
const SKELETON_RATIOS = ['aspect-[4/3]', 'aspect-square', 'aspect-[16/9]', 'aspect-[3/2]', 'aspect-[4/5]', 'aspect-[16/10]'];

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function FloorCount({ value, label, live }: { value: number; label: string; live?: boolean }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <AnimatedNumber
        value={value}
        springOptions={COUNT_SPRING}
        className={cn('font-wide text-[2rem] font-extrabold leading-none sm:text-[2.5rem]', live ? 'text-brand-strong' : 'text-ink')}
      />
      <span className="label-mono text-ink-faint">{label}</span>
    </div>
  );
}

function HallHeading({ id, kicker, title, meta }: { id: string; kicker: string; title: ReactNode; meta?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-3 sm:mb-6">
      <div className="min-w-0">
        <p className="label-mono text-ink-faint">{kicker}</p>
        <h2 id={id} className="mt-1.5 truncate font-semiwide text-xl font-extrabold text-ink sm:text-2xl">
          {title}
        </h2>
      </div>
      {meta && <p className="label-mono shrink-0 pb-1 text-ink-faint">{meta}</p>}
    </div>
  );
}

function ExhibitGrid({ items, render }: { items: Game[]; render: (g: Game, variant: ExhibitVariant) => ReactNode }) {
  return (
    <RevealGroup ref={masonry} stagger={stagger.cards} className={COLLECTION_GRID}>
      {items.map((g) => (
        <RevealItem key={g.id} className="min-w-0">
          {render(g, 'card')}
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

/* ---------- skeletons (mirror the real layout) ---------- */

function HeadingSkeleton() {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-3 sm:mb-6">
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-32 rounded-md" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-3 w-16 rounded-md" />
    </div>
  );
}

function CardSkeleton({ index }: { index: number }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
      <Skeleton className={cn(SKELETON_RATIOS[index % SKELETON_RATIOS.length], 'rounded-none')} />
      <div className="space-y-2.5 px-3.5 pb-4 pt-3.5 sm:px-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-full rounded-md" />
        {index % 2 === 0 && <Skeleton className="h-3.5 w-2/3 rounded-md" />}
      </div>
      <div className="flex h-12 items-center border-t border-line px-3.5 sm:px-4">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="flex min-h-[10.5rem] overflow-hidden rounded-[20px] border border-line bg-surface">
      <Skeleton className="w-[40%] shrink-0 rounded-none" />
      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3.5 w-full rounded-md" />
        <Skeleton className="mt-auto h-3 w-20 rounded-md" />
      </div>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="space-y-12 lg:space-y-16" role="status" aria-live="polite">
      <span className="sr-only">Loading games…</span>
      <section aria-hidden="true">
        <HeadingSkeleton />
        <div className={MARQUEE_GRID}>
          <Skeleton className="min-h-[26rem] rounded-[28px] sm:col-span-2 sm:min-h-[24rem] xl:col-span-1 xl:row-span-2 xl:min-h-[31rem]" />
          <TicketSkeleton />
          <TicketSkeleton />
        </div>
      </section>
      <section aria-hidden="true">
        <HeadingSkeleton />
        <div ref={masonry} className={COLLECTION_GRID}>
          {Array.from({ length: 10 }).map((_, i) => (
            <CardSkeleton key={i} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className="flex gap-1.5 overflow-hidden" aria-hidden="true">
      {[56, 92, 76, 104, 84].map((w, i) => (
        <Skeleton key={i} className="h-11 shrink-0 rounded-full sm:h-10" style={{ width: w }} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

interface RunningState {
  game: Game;
  code: string | null;
  loading: boolean;
  origin: LaunchRect | null;
}

export default function GamesView({
  user,
  searchGlobal,
  setSearchGlobal,
  onEditGame,
  onNewGame,
  focusId,
  onFocusHandled,
}: GamesViewProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, isLoading, isError, refetch } = useGames();
  const isAdmin = user.role === 'ADMIN';

  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [sort, setSort] = useState<SortMode>('newest');
  const [running, setRunning] = useState<RunningState | null>(null);
  const [unlocked, setUnlocked] = useState<UserAchievement[]>([]);

  const sessionRef = useRef<GameSession | null>(null);
  const tokenRef = useRef(0);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const debouncedSearch = useDebounce(searchGlobal, 300);
  const query = debouncedSearch.trim().toLowerCase();

  /* ---------- data ---------- */

  const games = useMemo(() => (data ?? []).filter((g) => g.type !== 'simulator' && g.active !== false), [data]);

  /** Stable catalogue numbers: № 01 is the oldest cabinet on the floor. */
  const plates = useMemo(() => {
    const ordered = [...games].sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt) || a.title.localeCompare(b.title));
    return new Map(ordered.map((g, i) => [g.id, String(i + 1).padStart(2, '0')]));
  }, [games]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    games.forEach((g) => {
      const c = g.category?.trim();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return counts;
  }, [games]);

  const tabItems = useMemo<TabItem<string>[]>(
    () => [
      { value: ALL, label: 'All', count: games.length },
      ...[...categoryCounts.keys()]
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ value: c, label: c, count: categoryCounts.get(c) })),
    ],
    [games.length, categoryCounts],
  );

  const filtered = useMemo(() => {
    const list = games.filter((g) => {
      const matchesSearch =
        !query ||
        g.title.toLowerCase().includes(query) ||
        (g.description?.toLowerCase().includes(query) ?? false) ||
        (g.category?.toLowerCase().includes(query) ?? false);
      const matchesCategory = activeCategory === ALL || g.category?.trim() === activeCategory;
      return matchesSearch && matchesCategory;
    });
    return list.sort((a, b) => {
      if (sort === 'az') return a.title.localeCompare(b.title);
      if (sort === 'category') {
        const ca = a.category?.trim() || '￿';
        const cb = b.category?.trim() || '￿';
        return ca.localeCompare(cb) || a.title.localeCompare(b.title);
      }
      return timeOf(b.createdAt) - timeOf(a.createdAt) || a.title.localeCompare(b.title);
    });
  }, [games, query, activeCategory, sort]);

  const discovery = sort === 'newest' && activeCategory === ALL && !query;

  const { marquee, collection } = useMemo(() => {
    const m = discovery && filtered.length >= 3 ? filtered.slice(0, 3) : [];
    return { marquee: m, collection: m.length ? filtered.slice(m.length) : filtered };
  }, [discovery, filtered]);

  const grouped = useMemo(() => {
    if (sort !== 'category' || activeCategory !== ALL) return null;
    const groups = new Map<string, Game[]>();
    collection.forEach((g) => {
      const key = g.category?.trim() || 'Uncategorised';
      groups.set(key, [...(groups.get(key) ?? []), g]);
    });
    return [...groups.entries()];
  }, [sort, activeCategory, collection]);

  // A category can disappear (deleted/renamed game) — fall back to All instead of an empty filter.
  useEffect(() => {
    if (!isLoading && activeCategory !== ALL && !categoryCounts.has(activeCategory)) setActiveCategory(ALL);
  }, [isLoading, activeCategory, categoryCounts]);

  /* ---------- launch / exit ---------- */

  const endSessionQuietly = useCallback((session: GameSession | null) => {
    if (!session) return;
    sessionApi.end(session.id).catch((err: unknown) => console.error('Failed to end session:', err));
  }, []);

  const launch = useCallback(
    async (game: Game, request?: LaunchRequest) => {
      const token = ++tokenRef.current;
      const origin = request?.origin ?? null;
      returnFocusRef.current = request?.returnFocus ?? null;
      setUnlocked([]);
      setRunning({ game, code: null, loading: true, origin });
      let session: GameSession | null = null;
      try {
        session = await sessionApi.start(user.id, game.id);
        if (token !== tokenRef.current) {
          endSessionQuietly(session);
          return;
        }
        sessionRef.current = session;

        let code = game.gameCode || null;
        if (game.isDynamic && !code) {
          code = await getExperienceCode('game', game.id, game.updatedAt);
        }
        if (token !== tokenRef.current) return;
        setRunning({ game, code, loading: false, origin });
      } catch (err) {
        console.error('Failed to start game:', err);
        if (token !== tokenRef.current) return;
        sessionRef.current = null;
        endSessionQuietly(session);
        setRunning(null);
        toast.error('Could not start the game', 'Please try again in a moment.');
      }
    },
    [user.id, endSessionQuietly, toast],
  );

  const exit = useCallback(async () => {
    tokenRef.current++;
    const session = sessionRef.current;
    sessionRef.current = null;
    setRunning(null);
    if (session) {
      try {
        await sessionApi.end(session.id);
      } catch (err) {
        console.error('Failed to end session:', err);
      }
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
  }, [queryClient]);

  // End a live session if the view unmounts mid-play.
  useEffect(() => {
    return () => {
      tokenRef.current++;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) sessionApi.end(session.id).catch(() => undefined);
    };
  }, []);

  // When the Stage closes, put focus back on the exhibit that launched it.
  useEffect(() => {
    if (running) return;
    const el = returnFocusRef.current;
    returnFocusRef.current = null;
    if (el) requestAnimationFrame(() => el.isConnected && el.focus({ preventScroll: true }));
  }, [running]);

  const playingId = running?.game.id;
  const playingTitle = running?.game.title;

  const handleScoreSubmit = useCallback(
    async (score: number) => {
      const gameId = playingId;
      if (!gameId) return;
      try {
        await scoreApi.submit({ userId: user.id, gameId, scoreValue: score });

        queryClient.invalidateQueries({ queryKey: queryKeys.scores.leaderboard.byGame(gameId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.scores.user(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.scores.leaderboard.global });

        const achievements = await userAchievementApi.checkAndUnlock(user.id, score);
        if (achievements && achievements.length > 0) {
          queryClient.invalidateQueries({ queryKey: queryKeys.achievements.user.detail(user.id) });
          setUnlocked(achievements);
        } else {
          toast.success('Score registered', `${score.toLocaleString()} points${playingTitle ? ` in ${playingTitle}` : ''}.`);
        }
      } catch (err) {
        console.error('Score submit error:', err);
        toast.error('Could not submit your score', 'Please try again.');
      }
    },
    [playingId, playingTitle, user.id, queryClient, toast],
  );

  const closeUnlocked = useCallback(() => setUnlocked([]), []);

  /* ---------- admin ---------- */

  const handleEdit = useCallback((g: Game) => onEditGame(g.id), [onEditGame]);

  const handleDelete = useCallback(
    async (g: Game) => {
      const ok = await confirm({
        title: `Delete "${g.title}"?`,
        description: 'This permanently removes the game and cannot be undone.',
        tone: 'danger',
        confirmLabel: 'Delete game',
      });
      if (!ok) return;
      try {
        await gameApi.delete(g.id);
        evictExperienceCode('game', g.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.games.lists() });
        toast.success('Game deleted', g.title);
      } catch (err) {
        console.error(err);
        toast.error('Could not delete the game', 'Please try again.');
      }
    },
    [confirm, queryClient, toast],
  );

  /* ---------- deep-link focus ---------- */

  const handledFocus = useRef<string | null>(null);
  const focusCallback = useRef(onFocusHandled);
  focusCallback.current = onFocusHandled;
  const searchRef = useRef({ value: searchGlobal, set: setSearchGlobal });
  searchRef.current = { value: searchGlobal, set: setSearchGlobal };

  useEffect(() => {
    if (!focusId) {
      handledFocus.current = null;
      return;
    }
    if (isLoading || handledFocus.current === focusId) return;
    handledFocus.current = focusId;

    if (!games.some((g) => g.id === focusId)) {
      focusCallback.current?.();
      return;
    }

    setActiveCategory(ALL);
    setSort('newest');
    if (searchRef.current.value) searchRef.current.set('');

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts++;
      const el = document.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(focusId)}"]`);
      const trigger = el?.closest('button');
      if (trigger) {
        trigger.click();
        window.clearInterval(timer);
        focusCallback.current?.();
      } else if (attempts > 25) {
        window.clearInterval(timer);
        focusCallback.current?.();
      }
    }, 120);
    return () => window.clearInterval(timer);
  }, [focusId, isLoading, games]);

  /* ---------- render ---------- */

  const resetFilters = () => {
    setSearchGlobal('');
    setActiveCategory(ALL);
  };

  const hasQuery = searchGlobal.trim().length > 0;
  const isFiltering = !!query || activeCategory !== ALL;
  const busy = !!running;
  const loaded = !isLoading && !(isError && !data);
  const showControls = isLoading || games.length > 0;

  const renderExhibit = (g: Game, variant: ExhibitVariant) => (
    <GameExhibit
      key={g.id}
      game={g}
      plate={plates.get(g.id) ?? '00'}
      variant={variant}
      canManage={isAdmin && !BUILT_IN_IDS.includes(g.id)}
      busy={busy}
      onLaunch={launch}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  const collectionHeading = discovery
    ? { kicker: 'Hall B · Permanent collection', title: 'Every cabinet' }
    : query
      ? { kicker: activeCategory === ALL ? 'Search' : `Search · ${activeCategory}`, title: `Results for “${debouncedSearch.trim()}”` }
      : activeCategory !== ALL
        ? { kicker: 'Category', title: activeCategory }
        : { kicker: sort === 'az' ? 'Index · A to Z' : 'Index', title: 'Every cabinet' };

  const countLabel = (n: number) => `${String(n).padStart(2, '0')} ${n === 1 ? 'game' : 'games'}`;

  let content: ReactNode;
  if (isLoading) {
    content = <LibrarySkeleton />;
  } else if (isError && !data) {
    content = (
      <ErrorState
        title="The arcade is unreachable"
        description="We couldn’t load the game library. Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  } else if (games.length === 0) {
    content = (
      <EmptyState
        icon={<Gamepad2 className="size-6" />}
        title="The floor is empty — for now"
        description={isAdmin ? 'Add the first cabinet to open the Arcade Wing.' : 'New games are being installed. Check back soon.'}
        action={
          isAdmin ? (
            <Button onClick={onNewGame} leadingIcon={<Plus className="size-4" />}>
              New game
            </Button>
          ) : undefined
        }
      />
    );
  } else if (filtered.length === 0) {
    content = (
      <EmptyState
        icon={<Search className="size-6" />}
        title={hasQuery ? `No games match “${searchGlobal.trim()}”` : 'Nothing in this category yet'}
        description="Try another keyword or category, or go back to the full collection."
        action={
          <Button variant="outline" onClick={resetFilters}>
            Reset filters
          </Button>
        }
      />
    );
  } else {
    content = (
      <div className="space-y-12 lg:space-y-16">
        {marquee.length === 3 && (
          <section aria-labelledby="arcade-marquee">
            <HallHeading id="arcade-marquee" kicker="Hall A · New arrivals" title="On the marquee" meta="03 exhibits" />
            <RevealGroup stagger={stagger.cards} className={MARQUEE_GRID}>
              <RevealItem className="min-w-0 sm:col-span-2 xl:col-span-1 xl:row-span-2">{renderExhibit(marquee[0], 'spotlight')}</RevealItem>
              <RevealItem className="min-w-0">{renderExhibit(marquee[1], 'ticket')}</RevealItem>
              <RevealItem className="min-w-0">{renderExhibit(marquee[2], 'ticket')}</RevealItem>
            </RevealGroup>
          </section>
        )}

        {grouped
          ? grouped.map(([cat, items], i) => (
              <section key={cat} aria-labelledby={`arcade-section-${i}`}>
                <HallHeading
                  id={`arcade-section-${i}`}
                  kicker={`Section ${String.fromCharCode(65 + (i % 26))}`}
                  title={cat}
                  meta={countLabel(items.length)}
                />
                <ExhibitGrid items={items} render={renderExhibit} />
              </section>
            ))
          : collection.length > 0 && (
              <section aria-labelledby="arcade-collection">
                <HallHeading
                  id="arcade-collection"
                  kicker={collectionHeading.kicker}
                  title={collectionHeading.title}
                  meta={countLabel(collection.length)}
                />
                <ExhibitGrid items={collection} render={renderExhibit} />
              </section>
            )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 lg:space-y-10">
        <PageHeader
          eyebrow="Game library"
          index="02"
          title="The Arcade Wing"
          description="Every cabinet on this floor is playable right here. Launch one and your best runs are entered on the leaderboard."
          actions={
            isAdmin && (
              <Button onClick={onNewGame} leadingIcon={<Plus className="size-4" />}>
                New game
              </Button>
            )
          }
        >
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-line pt-5">
            <FloorCount value={isLoading ? 0 : games.length} label={games.length === 1 ? 'game on the floor' : 'games on the floor'} />
            <FloorCount value={isLoading ? 0 : categoryCounts.size} label={categoryCounts.size === 1 ? 'category' : 'categories'} />
            {loaded && isFiltering && <FloorCount value={filtered.length} label="matching" live />}
          </div>
        </PageHeader>

        {showControls && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="min-w-0 flex-1 sm:max-w-md">
                <Input
                  type="search"
                  aria-label="Search games"
                  placeholder="Search games"
                  value={searchGlobal}
                  onChange={(e) => setSearchGlobal(e.target.value)}
                  leading={<Search className="size-[18px]" />}
                  trailing={
                    hasQuery ? (
                      <IconButton
                        label="Clear search"
                        icon={<X className="size-4" />}
                        size="icon-sm"
                        className="size-9 text-ink-faint"
                        onClick={() => setSearchGlobal('')}
                      />
                    ) : undefined
                  }
                />
              </div>
              <Select<SortMode>
                value={sort}
                onChange={setSort}
                options={SORT_OPTIONS}
                ariaLabel="Sort games"
                size="lg"
                leading={<ArrowUpDown className="size-4" />}
                className="w-[9.5rem] shrink-0 sm:ml-auto sm:w-44"
              />
            </div>

            {isLoading ? (
              <TabsSkeleton />
            ) : (
              categoryCounts.size > 0 && (
                <Tabs
                  items={tabItems}
                  value={activeCategory}
                  onChange={setActiveCategory}
                  label="Filter by category"
                  className="-mx-4 w-[calc(100%+2rem)] max-w-none px-4 sm:mx-0 sm:w-auto sm:max-w-full sm:px-0 [&_[role=tab]]:h-11 sm:[&_[role=tab]]:h-10"
                />
              )
            )}

            <p className="sr-only" role="status" aria-live="polite">
              {loaded && games.length > 0 ? `${filtered.length} of ${games.length} games shown` : ''}
            </p>
          </div>
        )}

        {content}
      </div>

      {running && (
        <ExperienceWorkspace
          kind="game"
          title={running.game.title}
          category={running.game.category}
          description={running.game.description}
          thumbnail={running.game.thumbnail}
          originRect={running.origin}
          code={running.code}
          loading={running.loading}
          gameId={running.game.id}
          userId={user.id}
          onScoreSubmit={handleScoreSubmit}
          onExit={exit}
        />
      )}

      <AnimatePresence>
        {unlocked.length > 0 && <AchievementUnlock key="achievement" items={unlocked} onClose={closeUnlocked} />}
      </AnimatePresence>
    </>
  );
}
