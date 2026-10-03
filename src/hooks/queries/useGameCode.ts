import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { getExperienceCode } from '../../lib/cache/catalog';

/** A game's source. Stored in IndexedDB per version (`updatedAt`), so it is downloaded once, not per visit. */
export const useGameCode = (gameId: string, version?: string | null) => {
  return useQuery({
    queryKey: queryKeys.games.code(gameId),
    queryFn: () => getExperienceCode('game', gameId, version),
    staleTime: Infinity,
    enabled: !!gameId,
  });
};
