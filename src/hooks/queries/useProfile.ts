import React from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { profileApi } from '../../api/api';

import { userApi, type User } from '../../api/api';

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.profiles.detail(userId),
    queryFn: () => profileApi.getByUserId(userId),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: !!userId,
  });
};

export const useUser = (userId: string) => {
  const { data: allUsers = [], isLoading, error } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userApi.getAll(),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: !!userId,
  });

  const data = React.useMemo(() => {
    return allUsers.find(u => u.id === userId) || null;
  }, [allUsers, userId]);

  return { data, isLoading, error };
};

export const useUsers = (userIds: string[]) => {
  const { data: allUsers = [], isLoading, error } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userApi.getAll(),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: userIds.length > 0,
  });

  const data = React.useMemo(() => {
    return userIds
      .map(id => allUsers.find(u => u.id === id))
      .filter((u): u is User => Boolean(u));
  }, [allUsers, userIds]);

  return { data, isLoading, error };
};
