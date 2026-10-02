import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';

/* ---------------------------------- Tabs --------------------------------- */

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** pill = floating pill indicator; underline = editorial underline; segmented = boxed track. */
  variant?: 'pill' | 'underline' | 'segmented';
  label: string;
  className?: string;
  size?: 'sm' | 'md';
  /** Use when the tab strip sits on a night surface. */
  night?: boolean;
}

/** Accessible tab strip with a shared-layout indicator and arrow-key navigation. */
export function Tabs<T extends string>({ items, value, onChange, variant = 'pill', label, className, size = 'md', night }: TabsProps<T>) {
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.value === value);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % items.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(items[next].value);
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }
  };

  const track = {
    pill: '',
    underline: cn('gap-6 border-b', night ? 'border-white/15' : 'border-line'),
    segmented: cn('rounded-full p-1', night ? 'bg-white/10' : 'bg-surface-2'),
  }[variant];

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('relative flex max-w-full items-center overflow-x-auto scrollbar-none', variant !== 'underline' && 'gap-1', track, className)}
    >
      {items.map((t) => {
        const on = t.value === value;
        const pad = variant === 'underline' ? 'px-0.5 pb-3 pt-1' : size === 'sm' ? 'h-8 px-3' : 'h-10 px-4';
        const tone = night
          ? on
            ? variant === 'underline'
              ? 'text-white'
              : 'text-navy'
            : 'text-white/60 hover:text-white'
          : on
            ? variant === 'pill'
              ? 'text-white'
              : 'text-ink'
            : 'text-ink-muted hover:text-ink';
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors duration-200',
              pad,
              tone,
              variant === 'pill' && !on && (night ? 'hover:bg-white/10' : 'hover:bg-surface-2'),
            )}
          >
            {on && variant !== 'underline' && (
              <motion.span
                layoutId={`${id}-ind`}
                transition={spring.snappy}
                className={cn(
                  'absolute inset-0 rounded-full',
                  night ? 'bg-white' : variant === 'pill' ? 'bg-brand' : 'bg-surface shadow-soft',
                )}
              />
            )}
            {on && variant === 'underline' && (
              <motion.span
                layoutId={`${id}-ind`}
                transition={spring.snappy}
                className={cn('absolute inset-x-0 -bottom-px h-0.5 rounded-full', night ? 'bg-night-sage' : 'bg-brand')}
              />
            )}
            {t.icon && <span className="relative">{t.icon}</span>}
            <span className="relative">{t.label}</span>
            {t.count !== undefined && (
              <span
                className={cn(
                  'relative rounded-full px-1.5 font-mono text-[10px] leading-4',
                  on ? (variant === 'pill' && !night ? 'bg-white/20' : 'bg-surface-2 text-ink-muted') : 'bg-surface-2 text-ink-faint',
                  night && !on && 'bg-white/10 text-white/60',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------- Breadcrumbs ------------------------------ */

export interface Crumb {
  label: string;
  onClick?: () => void;
}

export function Breadcrumbs({ items, className, night }: { items: Crumb[]; className?: string; night?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className={cn('flex min-w-0 items-center gap-1.5', last && 'min-w-0')}>
              {c.onClick && !last ? (
                <button
                  type="button"
                  onClick={c.onClick}
                  className={cn(
                    'shrink-0 rounded-md font-medium transition-colors',
                    night ? 'text-white/55 hover:text-white' : 'text-ink-faint hover:text-ink',
                  )}
                >
                  {c.label}
                </button>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={cn('truncate font-semibold', night ? 'text-white' : 'text-ink')}
                >
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight className={cn('size-3.5 shrink-0', night ? 'text-white/30' : 'text-ink-faint')} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* -------------------------------- Pagination ------------------------------ */

function pageList(page: number, count: number): (number | '…')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(count - 1, page + 1);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < count - 1) out.push('…');
  out.push(count);
  return out;
}

export function Pagination({ page, pageCount, onChange, className }: { page: number; pageCount: number; onChange: (p: number) => void; className?: string }) {
  const id = useId();
  if (pageCount <= 1) return null;
  const btn = 'grid size-9 place-items-center rounded-xl text-sm font-semibold transition-colors disabled:opacity-35';
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1', className)}>
      <button type="button" className={cn(btn, 'text-ink-muted hover:bg-surface-2')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft className="size-4" />
      </button>
      {pageList(page, pageCount).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="w-6 text-center text-ink-faint">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(btn, 'relative', p === page ? 'text-white' : 'text-ink-muted hover:bg-surface-2')}
          >
            {p === page && <motion.span layoutId={`${id}-pg`} transition={spring.snappy} className="absolute inset-0 rounded-xl bg-brand" />}
            <span className="relative tabular-nums">{p}</span>
          </button>
        ),
      )}
      <button type="button" className={cn(btn, 'text-ink-muted hover:bg-surface-2')} disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
