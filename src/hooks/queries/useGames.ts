import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { gameApi, type Game } from '../../api/api';
import { fetchGames } from '../../lib/cache/catalog';
import { TTL } from '../../lib/cache/policy';
import { snapshotOf } from '../../lib/cache/snapshot';

const onlyActive = (games: Game[]) => games.filter((g) => g.active);

/**
 * Games, without their source code (that is fetched per game when one is launched).
 * `{ active: true }` is derived from the same cached list instead of a second request:
 * /api/games/active returns the same ~500 KB the full list does.
 */
export const useGames = (filters?: { active?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.games.list(),
    queryFn: fetchGames,
    staleTime: TTL.catalog,
    ...snapshotOf('games'),
    select: filters?.active ? onlyActive : undefined,
  });
};

export const useGame = (gameId: string) => {
  return useQuery({
    queryKey: queryKeys.games.detail(gameId),
    queryFn: () => gameApi.getById(gameId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!gameId,
  });
};
