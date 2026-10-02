/*
 * THE PODIUM — concept & interaction narrative
 * Readable first. A night "stage" chapter holds the all-time Hall of Fame on a real 2·1·3 podium whose
 * plinths rise from the floor (gold only for #1), with your own global standing printed on the stage edge.
 * Below, a calm instrument: pick any game (type-ahead select), read the board as a table on desktop or
 * cards on phones, watch scores slide and rows re-order, see ▲/▼ movement after a refetch, and "Jump to me".
 * Rankings are for games only — simulators are experiments, not competitions.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Gamepad2, Play } from 'lucide-react';
import type { Score, User } from '@/api/api';
import { useGames, useGlobalLeaderboard, useLeaderboard, useUsers } from '@/hooks';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Decor';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { HallOfFame } from './HallOfFame';
import { RankingBoard } from './RankingBoard';

interface LeaderboardViewProps {
  user: User;
  onViewProfile: (userId: string) => void;
  onOpenExperience: (id: string, kind: 'game' | 'simulator') => void;
}

interface Experience {
  id: string;
  title: string;
  category: string | null;
  kind: 'game';
}

const NO_SCORES: Score[] = [];

export default function LeaderboardView({ user, onViewProfile, onOpenExperience }: LeaderboardViewProps) {
  const [selected, setSelected] = useState<string>('');

  const globalQ = useGlobalLeaderboard();
  const gamesQ = useGames();

  // Rankings are for games only; simulators are not scored competitively.
  const visible = useMemo<Experience[]>(
    () =>
      (gamesQ.data ?? [])
        .filter((x) => x.type !== 'simulator' && x.active !== false)
        .map<Experience>((x) => ({ id: x.id, title: x.title, category: x.category, kind: 'game' })),
    [gamesQ.data],
  );

  const current = visible.find((e) => e.id === selected) ?? visible[0];
  const selectedId = current?.id ?? '';

  const boardQ = useLeaderboard(selectedId);
  const scores = boardQ.data ?? NO_SCORES;

  const globalRanks = useMemo(
    () => [...(globalQ.data ?? [])].sort((a, b) => b.totalScore - a.totalScore),
    [globalQ.data],
  );
  const top3 = useMemo(() => globalRanks.slice(0, 3), [globalRanks]);

  const userIds = useMemo(
    () => Array.from(new Set([...top3.map((r) => r.userId), ...scores.map((s) => s.userId)])),
    [top3, scores],
  );
  const { data: usersData, isLoading: usersLoading } = useUsers(userIds);
  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    (usersData as User[]).forEach((u) => m.set(u.id, u));
    return m;
  }, [usersData]);

  const options = useMemo<SelectOption[]>(
    () => visible.map((e) => ({ value: e.id, label: e.title, description: e.category?.trim() || undefined })),
    [visible],
  );

  let board: ReactNode;
  if (gamesQ.isLoading) {
    board = (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading games">
        <Skeleton className="h-[76px] rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  } else if (gamesQ.isError && visible.length === 0) {
    board = <ErrorState title="We couldn't load the games" onRetry={() => gamesQ.refetch()} />;
  } else if (visible.length === 0 || !current) {
    board = (
      <EmptyState
        icon={<Gamepad2 className="size-6" />}
        title="Nothing to rank yet"
        description="Games will appear here as soon as they are published."
      />
    );
  } else {
    board = (
      <RankingBoard
        gameId={selectedId}
        gameTitle={current.title}
        scores={scores}
        loading={boardQ.isLoading}
        fetching={boardQ.isFetching}
        isError={boardQ.isError}
        onRetry={() => boardQ.refetch()}
        userMap={userMap}
        usersLoading={usersLoading}
        meId={user.id}
        onViewProfile={onViewProfile}
        onPlay={() => onOpenExperience(current.id, current.kind)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <PageHeader
        index="04"
        eyebrow="The Podium"
        title="Leaderboard"
        description="Who leads the collection, and where you stand in every game."
      />

      <HallOfFame
        ranks={globalRanks}
        loading={globalQ.isLoading}
        isError={globalQ.isError}
        onRetry={() => globalQ.refetch()}
        userMap={userMap}
        meId={user.id}
        onViewProfile={onViewProfile}
      />

      <section aria-labelledby="board-title" className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Eyebrow>By game</Eyebrow>
            {gamesQ.isLoading ? (
              <Skeleton className="mt-3 h-9 w-56" />
            ) : (
              <h2 id="board-title" className="mt-3 truncate font-semiwide text-[1.75rem] font-extrabold leading-tight text-ink sm:text-[2rem]">
                {current ? current.title : 'Game rankings'}
              </h2>
            )}
          </div>

          {current && (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                ariaLabel="Choose a game to rank"
                value={selectedId}
                onChange={setSelected}
                options={options}
                leading={<Gamepad2 className="size-4" />}
                className="min-w-0 sm:w-72"
              />
              <Button
                className="shrink-0"
                leadingIcon={<Play className="size-4" />}
                onClick={() => onOpenExperience(current.id, current.kind)}
              >
                Play this
              </Button>
            </div>
          )}
        </div>

        {board}
      </section>
    </div>
  );
}
