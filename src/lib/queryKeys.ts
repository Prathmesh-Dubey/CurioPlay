export const queryKeys = {
  games: {
    all: ['games'] as const,
    lists: () => [...queryKeys.games.all, 'list'] as const,
    list: (filters?: { active?: boolean }) => 
      [...queryKeys.games.lists(), { ...filters }] as const,
    details: () => [...queryKeys.games.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.games.details(), id] as const,
    code: (id: string) => [...queryKeys.games.detail(id), 'code'] as const,
  },
  simulators: {
    all: ['simulators'] as const,
    lists: () => [...queryKeys.simulators.all, 'list'] as const,
    list: (filters?: { active?: boolean }) => 
      [...queryKeys.simulators.lists(), { ...filters }] as const,
    details: () => [...queryKeys.simulators.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.simulators.details(), id] as const,
  },
  scores: {
    all: ['scores'] as const,
    leaderboard: {
      all: ['scores', 'leaderboard'] as const,
      byGame: (gameId: string) => 
        [...queryKeys.scores.leaderboard.all, gameId] as const,
      global: ['scores', 'global-leaderboard'] as const,
    },
    user: (userId: string) => 
      [...queryKeys.scores.all, 'user', userId] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    detail: (userId: string) => 
      [...queryKeys.profiles.all, userId] as const,
  },
  achievements: {
    all: ['achievements'] as const,
    lists: () => [...queryKeys.achievements.all, 'list'] as const,
    list: () => [...queryKeys.achievements.lists()] as const,
    user: {
      all: ['user-achievements'] as const,
      detail: (userId: string) => 
        [...queryKeys.achievements.user.all, userId] as const,
    },
  },
  notifications: {
    all: ['notifications'] as const,
    active: ['notifications', 'active'] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    user: (userId: string) => 
      [...queryKeys.sessions.all, 'user', userId] as const,
    totalTime: (userId: string) => 
      [...queryKeys.sessions.user(userId), 'total-time'] as const,
    dau: ['sessions', 'dau'] as const,
  },
};
