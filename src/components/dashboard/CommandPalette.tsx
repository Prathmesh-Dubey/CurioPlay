import { useBackClose } from '@/lib/backStack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CornerDownLeft, FlaskConical, Gamepad2, LogOut, Moon, Search, Sun } from 'lucide-react';
import { type User } from '@/api/api';
import { Kbd, useFocusTrap, useScrollLock } from '@/components/ui/Overlay';
import { Thumb } from '@/components/ui/Thumb';
import { useCatalog, type CatalogItem } from '@/hooks/useCatalog';
import { useTheme } from '@/hooks/useTheme';
import { NAV_ITEMS, type TabId } from './nav';
import { ease, spring } from '@/lib/motion';
import { cn } from '@/lib/utils';

/*
 * ⌘K — the observatory's finder. One input, three kinds of answers: places in the app,
 * exhibits in the collection, and actions (search the library, switch theme, sign out).
 * Fully keyboard driven; the highlight glides between results.
 */

type Result =
  | { kind: 'page'; id: TabId; label: string; hint: string; icon: typeof Search }
  | { kind: 'item'; item: CatalogItem }
  | { kind: 'action'; id: string; label: string; hint: string; icon: typeof Search; run: () => void };

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onNavigate: (tab: TabId) => void;
  onOpenExperience: (id: string, kind: 'game' | 'simulator') => void;
  onSearchLibrary: (query: string) => void;
  onLogout: () => void;
}

function matches(text: string, q: string) {
  return text.toLowerCase().includes(q);
}

export function CommandPalette({ open, onClose, user, onNavigate, onOpenExperience, onSearchLibrary, onLogout }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { games, simulators } = useCatalog();
  const { isDark, toggle } = useTheme();
  useFocusTrap(panelRef, open);
  useScrollLock(open);
  useBackClose(open, onClose);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages: Result[] = NAV_ITEMS.filter((n) => !n.adminOnly || user.role === 'ADMIN')
      .filter((n) => !q || matches(n.label, q) || matches(n.hint, q))
      .map((n) => ({ kind: 'page', id: n.id, label: n.label, hint: n.hint, icon: n.icon }));
    const items: Result[] = q
      ? [...games, ...simulators]
          .filter((i) => matches(i.title, q) || matches(i.category ?? '', q))
          .slice(0, 8)
          .map((item) => ({ kind: 'item', item }))
      : [];
    const actions: Result[] = [
      ...(q
        ? [
            {
              kind: 'action' as const,
              id: 'search',
              label: `Search the library for “${query.trim()}”`,
              hint: 'Filter games by title or description',
              icon: Search,
              run: () => onSearchLibrary(query.trim()),
            },
          ]
        : []),
      {
        kind: 'action' as const,
        id: 'theme',
        label: isDark ? 'Switch to light theme' : 'Switch to dark theme',
        hint: 'Appearance',
        icon: isDark ? Sun : Moon,
        run: toggle,
      },
      { kind: 'action' as const, id: 'logout', label: 'Sign out', hint: 'End this session', icon: LogOut, run: onLogout },
    ].filter((a) => !q || a.id === 'search' || matches(a.label, q));
    return [
      { title: 'Exhibits', results: items },
      { title: 'Go to', results: pages },
      { title: 'Actions', results: actions },
    ].filter((g) => g.results.length > 0);
  }, [query, games, simulators, user.role, isDark, toggle, onLogout, onSearchLibrary]);

  const flat = groups.flatMap((g) => g.results);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    if (r.kind === 'page') onNavigate(r.id);
    else if (r.kind === 'item') onOpenExperience(r.item.id, r.item.kind);
    else r.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(flat[active]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  let index = -1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[115] flex items-start justify-center px-3 pt-[12vh] sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          <div className="absolute inset-0 bg-navy/45 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ duration: 0.28, ease: ease.out }}
            onKeyDown={onKeyDown}
            className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-line bg-surface shadow-float"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search className="size-5 shrink-0 text-ink-faint" />
              <input
                data-autofocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, games, simulators…"
                aria-label="Search"
                aria-controls="cmdk-list"
                aria-activedescendant={flat.length ? `cmdk-${active}` : undefined}
                role="combobox"
                aria-expanded="true"
                className="h-16 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint focus-visible:shadow-none"
              />
              <Kbd>Esc</Kbd>
            </div>

            <ul id="cmdk-list" ref={listRef} role="listbox" className="flex-1 overflow-y-auto p-2">
              {flat.length === 0 && (
                <li className="px-4 py-12 text-center text-sm text-ink-muted">Nothing matches “{query}”. Try a game title or a page name.</li>
              )}
              {groups.map((g) => (
                <li key={g.title} role="presentation" className="mb-1">
                  <p className="label-mono px-3 pb-1.5 pt-3 text-ink-faint">{g.title}</p>
                  <ul role="presentation">
                    {g.results.map((r) => {
                      index += 1;
                      const i = index;
                      const on = i === active;
                      const Icon = r.kind === 'item' ? (r.item.kind === 'game' ? Gamepad2 : FlaskConical) : r.icon;
                      const label = r.kind === 'item' ? r.item.title : r.label;
                      const hint = r.kind === 'item' ? `${r.item.kind === 'game' ? 'Game' : 'Simulator'} · ${r.item.category ?? 'General'}` : r.hint;
                      return (
                        <li
                          key={`${r.kind}-${label}`}
                          id={`cmdk-${i}`}
                          data-index={i}
                          role="option"
                          aria-selected={on}
                          onPointerMove={() => setActive(i)}
                          onClick={() => run(r)}
                          className="relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                        >
                          {on && <motion.span layoutId="cmdk-hl" transition={spring.snappy} className="absolute inset-0 rounded-xl bg-surface-2" />}
                          <span
                            className={cn(
                              'relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg',
                              r.kind === 'item' ? 'bg-navy text-night-sage' : 'bg-brand-soft text-brand-strong',
                            )}
                          >
                            <Thumb
                              src={r.kind === 'item' ? r.item.thumbnail : null}
                              className="size-full object-cover"
                              fallback={<Icon className="size-4" />}
                            />
                          </span>
                          <span className="relative min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{label}</span>
                            <span className="block truncate text-xs text-ink-faint">{hint}</span>
                          </span>
                          {on ? (
                            <CornerDownLeft className="relative size-4 text-ink-faint" />
                          ) : (
                            <ArrowRight className="relative size-4 text-transparent" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4 border-t border-line bg-surface-2/50 px-5 py-2.5 text-xs text-ink-faint">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd> open
              </span>
              <span className="ml-auto label-mono">CurioPlay finder</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
