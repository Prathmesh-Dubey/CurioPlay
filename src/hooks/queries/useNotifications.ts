import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { notificationApi } from '../../api/api';

export const useActiveNotifications = () => {
  return useQuery({
    queryKey: queryKeys.notifications.active,
    queryFn: () => notificationApi.getActive(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useAllNotifications = () => {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => notificationApi.getAll(),
    staleTime: 1 * 60 * 1000,
  });
};
