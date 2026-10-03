import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import {
  gameApi,
  simulatorApi,
  scoreApi,
  profileApi,
  userAchievementApi,
  notificationApi,
  type GameRequest,
  type NotificationRequest,
  type ProfileRequest,
  type ScoreRequest,
  type SimulatorRequest,
} from '../../api/api';
import { evictExperienceCode } from '../../lib/cache/catalog';

export const useCreateGame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GameRequest) => gameApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.simulators.lists() });
    },
  });
};

export const useUpdateGame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GameRequest> }) => 
      gameApi.update(id, data),
    onSuccess: (_, { id }) => {
      evictExperienceCode('game', id);
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.lists() });
    },
  });
};

export const useDeleteGame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gameApi.delete(id),
    onSuccess: (_, id) => {
      evictExperienceCode('game', id);
      queryClient.invalidateQueries({ queryKey: queryKeys.games.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.simulators.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.scores.leaderboard.all });
    },
  });
};

export const useCreateSimulator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SimulatorRequest) => simulatorApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simulators.lists() });
    },
  });
};

export const useUpdateSimulator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SimulatorRequest> }) => 
      simulatorApi.update(id, data),
    onSuccess: (_, { id }) => {
      evictExperienceCode('simulator', id);
      queryClient.invalidateQueries({ queryKey: queryKeys.simulators.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.simulators.lists() });
    },
  });
};

export const useSubmitScore = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ScoreRequest) => scoreApi.submit(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.scores.leaderboard.byGame(data.gameId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.scores.leaderboard.global 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.scores.user(data.userId) 
      });
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: ProfileRequest }) => 
      profileApi.update(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.profiles.detail(userId) 
      });
    },
  });
};

export const useUnlockAchievement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, score }: { userId: string; score: number }) => userAchievementApi.checkAndUnlock(userId, score),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.achievements.user.detail(userId) 
      });
    },
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, adminId }: { data: NotificationRequest; adminId: string }) => notificationApi.create(data, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.active });
    },
  });
};

export const useUpdateNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NotificationRequest }) => notificationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.active });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.active });
    },
  });
};

export const useToggleNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.active });
    },
  });
};
