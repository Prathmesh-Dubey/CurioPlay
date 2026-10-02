// src/api/api.ts

// -------- Base Configuration --------
const BASE_URL = 'https://gamezone-cf3p2jpe5a-uc.a.run.app';

// -------- Helper Functions --------
const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  // Add authentication header later if needed
});

const handleResponse = async <T>(response: Response): Promise<T> => {
  try {
    const userStr = localStorage.getItem('curioplay_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.id) {
        localStorage.setItem(`lastActive_${user.id}`, Date.now().toString());
      }
    }
  } catch (e) {
    // Ignore
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "";
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message && typeof errorJson.message === "string") {
        errorMessage = errorJson.message;
      } else if (errorJson.error && typeof errorJson.error === "string") {
        errorMessage = errorJson.error;
      } else {
        errorMessage = `HTTP error ${response.status}`;
      }
    } catch {
      errorMessage = errorText || `HTTP error ${response.status}`;
    }

    // Intercept database duplicate key & unique constraint errors (e.g. Postgres / Hibernate / Spring Boot exceptions)
    if (
      errorMessage.includes("profiles_username_key") ||
      errorMessage.includes("users_username_key") ||
      errorMessage.includes("duplicate key value violates unique constraint") ||
      errorMessage.includes("already exists")
    ) {
      const usernameMatch = errorMessage.match(/Key \(username\)=\((.*?)\)/i) || errorMessage.match(/username[=\s]+(['"]?)(.*?)\1/i);
      if (usernameMatch && usernameMatch[1] && usernameMatch[1] !== "'" && usernameMatch[1] !== '"') {
        errorMessage = `Username "${usernameMatch[1]}" is already taken. Please choose a different username.`;
      } else if (usernameMatch && usernameMatch[2]) {
        errorMessage = `Username "${usernameMatch[2]}" is already taken. Please choose a different username.`;
      } else {
        errorMessage = "That username is already registered in the database. Please choose a unique username.";
      }
    }

    throw new Error(errorMessage);
  }
  // Some endpoints return no content (204)
  if (response.status === 204) {
    return {} as T;
  }
  return response.json() as Promise<T>;
};

// -------- Types / DTOs --------
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  profileId?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  dateOfBirth?: string | null;
  website?: string | null;
  accentColor?: string | null;
  avatarSeed?: string | null;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: string;
  adminKey?: string;
}

export interface ProfileRequest {
  userId?: string; // only needed for POST
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  dateOfBirth?: string | null;
  website?: string | null;
  accentColor?: string | null;
  avatarSeed?: string | null;
}

export interface ProfileResponse {
  id: string;
  userId: string;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  dateOfBirth: string | null;
  website: string | null;
  accentColor: string | null;
  avatarSeed: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail: string | null;
  active: boolean;
  gameCode?: string | null;   // used for dynamic games
  isDynamic?: boolean;
  type?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameRequest {
  title: string;
  description?: string | null;
  category?: string | null;
  thumbnail?: string | null;
  active?: boolean;
  gameCode?: string | null;
  isDynamic?: boolean;
  type?: string;
}

export interface Simulator {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail: string | null;
  active: boolean;
  simulatorCode?: string | null;
  gameCode?: string | null;
  isDynamic?: boolean;
  type?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SimulatorRequest {
  title: string;
  description?: string | null;
  category?: string | null;
  thumbnail?: string | null;
  active?: boolean;
  simulatorCode?: string | null;
  gameCode?: string | null;
  isDynamic?: boolean;
  type?: string;
}

export interface Score {
  id: string;
  scoreValue: number;
  playedAt: string;
  userId: string;
  gameId: string;
}

export interface ScoreRequest {
  userId: string;
  gameId: string;
  scoreValue: number;
}

export interface GameSession {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  userId: string;
  gameId: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string | null;
  requiredScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementRequest {
  title: string;
  description?: string | null;
  requiredScore: number;
}

export interface GlobalRank {
  userId: string;
  username: string;
  totalScore: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievementTitle: string;
  achievementDescription: string;
  unlockedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdByUsername: string;
  createdAt: string;
  active: boolean;
  expiresAt: string | null;
}

export interface NotificationRequest {
  title: string;
  message: string;
  type: string;
  expiresAt?: string | null;
}

// -------- API Functions --------

// ========== Auth ==========
export const authApi = {
  register: (data: RegisterRequest): Promise<User> =>
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<User>(res)),

