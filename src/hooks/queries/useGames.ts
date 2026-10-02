import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { gameApi } from '../../api/api';

export const useGames = (filters?: { active?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.games.list(filters),
    queryFn: () => filters?.active 
      ? gameApi.getActive() 
      : gameApi.getAll(),
    staleTime: filters?.active ? 30 * 60 * 1000 : 60 * 60 * 1000, // 30 min or 1 hour
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
