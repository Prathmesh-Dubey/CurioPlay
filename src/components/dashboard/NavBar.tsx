/*
 * The dashboard's only navigation: one bar across the top.
 * Four dropdowns, each pairing two related pages — Dashboard (Overview, Analytics), Play (Games, Simulators),
 * Progress (Leaderboard, Achievements) and, for admins only, Studio (Creator Studio, Broadcasts). On the right:
 * the finder, notifications, and the account menu (Profile, Settings, theme, Sign out). Below md the four
 * dropdowns move to the floating bottom dock (MobileDock); the right-hand controls stay up here.
 */
import { useState, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, LogOut, Moon, Search, Settings, Sun, User as UserIcon } from 'lucide-react';
import { type User } from '@/api/api';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { Kbd, Menu, Popover } from '@/components/ui/Overlay';
import { useTheme } from '@/hooks/useTheme';
import { spring } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { NotificationsPopover } from './NotificationsPopover';
import { NAV_MENUS, menuOf, navItem, type NavItem, type NavMenu, type TabId } from './nav';

interface NavBarProps {
  user: User;
  active: TabId;
  onNavigate: (tab: TabId) => void;
  onOpenPalette: () => void;
  onLogout: () => void;
  onPrefetch?: (tab: TabId) => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function NavBar({ user, active, onNavigate, onOpenPalette, onLogout, onPrefetch }: NavBarProps) {
  const { isDark, toggle } = useTheme();
  const isAdmin = user.role === 'ADMIN';
  const menus = NAV_MENUS.filter((m) => !m.adminOnly || isAdmin);
  const activeMenu = menuOf(active);
  const accountActive = active === 'profile' || active === 'settings';

  const itemsOf = (m: NavMenu) => m.items.map(navItem).filter((n): n is NavItem => !!n && (!n.adminOnly || isAdmin));

  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
      {/* Three columns from md up: logo | menus (true centre) | actions. Phones keep a simple row. */}
      <div className="page-wrap flex h-16 items-center gap-2 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
        <button type="button" onClick={() => onNavigate('overview')} aria-label="CurioPlay overview" className="shrink-0 justify-self-start rounded-lg">
          <Logo />
        </button>

        {/* Dropdowns (md and up) */}
        <nav aria-label="Primary" className="hidden items-center gap-0.5 justify-self-center md:flex lg:gap-1">
          {menus.map((m) => (
            <NavDropdown
              key={m.id}
              menu={m}
              items={itemsOf(m)}
              current={active}
              isActive={activeMenu === m.id}
              onNavigate={onNavigate}
              onPrefetch={onPrefetch}
            />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 justify-self-end md:ml-0">
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Search games, simulators and pages"
            className="group hidden h-10 items-center gap-2.5 rounded-xl border border-line bg-surface pl-3 pr-2 text-sm text-ink-faint transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-soft xl:flex"
          >
            <Search className="size-4 transition-colors group-hover:text-brand-strong" />
            <span className="w-40 text-left">Search</span>
            <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd className="-ml-1.5">K</Kbd>
          </button>
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Search"
            className="grid size-10 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink xl:hidden"
          >
            <Search className="size-[18px]" />
          </button>

          <NotificationsPopover />

          <Menu
            label="Account"
            header={
              <div className="flex items-center gap-3">
                <Avatar url={user.avatarUrl} seed={user.avatarSeed} name={user.username} className="size-10" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{user.username}</p>
                  <p className="truncate text-xs text-ink-faint">{user.email}</p>
                </div>
              </div>
            }
            groups={[
              [
                { label: 'Profile', icon: <UserIcon className="size-4" />, onSelect: () => onNavigate('profile') },
                { label: 'Settings', icon: <Settings className="size-4" />, onSelect: () => onNavigate('settings') },
                {
                  label: isDark ? 'Light theme' : 'Dark theme',
                  icon: isDark ? <Sun className="size-4" /> : <Moon className="size-4" />,
                  onSelect: toggle,
                },
              ],
              [{ label: 'Sign out', icon: <LogOut className="size-4" />, onSelect: onLogout, danger: true }],
            ]}
            trigger={
              <button type="button" aria-label="Account menu" className="ml-1 rounded-full transition-transform active:scale-95">
                <Avatar
                  url={user.avatarUrl}
                  seed={user.avatarSeed}
                  name={user.username}
                  className={cn(
                    'size-9 ring-2 transition-[box-shadow]',
                    accountActive ? 'ring-brand' : 'ring-transparent hover:ring-brand/30',
                  )}
                />
              </button>
            }
          />

        </div>
      </div>

    </header>
  );
}

/* ---------- pieces ---------- */

function NavDropdown({
  menu,
  items,
  current,
  isActive,
  onNavigate,
  onPrefetch,
}: {
  menu: NavMenu;
  items: NavItem[];
  current: TabId;
  isActive: boolean;
  onNavigate: (tab: TabId) => void;
  onPrefetch?: (tab: TabId) => void;
}) {
  const [open, setOpen] = useState(false);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const rows = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const i = rows.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % rows.length : (i <= 0 ? rows.length : i) - 1;
    rows[next]?.focus();
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-start"
      role="menu"
      label={menu.label}
      className="w-[19rem]"
      trigger={
        <button
          type="button"
          className={cn(
            'relative inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors',
            isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
            open ? 'bg-surface-2 text-ink' : 'hover:bg-surface-2/70',
          )}
        >
          {menu.label}
          <ChevronDown className={cn('size-4 text-ink-faint transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
          {isActive && (
            <motion.span
              layoutId="navbar-active"
              transition={spring.snappy}
              aria-hidden="true"
              className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand"
            />
          )}
        </button>
      }
    >
      {(close) => (
        <div
          onKeyDown={onKeyDown}
          ref={(node) => {
            // Focus the first destination when the menu opens (not on later re-renders while you're moving through it).
            if (node && !node.contains(document.activeElement)) node.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
          }}
          className="flex flex-col gap-0.5"
        >
          {items.map((item) => (
            <NavLinkRow
              key={item.id}
              item={item}
              current={current}
              role="menuitem"
              onHover={() => onPrefetch?.(item.id)}
              onSelect={() => {
                close();
                onNavigate(item.id);
              }}
            />
          ))}
        </div>
      )}
    </Popover>
  );
}

/** One destination: icon tile, name and a one-line description. The current page is filled with the brand colour. */
export function NavLinkRow({
  item,
  current,
  role,
  onSelect,
  onHover,
}: {
  item: NavItem;
  current: TabId;
  role?: 'menuitem';
  onSelect: () => void;
  onHover?: () => void;
}) {
  const here = current === item.id || (item.id === 'leaderboard' && current === 'playerProfile');
  return (
    <button
      type="button"
      role={role}
      aria-current={here ? 'page' : undefined}
      onClick={onSelect}
      onMouseEnter={onHover}
      onFocus={onHover}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-xl transition-colors',
          here ? 'bg-brand text-white' : 'bg-surface-2 text-ink-muted',
        )}
      >
        <item.icon className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{item.label}</span>
        <span className="block truncate text-[13px] text-ink-faint">{item.hint}</span>
      </span>
    </button>
  );
}
