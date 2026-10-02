import {
  Award,
  BarChart3,
  Bell,
  FlaskConical,
  Gamepad2,
  LayoutDashboard,
  Settings,
  Trophy,
  User as UserIcon,
  Wand2,
  type LucideIcon,
} from 'lucide-react';

export type TabId =
  | 'overview'
  | 'games'
  | 'simulators'
  | 'leaderboard'
  | 'achievements'
  | 'analytics'
  | 'profile'
  | 'settings'
  | 'creator'
  | 'admin_notifications'
  | 'playerProfile';

export interface NavItem {
  id: TabId;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** One-line description, shown in the navbar dropdowns and the command palette. */
  hint: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, hint: 'Your day at a glance' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, hint: 'Play time, scores and trends' },
  { id: 'games', label: 'Game Library', icon: Gamepad2, hint: 'Browse and play games' },
  { id: 'simulators', label: 'Simulators', icon: FlaskConical, hint: 'Run experiments in the lab' },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, hint: 'Rankings and hall of fame' },
  { id: 'achievements', label: 'Achievements', icon: Award, hint: 'Your medal cabinet' },
  { id: 'creator', label: 'Creator Studio', icon: Wand2, adminOnly: true, hint: 'Publish a game or simulator' },
  { id: 'admin_notifications', label: 'Broadcasts', icon: Bell, adminOnly: true, hint: 'Send notifications to everyone' },
  { id: 'profile', label: 'Profile', icon: UserIcon, hint: 'Your player card' },
  { id: 'settings', label: 'Settings', icon: Settings, hint: 'Profile, theme, accent and account' },
];

/** The navbar's dropdowns: each groups two related pages. Profile and Settings live in the account menu. */
export interface NavMenu {
  id: 'dashboard' | 'play' | 'progress' | 'studio';
  label: string;
  items: TabId[];
  adminOnly?: boolean;
}

export const NAV_MENUS: NavMenu[] = [
  { id: 'dashboard', label: 'Dashboard', items: ['overview', 'analytics'] },
  { id: 'play', label: 'Play', items: ['games', 'simulators'] },
  { id: 'progress', label: 'Progress', items: ['leaderboard', 'achievements'] },
  { id: 'studio', label: 'Studio', items: ['creator', 'admin_notifications'], adminOnly: true },
];

/** Which navbar menu a page belongs to (a player profile is reached from the leaderboard). */
export function menuOf(tab: TabId): NavMenu['id'] | null {
  const page = tab === 'playerProfile' ? 'leaderboard' : tab;
  return NAV_MENUS.find((m) => m.items.includes(page))?.id ?? null;
}

const VALID: TabId[] = [...NAV_ITEMS.map((n) => n.id), 'playerProfile'];

/** Restores a tab id, migrating the pre-redesign "arcade" id. Player profiles need an explicit player param. */
export function normalizeTab(raw: string | null, allowPlayer = false): TabId {
  if (raw === 'arcade') return 'games';
  if (raw === 'playerProfile') return allowPlayer ? 'playerProfile' : 'leaderboard';
  return VALID.includes(raw as TabId) ? (raw as TabId) : 'overview';
}

export const TAB_TITLES: Record<TabId, string> = {
  overview: 'Overview',
  games: 'Game Library',
  simulators: 'Simulators',
  leaderboard: 'Leaderboard',
  achievements: 'Achievements',
  analytics: 'Analytics',
  profile: 'Profile',
  settings: 'Settings',
  creator: 'Creator Studio',
  admin_notifications: 'Broadcasts',
  playerProfile: 'Player profile',
};

export const navItem = (id: TabId) => NAV_ITEMS.find((n) => n.id === id);
