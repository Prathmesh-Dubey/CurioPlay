import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@/api/api';
import { gameApi, scoreApi, simulatorApi } from '@/api/api';
import { queryKeys } from '@/lib/queryKeys';
import { NotificationProvider } from '@/context/NotificationContext';
import { FeedbackProvider } from '@/components/ui/Feedback';
import { Skeleton } from '@/components/ui/Skeleton';
import { TransitionPanel } from '@/components/motion/transition-panel';
import { NavBar } from '@/components/dashboard/NavBar';
import { MobileDock } from '@/components/dashboard/MobileDock';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { NAV_ITEMS, normalizeTab, type TabId } from '@/components/dashboard/nav';
import { useTheme } from '@/hooks/useTheme';
import { pageTransition } from '@/lib/motion';
import { applyPalette, DEFAULT_PALETTE, luminance, useLocalPalette } from '@/lib/palette';

// Every view is code-split so the dashboard shell paints immediately.
const OverviewView = lazy(() => import('@/components/dashboard/OverviewView'));
const GamesView = lazy(() => import('@/components/games/GamesView'));
const SimulatorsView = lazy(() => import('@/components/simulators/SimulatorsView'));
const LeaderboardView = lazy(() => import('@/components/leaderboard/LeaderboardView'));
const PlayerProfileView = lazy(() => import('@/components/profile/PlayerProfileView'));
const AchievementsView = lazy(() => import('@/components/dashboard/AchievementsView'));
const AnalyticsView = lazy(() => import('@/components/dashboard/AnalyticsView'));
const SettingsView = lazy(() => import('@/components/dashboard/SettingsView'));
const CreatorView = lazy(() => import('@/components/creator/CreatorView'));
const AdminNotificationsView = lazy(() => import('@/components/dashboard/AdminNotificationsView'));

const STORAGE_KEY = 'curioplay_user';
const ACCENT_VARS = ['--cp-brand', '--cp-brand-strong', '--cp-brand-soft'] as const;

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as User) : null;
    return parsed && parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

function ViewFallback() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-11 w-80 max-w-full" />
      <Skeleton className="h-4 w-[28rem] max-w-full" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}

const TAB_ORDER: TabId[] = [...NAV_ITEMS.map((n) => n.id), 'playerProfile'];

/*
 * The Observatory shell. Navigation state lives in the URL (?tab=…&focus=…&player=…&mode=…&edit=…)
 * so browser/Android back & forward move between pages, refresh keeps your place and
 * deep links from the landing page open the right exhibit.
 */
