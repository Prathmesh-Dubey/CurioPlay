/*
 * THE LABORATORY — concept & interaction narrative
 * A digital specimen archive laid out on a graph-paper bench. The night lab hero opens with live readouts
 * and a signal bench (an oscilloscope you tune by sweeping or with the dial) so the page invites
 * experimentation before anything is clicked. Fields read like a book index with counts; every simulator
 * is a catalogued specimen sheet (EXP-014 · Fig. 14) that lifts to reveal "Run experiment" and morphs into
 * a full specimen sheet — data table, protocol notes, Launch experiment — before the runner takes over.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Plus, Search, X } from 'lucide-react';
import {
  scoreApi,
  sessionApi,
  simulatorApi,
  type GameSession,
  type Simulator,
  type User,
} from '@/api/api';
import { useSimulators } from '@/hooks';
import { useDebounce } from '@/hooks/useDebounce';
import { queryKeys } from '@/lib/queryKeys';
import { MASONRY_GRID, masonry } from '@/lib/masonry';
import { stagger } from '@/lib/motion';
import { cn } from '@/lib/utils';
import ExperienceWorkspace from '@/components/dashboard/ExperienceWorkspace';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useConfirm, useToast } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { RevealGroup, RevealItem } from '@/components/motion/reveal';
import { FieldIndex } from './FieldIndex';
import { LabHero } from './LabHero';
import { Ruler, SpecimenSheet, SpecimenSheetSkeleton, timeOf, type OriginRect } from './SpecimenSheet';
import { useCanHover } from '@/hooks/useMediaQuery';

export interface SimulatorsViewProps {
  user: User;
  searchGlobal: string;
  setSearchGlobal: (v: string) => void;
  onEditSimulator: (id: string) => void;
  onNewSimulator: () => void;
  focusId?: string | null;
  onFocusHandled?: () => void;
}

interface RunningState {
  sim: Simulator;
  code: string | null;
  loading: boolean;
  origin?: OriginRect;
}

const ALL = 'All';
/**
 * Masonry bench. It sits beside the field index from lg, so it is narrower than the page: two columns on phones,
 * three from md, four from xl.
 */
const BENCH_GRID = cn(MASONRY_GRID, 'grid-cols-2 gap-x-3 sm:gap-x-4 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-5');
/** Prefix of the session id used when the server could not open a session. */
const LOCAL_SESSION = 'sim-session-';

