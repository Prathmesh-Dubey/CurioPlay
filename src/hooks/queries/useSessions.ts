import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { sessionApi } from '../../api/api';

export const useUserSessions = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.sessions.user(userId),
    queryFn: () => sessionApi.getByUser(userId),
    staleTime: 60 * 60 * 1000,
    enabled: !!userId,
  });
};

export const useTotalPlayTime = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.sessions.totalTime(userId),
    queryFn: () => sessionApi.getTotalPlayTime(userId),
    staleTime: 60 * 60 * 1000,
    enabled: !!userId,
  });
};

export const useDailyActiveUsers = (dateStr: string) => {
  return useQuery({
    queryKey: queryKeys.sessions.dau,
    queryFn: () => sessionApi.getDailyActiveUsers(dateStr),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useSessionCount = (userId: string) => {
  return useQuery({
    queryKey: [...queryKeys.sessions.user(userId), 'count'], // Fixed to be specific to count
    queryFn: () => sessionApi.getSessionCount(userId),
    staleTime: 60 * 60 * 1000,
    enabled: !!userId,
  });
};