export default function DashboardApp() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const [params, setParams] = useSearchParams();

  const [user, setUser] = useState<User | null>(readStoredUser);
  const [search, setSearch] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);

  const isAdmin = user?.role === 'ADMIN';
  const playerId = params.get('player');
  const tab: TabId = normalizeTab(params.get('tab') ?? localStorage.getItem('activeTab'), !!playerId);
  const focusId = params.get('focus');
  const creator = useMemo(
    () => ({ mode: (params.get('mode') === 'simulator' ? 'simulator' : 'game') as 'game' | 'simulator', editId: params.get('edit') }),
    [params],
  );

  /** Navigate inside the dashboard. Pushes history so back/forward work. */
  const setTab = useCallback(
    (next: TabId, extra: Record<string, string> = {}, replace = false) => {
      const p = new URLSearchParams({ tab: next, ...extra });
      setParams(p, { replace });
    },
    [setParams],
  );

  // Persist the tab and reset scroll on page change.
  useEffect(() => {
    if (tab !== 'playerProfile' && tab !== 'creator') localStorage.setItem('activeTab', tab);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  // Non-admins can never land on admin tabs (stale saved tab or hand-edited URL).
  useEffect(() => {
    if (user && !isAdmin && (tab === 'creator' || tab === 'admin_notifications')) setTab('overview', {}, true);
  }, [user, isAdmin, tab, setTab]);

  // Personal palette: background / text / secondary / accent live in this browser (per user)…
  const { palette } = useLocalPalette(user?.id);
  useEffect(() => applyPalette(palette, isDark), [palette, isDark]);
  // A custom background decides whether surfaces are dark, whatever the theme toggle says.
  const darkSurface = palette.background ? luminance(palette.background) < 0.18 : isDark;

  // …and primary is the profile's accent colour (saved to the backend), overriding the brand tokens everywhere.
  const accent = user?.accentColor || '';
  useEffect(() => {
    const root = document.documentElement;
    // With a custom background, re-derive the default blue's readable shades for that surface too.
    const primary = accent || (palette.background ? DEFAULT_PALETTE.dark.primary : '');
    if (!primary) {
      ACCENT_VARS.forEach((v) => root.style.removeProperty(v));
      return;
    }
    root.style.setProperty('--cp-brand', primary);
    root.style.setProperty(
      '--cp-brand-strong',
      darkSurface ? `color-mix(in srgb, ${primary} 70%, white)` : `color-mix(in srgb, ${primary} 78%, black)`,
    );
    root.style.setProperty('--cp-brand-soft', `color-mix(in srgb, ${primary} ${darkSurface ? 22 : 14}%, var(--cp-surface))`);
    return () => ACCENT_VARS.forEach((v) => root.style.removeProperty(v));
  }, [accent, darkSurface, palette.background]);

  // Warm the caches for the heaviest lists as soon as the dashboard opens.
  useEffect(() => {
    if (!user) return;
    queryClient.prefetchQuery({ queryKey: queryKeys.games.list(), queryFn: gameApi.getAll });
    queryClient.prefetchQuery({ queryKey: queryKeys.simulators.list(), queryFn: simulatorApi.getAll });
    queryClient.prefetchQuery({ queryKey: queryKeys.scores.leaderboard.global, queryFn: scoreApi.getGlobalLeaderboard });
  }, [queryClient, user]);

  // ⌘K / Ctrl+K opens the finder; "/" too when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const prefetch = useCallback(
    (t: TabId) => {
      if (t === 'simulators')
        queryClient.prefetchQuery({ queryKey: queryKeys.simulators.list(), queryFn: simulatorApi.getAll, staleTime: 5 * 60 * 1000 });
      if (t === 'leaderboard')
        queryClient.prefetchQuery({
          queryKey: queryKeys.scores.leaderboard.global,
          queryFn: scoreApi.getGlobalLeaderboard,
          staleTime: 5 * 60 * 1000,
        });
    },
    [queryClient],
  );

  const goTo = useCallback(
    (next: TabId) => {
      setTab(next);
      if (next !== 'games' && next !== 'simulators') setSearch('');
    },
    [setTab],
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('activeTab');
    queryClient.clear();
    setUser(null);
    navigate('/', { replace: true });
  }, [navigate, queryClient]);

  const handleUserChanged = useCallback((next: User) => {
    setUser(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const openExperience = useCallback((id: string, kind: 'game' | 'simulator') => setTab(kind === 'game' ? 'games' : 'simulators', { focus: id }), [setTab]);
  // Creating and editing are admin-only; the buttons are hidden for everyone else, and this refuses the route too.
  const startCreate = useCallback(
    (mode: 'game' | 'simulator') => {
      if (isAdmin) setTab('creator', { mode });
    },
    [isAdmin, setTab],
  );
  const startEdit = useCallback(
    (mode: 'game' | 'simulator', id: string) => {
      if (isAdmin) setTab('creator', { mode, edit: id });
    },
    [isAdmin, setTab],
  );
  const searchLibrary = useCallback(
    (q: string) => {
      setSearch(q);
      setTab('games');
    },
    [setTab],
  );

  const handleCreatorDone = useCallback(
    (kind: 'game' | 'simulator') => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.simulators.lists() });
      setTab(kind === 'game' ? 'games' : 'simulators', {}, true);
    },
    [queryClient, setTab],
  );

  // Drop the one-shot focus param once a library has opened the item.
  const clearFocus = useCallback(() => {
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.delete('focus');
        return n;
      },
      { replace: true },
    );
  }, [setParams]);

  const panels = useMemo<Partial<Record<TabId, ReactNode>>>(() => {
    if (!user) return {};
    return {
      overview: <OverviewView user={user} onNavigate={goTo} onOpenExperience={openExperience} />,
      games: (
        <GamesView
          user={user}
          searchGlobal={search}
          setSearchGlobal={setSearch}
          onEditGame={(id) => startEdit('game', id)}
          onNewGame={() => startCreate('game')}
          focusId={focusId}
          onFocusHandled={clearFocus}
        />
      ),
      simulators: (
        <SimulatorsView
          user={user}
          searchGlobal={search}
          setSearchGlobal={setSearch}
          onEditSimulator={(id) => startEdit('simulator', id)}
          onNewSimulator={() => startCreate('simulator')}
          focusId={focusId}
          onFocusHandled={clearFocus}
        />
      ),
      leaderboard: (
        <LeaderboardView user={user} onViewProfile={(id) => setTab('playerProfile', { player: id })} onOpenExperience={openExperience} />
      ),
      playerProfile: playerId ? (
        <PlayerProfileView userId={playerId} currentUser={user} onBack={() => navigate(-1)} />
      ) : null,
      achievements: <AchievementsView user={user} />,
      analytics: <AnalyticsView user={user} />,
      // Read-only: your public card. Editing lives in Settings → Profile.
      profile: <PlayerProfileView own userId={user.id} currentUser={user} />,
      settings: <SettingsView user={user} onUserChanged={handleUserChanged} onLogout={handleLogout} />,
      creator: isAdmin ? (
        <CreatorView
          key={`${creator.mode}-${creator.editId ?? 'new'}`}
          mode={creator.mode}
          editId={creator.editId}
          onDone={handleCreatorDone}
          onCancel={() => goTo(creator.mode === 'game' ? 'games' : 'simulators')}
        />
      ) : null,
      admin_notifications: isAdmin ? <AdminNotificationsView user={user} /> : null,
    };
  }, [
    user,
    goTo,
    openExperience,
    startCreate,
    startEdit,
    search,
    focusId,
    clearFocus,
    playerId,
    navigate,
    setTab,
    handleUserChanged,
    handleLogout,
    isAdmin,
    creator,
    handleCreatorDone,
  ]);

  if (!user) return <Navigate to="/login" replace />;

  const activeIndex = TAB_ORDER.indexOf(tab);

  return (
    <FeedbackProvider>
      <NotificationProvider>
        <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
          <a
            href="#main"
            className="sr-only z-[200] rounded-lg bg-surface px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>

          <NavBar
            user={user}
            active={tab}
            onNavigate={goTo}
            onOpenPalette={() => setPaletteOpen(true)}
            onLogout={handleLogout}
            onPrefetch={prefetch}
          />

          <main id="main" ref={scrollRef} className="relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            {/* Phones leave room for the floating dock. */}
            <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-32 sm:px-6 md:pb-12 lg:px-10 lg:py-10">
              <TransitionPanel activeIndex={activeIndex} variants={pageTransition}>
                {TAB_ORDER.map((id) => (
                  <Suspense key={id} fallback={<ViewFallback />}>
                    {id === tab ? panels[id] : null}
                  </Suspense>
                ))}
              </TransitionPanel>
            </div>
          </main>

          <MobileDock user={user} active={tab} onNavigate={goTo} />

          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            user={user}
            onNavigate={goTo}
            onOpenExperience={openExperience}
            onSearchLibrary={searchLibrary}
            onLogout={handleLogout}
          />
        </div>
      </NotificationProvider>
    </FeedbackProvider>
  );
}
