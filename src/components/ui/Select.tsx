import { useBackClose } from '@/lib/backStack';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { useAnchor, useOutside } from '@/lib/useAnchor';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  label?: string;
  /** Visually hidden label when no visible label is wanted. */
  ariaLabel?: string;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  /** Icon shown before the selected label. */
  leading?: ReactNode;
}

/** Accessible custom listbox: keyboard navigation, type-ahead, flips to stay on screen. */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  placeholder = 'Select…',
  size = 'md',
  className,
  disabled,
  leading,
}: SelectProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  useBackClose(open, () => setOpen(false));
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const pos = useAnchor(triggerRef, listRef, open, 'bottom-start');
  const selected = options.find((o) => o.value === value);
  const refs = useMemo(() => [triggerRef, listRef], []);

  const close = useCallback(() => setOpen(false), []);
  useOutside(refs, close, open);

  useEffect(() => {
    if (open) setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (i: number) => {
    const o = options[i];
    if (!o) return;
    onChange(o.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    } else if (e.key.length === 1) {
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at > 600 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
      t.at = now;
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(t.text));
      if (i >= 0) setActive(i);
    }
  };

  const heights = { sm: 'h-9 text-sm rounded-[10px]', md: 'h-11 text-sm rounded-xl', lg: 'h-12 text-[15px] rounded-xl' };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <span id={`${id}-label`} className="text-[13px] font-semibold text-ink">
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={label ? `${id}-label ${id}-value` : undefined}
        aria-label={!label ? ariaLabel : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          'flex w-full items-center gap-2.5 border border-line-strong bg-surface px-3.5 text-left font-medium text-ink transition-[border-color,box-shadow] duration-200 hover:border-brand/50 disabled:opacity-50',
          open && 'border-brand shadow-[var(--cp-ring)]',
          heights[size],
        )}
      >
        {leading && <span className="text-ink-faint">{leading}</span>}
        {selected?.icon && <span className="text-ink-muted">{selected.icon}</span>}
        <span id={`${id}-value`} className={cn('min-w-0 flex-1 truncate', !selected && 'text-ink-faint')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-ink-faint transition-transform duration-300', open && 'rotate-180')} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.ul
              ref={listRef}
              id={`${id}-list`}
              role="listbox"
              tabIndex={-1}
              aria-activedescendant={`${id}-opt-${active}`}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
              transition={{ duration: 0.22, ease: ease.out }}
              style={{
                position: 'fixed',
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                minWidth: pos?.anchorWidth,
                transformOrigin: pos?.placement.startsWith('top') ? 'bottom' : 'top',
              }}
              className="z-[120] max-h-72 max-w-[min(92vw,24rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-float"
            >
              {options.map((o, i) => {
                const isSel = o.value === value;
                return (
                  <li
                    key={o.value}
                    id={`${id}-opt-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSel}
                    onPointerMove={() => setActive(i)}
                    onClick={() => choose(i)}
                    className="relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink"
                  >
                    {i === active && (
                      <motion.span
                        layoutId={`${id}-hl`}
                        className="absolute inset-0 rounded-xl bg-surface-2"
                        transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                      />
                    )}
                    {o.icon && <span className="relative text-ink-muted">{o.icon}</span>}
                    <span className="relative min-w-0 flex-1">
                      <span className={cn('block truncate', isSel && 'font-semibold')}>{o.label}</span>
                      {o.description && <span className="block truncate text-xs text-ink-faint">{o.description}</span>}
                    </span>
                    {isSel && <Check className="relative size-4 shrink-0 text-brand-strong" />}
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
