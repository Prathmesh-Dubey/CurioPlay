import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { achievementApi, userAchievementApi } from '../../api/api';

export const useAchievements = () => {
  return useQuery({
    queryKey: queryKeys.achievements.list(),
    queryFn: () => achievementApi.getAll(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useUserAchievements = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.achievements.user.detail(userId),
    queryFn: () => userAchievementApi.getByUser(userId),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: !!userId,
  });
};

export const useUserAchievementsCount = (userId: string) => {
  return useQuery({
    queryKey: [...queryKeys.achievements.user.detail(userId), 'count'],
    queryFn: () => userAchievementApi.getCountForUser(userId),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: !!userId,
  });
};