export default function SimulatorsView({
  user,
  searchGlobal,
  setSearchGlobal,
  onEditSimulator,
  onNewSimulator,
  focusId,
  onFocusHandled,
}: SimulatorsViewProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const canHover = useCanHover();
  const { data, isLoading, isError, refetch } = useSimulators();
  const isAdmin = user.role === 'ADMIN';

  const [activeCategory, setActiveCategory] = useState(ALL);
  const [running, setRunning] = useState<RunningState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sessionRef = useRef<GameSession | null>(null);
  const tokenRef = useRef(0);

  const debouncedSearch = useDebounce(searchGlobal, 300);

  /* ---------- data ---------- */

  // Players never see inactive simulators; admins see everything.
  const sims = useMemo(() => (data ?? []).filter((s) => isAdmin || s.active !== false), [data, isAdmin]);

  // Stable experiment numbers by registration order.
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    [...sims]
      .sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt))
      .forEach((s, i) => map.set(s.id, i + 1));
    return map;
  }, [sims]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    sims.forEach((s) => {
      const c = s.category?.trim();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return counts;
  }, [sims]);

  const fields = useMemo(
    () => [
      { name: ALL, count: sims.length },
      ...Array.from(categoryCounts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, count]) => ({ name, count })),
    ],
    [categoryCounts, sims.length],
  );

  const latest = useMemo(
    () => sims.reduce<Simulator | undefined>((best, s) => (!best || timeOf(s.createdAt) > timeOf(best.createdAt) ? s : best), undefined),
    [sims],
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return sims
      .filter((s) => {
        const matchesSearch =
          !q || s.title.toLowerCase().includes(q) || (s.description?.toLowerCase().includes(q) ?? false);
        // Compare trimmed values: the counts above are keyed by the trimmed category.
        const matchesCategory = activeCategory === ALL || s.category?.trim() === activeCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt));
  }, [sims, debouncedSearch, activeCategory]);

  // If the selected field disappears (e.g. its last simulator was deleted), fall back to All.
  useEffect(() => {
    if (!isLoading && activeCategory !== ALL && !categoryCounts.has(activeCategory)) setActiveCategory(ALL);
  }, [isLoading, activeCategory, categoryCounts]);

  /* ---------- launch / exit ---------- */

  const launch = useCallback(
    async (sim: Simulator, origin?: OriginRect) => {
      const token = ++tokenRef.current;
      setRunning({ sim, code: null, loading: true, origin });
      try {
        let session: GameSession;
        try {
          session = await sessionApi.start(user.id, sim.id);
        } catch (sessErr) {
          console.warn('Could not create server session, using local fallback:', sessErr);
          session = {
            id: LOCAL_SESSION + Date.now(),
            startTime: new Date().toISOString(),
            endTime: null,
            duration: null,
            userId: user.id,
            gameId: sim.id,
          };
        }
        if (token !== tokenRef.current) {
          if (!session.id.startsWith(LOCAL_SESSION)) sessionApi.end(session.id).catch(() => undefined);
          return;
        }
        sessionRef.current = session;

        let code = sim.simulatorCode || sim.gameCode || null;
        if (!code) {
          try {
            code = await simulatorApi.getCode(sim.id);
          } catch (e) {
            console.error('Failed to fetch simulator code:', e);
          }
        }
        if (token !== tokenRef.current) return;
        setRunning({ sim, code, loading: false, origin });
      } catch (err) {
        console.error('Failed to launch simulator:', err);
        if (token !== tokenRef.current) return;
        setRunning(null);
        toast.error('Could not start the simulator', 'Please try again in a moment.');
      }
    },
    [user.id, toast],
  );

  const exit = useCallback(async () => {
    tokenRef.current++;
    const session = sessionRef.current;
    sessionRef.current = null;
    setRunning(null);
    // A local fallback session never existed on the server, so there is nothing to end.
    if (session && !session.id.startsWith(LOCAL_SESSION)) {
      try {
        await sessionApi.end(session.id);
      } catch (err) {
        console.error('Failed to end session:', err);
      }
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
  }, [queryClient]);

  // End any open session if the view unmounts mid-experiment.
  useEffect(() => {
    return () => {
      tokenRef.current++;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session && !session.id.startsWith(LOCAL_SESSION)) sessionApi.end(session.id).catch(() => undefined);
    };
  }, []);

  const playingId = running?.sim.id;
  const playingTitle = running?.sim.title;

  // Simulators record scores but do not run the achievement check (games do).
  const handleScoreSubmit = useCallback(
    async (score: number) => {
      const simId = playingId;
      if (!simId) return;
      try {
        await scoreApi.submit({ userId: user.id, gameId: simId, scoreValue: score });
        queryClient.invalidateQueries({ queryKey: queryKeys.scores.leaderboard.byGame(simId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.scores.user(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.scores.leaderboard.global });
        toast.success('Score registered', `${score.toLocaleString()} recorded${playingTitle ? ` for ${playingTitle}` : ''}.`);
      } catch (err) {
        console.error('Score submit error:', err);
        toast.error('Could not submit your score', 'Please try again.');
      }
    },
    [playingId, playingTitle, user.id, queryClient, toast],
  );

  /* ---------- admin ---------- */

  const handleEdit = useCallback((s: Simulator) => onEditSimulator(s.id), [onEditSimulator]);

  const handleDelete = useCallback(
    async (s: Simulator) => {
      const ok = await confirm({
        title: `Delete "${s.title}"?`,
        description: 'This permanently removes the simulator and cannot be undone.',
        tone: 'danger',
        confirmLabel: 'Delete simulator',
      });
      if (!ok) return;
      setDeletingId(s.id);
      try {
        await simulatorApi.delete(s.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.simulators.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.simulators.all });
        toast.success('Simulator deleted', s.title);
      } catch (err) {
        console.error(err);
        toast.error('Could not delete the simulator', 'Please try again.');
      } finally {
        setDeletingId((cur) => (cur === s.id ? null : cur));
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

    if (!sims.some((s) => s.id === focusId)) {
      focusCallback.current?.();
      return;
    }

    setActiveCategory(ALL);
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
  }, [focusId, isLoading, sims]);

  /* ---------- render ---------- */

  const hasQuery = searchGlobal.trim().length > 0;
  const busy = !!running;
  const showError = isError && !data;
  const resetFilters = () => {
    setSearchGlobal('');
    setActiveCategory(ALL);
  };

  const benchLabel = activeCategory === ALL ? 'All fields' : activeCategory;

  let bench: ReactNode;
  if (isLoading) {
    bench = (
      <div ref={masonry} className={BENCH_GRID} aria-busy="true" aria-label="Loading experiments">
        {Array.from({ length: 8 }).map((_, i) => (
          <SpecimenSheetSkeleton key={i} index={i} />
        ))}
      </div>
    );
  } else if (showError) {
    bench = (
      <ErrorState
        title="The specimen archive didn't load"
        description="We couldn't reach the lab. Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  } else if (sims.length === 0) {
    bench = (
      <EmptyState
        icon={<FlaskConical className="size-6" />}
        title="The bench is empty"
        description={isAdmin ? 'Log the first simulator to stock the laboratory.' : 'New experiments are being prepared. Check back soon.'}
        action={
          isAdmin ? (
            <Button onClick={onNewSimulator} leadingIcon={<Plus className="size-4" />}>
              New simulator
            </Button>
          ) : undefined
        }
      />
    );
  } else if (filtered.length === 0) {
    bench = (
      <EmptyState
        icon={<Search className="size-6" />}
        title={debouncedSearch.trim() ? `No specimens match "${debouncedSearch.trim()}"` : 'No experiments in this field'}
        description="Try another keyword or return to the full index."
        action={
          <Button variant="outline" onClick={resetFilters}>
            Reset filters
          </Button>
        }
      />
    );
  } else {
    bench = (
      // Re-index (stagger in again) when the field changes. Not keyed by the query: the deep-link flow
      // clears the search after opening a sheet, and a remount would close it.
      <RevealGroup ref={masonry} key={activeCategory} className={BENCH_GRID} stagger={stagger.cards}>
        {filtered.map((s) => (
          <RevealItem key={s.id} className="min-w-0">
            <SpecimenSheet
              sim={s}
              index={indexById.get(s.id) ?? 0}
              canManage={isAdmin}
              canHover={canHover}
              busy={busy}
              deleting={deletingId === s.id}
              onLaunch={launch}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </RevealItem>
        ))}
      </RevealGroup>
    );
  }

  return (
    <>
      <div className="space-y-6 lg:space-y-8">
        <LabHero
          loading={isLoading}
          experiments={sims.length}
          fields={categoryCounts.size}
          latest={latest}
          isAdmin={isAdmin}
          onNewSimulator={onNewSimulator}
          paused={busy}
        />

        <div className="grid gap-5 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-5">
          {/* Console — query the archive */}
          <div className="min-w-0 lg:col-start-2 lg:row-start-1">
            <Input
              type="search"
              aria-label="Search experiments"
              placeholder="query title or protocol notes"
              value={searchGlobal}
              onChange={(e) => setSearchGlobal(e.target.value)}
              className="font-mono text-[14px]"
              leading={
                <span className="flex items-center gap-2">
                  <Search className="size-[18px]" />
                  <span className="label-mono hidden text-brand-strong sm:inline" aria-hidden="true">
                    QRY&gt;
                  </span>
                </span>
              }
              trailing={
                <span className="flex items-center gap-1.5">
                  {!isLoading && sims.length > 0 && (
                    <span className="label-mono hidden rounded-md bg-surface-2 px-2 py-1 tabular-nums text-ink-muted sm:inline" aria-hidden="true">
                      {String(filtered.length).padStart(2, '0')}/{String(sims.length).padStart(2, '0')}
                    </span>
                  )}
                  {hasQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchGlobal('')}
                      aria-label="Clear search"
                      className="-mr-1.5 grid size-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </span>
              }
            />
            <p className="label-mono mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-ink-faint" aria-live="polite">
              {isLoading ? (
                <span>Calibrating instruments…</span>
              ) : (
                <>
                  <span className="text-ink-muted">
                    {filtered.length} of {sims.length} {sims.length === 1 ? 'specimen' : 'specimens'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Field: {benchLabel}</span>
                  {debouncedSearch.trim() && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="max-w-[16rem] truncate normal-case tracking-normal">“{debouncedSearch.trim()}”</span>
                    </>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Field legend */}
          <aside className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <FieldIndex fields={fields} active={activeCategory} onChange={setActiveCategory} loading={isLoading} />
          </aside>

          {/* Bench */}
          <section
            aria-labelledby="bench-title"
            className="min-w-0 rounded-[28px] border border-line bg-canvas bg-graph p-3 sm:p-5 lg:col-start-2 lg:row-start-2"
          >
            <header className="mb-4 flex items-end gap-4 px-1 pt-1">
              <h2 id="bench-title" className="label-mono min-w-0 truncate text-ink sm:max-w-[60%]">
                Bench · {benchLabel}
              </h2>
              <Ruler className="hidden min-w-8 flex-1 sm:block" />
              <span className="label-mono ml-auto shrink-0 text-ink-faint sm:ml-0">
                {isLoading ? '--' : String(filtered.length).padStart(2, '0')} on bench
              </span>
            </header>
            {bench}
          </section>
        </div>
      </div>

      {running &&
        createPortal(
          <ExperienceWorkspace
            kind="simulator"
            title={running.sim.title}
            category={running.sim.category}
            description={running.sim.description}
            thumbnail={running.sim.thumbnail}
            originRect={running.origin}
            crumbs={[{ label: 'Dashboard' }, { label: 'Simulators', onClick: exit }, { label: running.sim.title }]}
            code={running.code}
            loading={running.loading}
            gameId={running.sim.id}
            userId={user.id}
            onScoreSubmit={handleScoreSubmit}
            onExit={exit}
          />,
          document.body,
        )}
    </>
  );
}
