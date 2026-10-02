import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, Gamepad2, LayoutGrid, Trophy, Wand2, type LucideIcon } from 'lucide-react';
import type { User } from '@/api/api';
import { useBackClose } from '@/lib/backStack';
import { spring } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { NavLinkRow } from './NavBar';
import { NAV_MENUS, menuOf, navItem, type NavItem, type NavMenu, type TabId } from './nav';

const MENU_ICONS: Record<NavMenu['id'], LucideIcon> = {
  dashboard: LayoutGrid,
  play: Gamepad2,
  progress: Trophy,
  studio: Wand2,
};

/**
 * Phones only: the desktop navbar, moved to a floating bar at the bottom.
 * Same four groups — Dashboard, Play, Progress and (admins) Studio — and tapping one opens its pages
 * in a panel above the bar, exactly like the desktop dropdowns. Profile, Settings, theme and sign-out
 * stay in the avatar menu at the top.
 */
export function MobileDock({ user, active, onNavigate }: { user: User; active: TabId; onNavigate: (tab: TabId) => void }) {
  const isAdmin = user.role === 'ADMIN';
  const menus = NAV_MENUS.filter((m) => !m.adminOnly || isAdmin);
  const itemsOf = (m: NavMenu) => m.items.map(navItem).filter((n): n is NavItem => !!n && (!n.adminOnly || isAdmin));
  const current = menuOf(active);

  const [open, setOpen] = useState<NavMenu['id'] | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const openMenu = menus.find((m) => m.id === open);
  useBackClose(!!open, () => setOpen(null));

  // Close on outside tap, Escape, or when the page changes.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  useEffect(() => setOpen(null), [active]);

  return (
    <>
      {/* Dim the page while a panel is open, so it reads as a menu. */}
      <AnimatePresence>
        {open && (
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-navy/25 backdrop-blur-[2px] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <motion.nav
        ref={rootRef}
        aria-label="Primary"
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring.soft, delay: 0.15 }}
        className="fixed inset-x-3 z-40 md:hidden"
        style={{ bottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        {/* The open group's pages, rising out of the bar. */}
        <AnimatePresence>
          {openMenu && (
            <motion.div
              key={openMenu.id}
              id={`dock-panel-${openMenu.id}`}
              role="menu"
              aria-label={openMenu.label}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={spring.snappy}
              style={{ transformOrigin: 'bottom center' }}
              className="absolute inset-x-0 bottom-full mb-2.5 rounded-[22px] border border-line bg-surface p-2 shadow-[0_24px_50px_-18px_rgb(4_20_39/0.55)]"
            >
              <p className="label-mono px-2.5 pb-1.5 pt-1 text-ink-faint">{openMenu.label}</p>
              <div className="flex flex-col gap-0.5">
                {itemsOf(openMenu).map((item) => (
                  <NavLinkRow
                    key={item.id}
                    item={item}
                    current={active}
                    role="menuitem"
                    onSelect={() => {
                      setOpen(null);
                      onNavigate(item.id);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ul
          className="grid rounded-[22px] border border-line bg-surface/85 p-1.5 shadow-[0_18px_40px_-14px_rgb(4_20_39/0.45)] backdrop-blur-xl"
          style={{ gridTemplateColumns: `repeat(${menus.length}, minmax(0, 1fr))` }}
        >
          {menus.map((m) => {
            const Icon = MENU_ICONS[m.id];
            const here = current === m.id;
            const isOpen = open === m.id;
            return (
              <li key={m.id}>
                <motion.button
                  type="button"
                  onClick={() => setOpen((o) => (o === m.id ? null : m.id))}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? `dock-panel-${m.id}` : undefined}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    'relative flex h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition-colors',
                    here || isOpen ? 'text-brand-strong' : 'text-ink-muted active:text-ink',
                  )}
                >
                  {here && (
                    <motion.span
                      layoutId="mobile-dock-active"
                      transition={spring.snappy}
                      aria-hidden="true"
                      className="absolute inset-x-1 inset-y-0.5 rounded-2xl bg-brand-soft"
                    />
                  )}
                  <motion.span className="relative" animate={here ? { y: -1, scale: 1.12 } : { y: 0, scale: 1 }} transition={spring.snappy}>
                    <Icon className="size-5" strokeWidth={here ? 2.3 : 1.9} />
                  </motion.span>
                  <span className="relative flex items-center gap-0.5 leading-none">
                    {m.label}
                    <ChevronUp className={cn('size-3 transition-transform duration-200', isOpen ? 'rotate-0' : 'rotate-180 opacity-60')} aria-hidden="true" />
                  </span>
                </motion.button>
              </li>
            );
          })}
        </ul>
      </motion.nav>
    </>
  );
}
