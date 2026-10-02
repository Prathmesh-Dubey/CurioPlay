import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { scoreApi } from '../../api/api';

export const useGlobalLeaderboard = () => {
  return useQuery({
    queryKey: queryKeys.scores.leaderboard.global,
    queryFn: () => scoreApi.getGlobalLeaderboard(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useUserScores = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.scores.user(userId),
    queryFn: () => scoreApi.getByUser(userId),
    staleTime: 60 * 60 * 1000,
    enabled: !!userId,
  });
};

export const useLeaderboard = (gameId: string) => {
  return useQuery({
    queryKey: queryKeys.scores.leaderboard.byGame(gameId),
    queryFn: () => scoreApi.getLeaderboard(gameId),
    staleTime: 60 * 60 * 1000,
    enabled: !!gameId,
  });
};