  login: (data: LoginRequest): Promise<User> =>
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<User>(res)),

  getUser: (identifier: string): Promise<User> =>
    fetch(`${BASE_URL}/auth/user?identifier=${encodeURIComponent(identifier)}`)
      .then(res => handleResponse<User>(res)),
};

// ========== Users ==========
export const userApi = {
  getAll: (): Promise<User[]> =>
    fetch(`${BASE_URL}/api/users`).then(res => handleResponse<User[]>(res)),

  getById: (id: string): Promise<User> =>
    fetch(`${BASE_URL}/api/users/${id}`).then(res => handleResponse<User>(res)),

  update: (id: string, data: Partial<User>): Promise<User> =>
    fetch(`${BASE_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<User>(res)),

  delete: (id: string): Promise<void> =>
    fetch(`${BASE_URL}/api/users/${id}`, { method: 'DELETE' })
      .then(res => handleResponse<void>(res)),

  deleteAccount: (id: string): Promise<void> =>
    fetch(`${BASE_URL}/api/users/${id}`, { method: 'DELETE' })
      .then(res => handleResponse<void>(res)),
};

// ========== Profiles ==========
export const profileApi = {
  getByUserId: (userId: string): Promise<ProfileResponse> =>
    fetch(`${BASE_URL}/api/profiles/${userId}`)
      .then(res => handleResponse<ProfileResponse>(res)),

  create: (data: ProfileRequest): Promise<ProfileResponse> =>
    fetch(`${BASE_URL}/api/profiles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<ProfileResponse>(res)),

  update: (userId: string, data: ProfileRequest): Promise<ProfileResponse> =>
    fetch(`${BASE_URL}/api/profiles/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<ProfileResponse>(res)),

  delete: (userId: string): Promise<void> =>
    fetch(`${BASE_URL}/api/profiles/${userId}`, { method: 'DELETE' })
      .then(res => handleResponse<void>(res)),
};

// ========== Games ==========
export const gameApi = {
  getAll: (): Promise<Game[]> =>
    fetch(`${BASE_URL}/api/games`).then(res => handleResponse<Game[]>(res)),

  getActive: (): Promise<Game[]> =>
    fetch(`${BASE_URL}/api/games/active`).then(res => handleResponse<Game[]>(res)),

  getSimulators: (): Promise<Game[]> =>
    fetch(`${BASE_URL}/api/games/simulators`).then(res => handleResponse<Game[]>(res)),

  getByType: (type: string): Promise<Game[]> =>
    fetch(`${BASE_URL}/api/games?type=${encodeURIComponent(type)}`).then(res => handleResponse<Game[]>(res)),

  getById: (id: string): Promise<Game> =>
    fetch(`${BASE_URL}/api/games/${id}`).then(res => handleResponse<Game>(res)),

  getCode: (id: string): Promise<string> =>
    fetch(`${BASE_URL}/api/games/${id}/code`).then(res => res.text()),

  create: (data: GameRequest): Promise<Game> =>
    fetch(`${BASE_URL}/api/games`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<Game>(res)),

  update: (id: string, data: Partial<GameRequest>): Promise<Game> =>
    fetch(`${BASE_URL}/api/games/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<Game>(res)),

  delete: (id: string): Promise<void> =>
    fetch(`${BASE_URL}/api/games/${id}`, { method: 'DELETE' })
      .then(res => handleResponse<void>(res)),
};

// ========== Simulators (Dedicated Controller API) ==========
export const simulatorApi = {
  getAll: (): Promise<Simulator[]> =>
    fetch(`${BASE_URL}/api/simulators`).then(res => handleResponse<Simulator[]>(res)),

  getActive: (): Promise<Simulator[]> =>
    fetch(`${BASE_URL}/api/simulators/active`).then(res => handleResponse<Simulator[]>(res)),

  getById: (id: string): Promise<Simulator> =>
    fetch(`${BASE_URL}/api/simulators/${id}`).then(res => handleResponse<Simulator>(res)),

  getCode: (id: string): Promise<string> =>
    fetch(`${BASE_URL}/api/simulators/${id}/code`).then(res => res.text()),

  create: (data: SimulatorRequest): Promise<Simulator> =>
    fetch(`${BASE_URL}/api/simulators`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<Simulator>(res)),

  update: (id: string, data: Partial<SimulatorRequest>): Promise<Simulator> =>
    fetch(`${BASE_URL}/api/simulators/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<Simulator>(res)),

  delete: (id: string): Promise<void> =>
    fetch(`${BASE_URL}/api/simulators/${id}`, { method: 'DELETE' })
      .then(res => handleResponse<void>(res)),
};

// ========== Scores ==========
export const scoreApi = {
  submit: (data: ScoreRequest): Promise<Score> =>
    fetch(`${BASE_URL}/api/scores`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<Score>(res)),

  getByGame: (gameId: string): Promise<Score[]> =>
    fetch(`${BASE_URL}/api/scores/game/${gameId}`)
      .then(res => handleResponse<Score[]>(res)),

  getByUser: (userId: string): Promise<Score[]> =>
    fetch(`${BASE_URL}/api/scores/user/${userId}`)
      .then(res => handleResponse<Score[]>(res)),

  getLeaderboard: (gameId: string): Promise<Score[]> =>
    fetch(`${BASE_URL}/api/scores/leaderboard/${gameId}`)
      .then(res => handleResponse<Score[]>(res)),

  getGlobalLeaderboard: (): Promise<GlobalRank[]> =>
    fetch(`${BASE_URL}/api/scores/global-leaderboard`)
      .then(res => handleResponse<GlobalRank[]>(res)),

  /** Resolves to null when the player has no score for this game yet (204). */
  getPersonalBest: (userId: string, gameId: string): Promise<Score | null> =>
    fetch(`${BASE_URL}/api/scores/personal-best?userId=${userId}&gameId=${gameId}`)
      .then(res => {
        if (res.status === 204) return null;
        return handleResponse<Score>(res);
      }),
};

// ========== Game Sessions ==========
export const sessionApi = {
  start: (userId: string, gameId: string): Promise<GameSession> =>
    fetch(`${BASE_URL}/api/sessions/start?userId=${userId}&gameId=${gameId}`, {
      method: 'POST',
    }).then(res => handleResponse<GameSession>(res)),

  end: (sessionId: string): Promise<GameSession> =>
    fetch(`${BASE_URL}/api/sessions/end/${sessionId}`, {
      method: 'PUT',
    }).then(res => handleResponse<GameSession>(res)),

  getByUser: (userId: string): Promise<GameSession[]> =>
    fetch(`${BASE_URL}/api/sessions/user/${userId}`)
      .then(res => handleResponse<GameSession[]>(res)),

  getByGame: (gameId: string): Promise<GameSession[]> =>
    fetch(`${BASE_URL}/api/sessions/game/${gameId}`)
      .then(res => handleResponse<GameSession[]>(res)),

  getActiveByUser: (userId: string): Promise<GameSession[]> =>
    fetch(`${BASE_URL}/api/sessions/active/user/${userId}`)
      .then(res => handleResponse<GameSession[]>(res)),

  getTotalPlayTime: (userId: string): Promise<number> =>
    fetch(`${BASE_URL}/api/sessions/total-time/user/${userId}`)
      .then(res => handleResponse<number>(res)),

  getDailyActiveUsers: (date: string): Promise<number> =>
    fetch(`${BASE_URL}/api/sessions/dau?date=${encodeURIComponent(date)}`)
      .then(res => handleResponse<number>(res)),

  getSessionCount: (userId: string): Promise<number> =>
    fetch(`${BASE_URL}/api/sessions/count/user/${userId}`)
      .then(res => handleResponse<number>(res)),
};

// ========== Achievements ==========
export const achievementApi = {
  getAll: (): Promise<Achievement[]> =>
    fetch(`${BASE_URL}/api/achievements`)
      .then(res => handleResponse<Achievement[]>(res)),

  getById: (id: string): Promise<Achievement> =>
    fetch(`${BASE_URL}/api/achievements/${id}`)
      .then(res => handleResponse<Achievement>(res)),

  create: (data: AchievementRequest): Promise<Achievement> =>
    fetch(`${BASE_URL}/api/achievements`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<Achievement>(res)),

  update: (id: string, data: Partial<AchievementRequest>): Promise<Achievement> =>
    fetch(`${BASE_URL}/api/achievements/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<Achievement>(res)),

  delete: (id: string): Promise<void> =>
    fetch(`${BASE_URL}/api/achievements/${id}`, { method: 'DELETE' })
      .then(res => handleResponse<void>(res)),
};

// ========== User Achievements ==========
export const userAchievementApi = {
  unlock: (userId: string, achievementId: string): Promise<UserAchievement> =>
    fetch(`${BASE_URL}/api/user-achievements/unlock?userId=${userId}&achievementId=${achievementId}`, {
      method: 'POST',
    }).then(res => handleResponse<UserAchievement>(res)),

  getByUser: (userId: string): Promise<UserAchievement[]> =>
    fetch(`${BASE_URL}/api/user-achievements/user/${userId}`)
      .then(res => handleResponse<UserAchievement[]>(res)),

  getByAchievement: (achievementId: string): Promise<UserAchievement[]> =>
    fetch(`${BASE_URL}/api/user-achievements/achievement/${achievementId}`)
      .then(res => handleResponse<UserAchievement[]>(res)),

  getCountForUser: (userId: string): Promise<number> =>
    fetch(`${BASE_URL}/api/user-achievements/count/user/${userId}`)
      .then(res => handleResponse<number>(res)),

  checkAndUnlock: (userId: string, score: number): Promise<UserAchievement[]> =>
    fetch(`${BASE_URL}/api/user-achievements/check?userId=${userId}&score=${score}`, {
      method: 'POST',
    }).then(res => handleResponse<UserAchievement[]>(res)),
};

// ========== Notifications ==========
export const notificationApi = {
  getActive: (): Promise<Notification[]> =>
    fetch(`${BASE_URL}/api/notifications/active`)
      .then(res => handleResponse<Notification[]>(res)),

  getAll: (): Promise<Notification[]> =>
    fetch(`${BASE_URL}/api/notifications`)
      .then(res => handleResponse<Notification[]>(res)),

  create: (data: NotificationRequest, adminId: string): Promise<Notification> =>
    fetch(`${BASE_URL}/api/notifications?adminId=${adminId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<Notification>(res)),

  update: (id: string, data: NotificationRequest): Promise<Notification> =>
    fetch(`${BASE_URL}/api/notifications/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<Notification>(res)),

  delete: (id: string): Promise<void> =>
    fetch(`${BASE_URL}/api/notifications/${id}`, { method: 'DELETE' })
      .then(res => handleResponse<void>(res)),

  toggleActive: (id: string): Promise<Notification> =>
    fetch(`${BASE_URL}/api/notifications/${id}/toggle`, {
      method: 'PATCH',
    }).then(res => handleResponse<Notification>(res)),
};