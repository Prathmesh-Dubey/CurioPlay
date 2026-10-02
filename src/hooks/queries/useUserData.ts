import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { profileApi, sessionApi, scoreApi, userAchievementApi } from '../../api/api';
import React from 'react';

export const useUserData = (userId: string) => {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.profiles.detail(userId),
        queryFn: () => profileApi.getByUserId(userId),
        staleTime: 60 * 60 * 1000,
        enabled: !!userId,
      },
      {
        queryKey: queryKeys.sessions.user(userId),
        queryFn: () => sessionApi.getByUser(userId),
        staleTime: 60 * 60 * 1000,
        enabled: !!userId,
      },
      {
        queryKey: queryKeys.sessions.totalTime(userId),
        queryFn: () => sessionApi.getTotalPlayTime(userId),
        staleTime: 60 * 60 * 1000,
        enabled: !!userId,
      },
      {
        queryKey: [...queryKeys.sessions.user(userId), 'count'],
        queryFn: () => sessionApi.getSessionCount(userId),
        staleTime: 60 * 60 * 1000,
        enabled: !!userId,
      },
      {
        queryKey: queryKeys.scores.user(userId),
        queryFn: () => scoreApi.getByUser(userId),
        staleTime: 60 * 60 * 1000,
        enabled: !!userId,
      },
      {
        queryKey: queryKeys.achievements.user.detail(userId),
        queryFn: () => userAchievementApi.getByUser(userId),
        staleTime: 60 * 60 * 1000,
        enabled: !!userId,
      },
      {
        queryKey: [...queryKeys.achievements.user.detail(userId), 'count'],
        queryFn: () => userAchievementApi.getCountForUser(userId),
        staleTime: 60 * 60 * 1000,
        enabled: !!userId,
      },
    ],
  });
  
  const [
    profile, 
    sessions, 
    totalTime, 
    sessionCount, 
    scores, 
    achievements, 
    achievementCount
  ] = results;
  
  const data = React.useMemo(() => ({
    profile: profile.data,
    sessions: sessions.data || [],
    totalTime: totalTime.data || 0,
    sessionCount: sessionCount.data || 0,
    scores: scores.data || [],
    achievements: achievements.data || [],
    achievementCount: achievementCount.data || 0,
  }), [
    profile.data, 
    sessions.data, 
    totalTime.data, 
    sessionCount.data, 
    scores.data, 
    achievements.data, 
    achievementCount.data
  ]);
  
  return {
    ...data,
    isLoading: results.some(r => r.isLoading),
    isError: results.some(r => r.isError),
  };
};
