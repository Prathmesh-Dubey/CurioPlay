import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { gameApi } from '../../api/api';

export const useGameCode = (gameId: string) => {
  return useQuery({
    queryKey: queryKeys.games.code(gameId),
    queryFn: () => gameApi.getCode(gameId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!gameId,
  });
};
