import { useBackClose } from '@/lib/backStack';
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ease, spring } from '@/lib/motion';
import { useAnchor, useOutside, type Placement } from '@/lib/useAnchor';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Traps Tab focus inside `ref` while active and restores focus on close. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [ref, active]);
}

let lockCount = 0;
/** Locks body scroll while any overlay is open (ref-counted). */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = prev;
    };
  }, [active]);
}

function useEscape(active: boolean, onEscape: () => void) {
  // Android back / edge-swipe closes the same layers Escape does.
  useBackClose(active, onEscape);
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onEscape();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onEscape]);
}

/* ------------------------------------------------------------------ */
/* Popover                                                              */
/* ------------------------------------------------------------------ */

interface PopoverProps {
  /** A single element (button) that toggles the popover. */
  trigger: ReactElement<Record<string, unknown>>;
  children: ReactNode | ((close: () => void) => ReactNode);
  placement?: Placement;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** ARIA role of the floating panel. */
  role?: 'dialog' | 'menu';
  label?: string;
}

export function Popover({ trigger, children, placement = 'bottom-end', className, open: controlled, onOpenChange, role = 'dialog', label }: PopoverProps) {
  const [internal, setInternal] = useState(false);
  const open = controlled ?? internal;
  const setOpen = useCallback(
    (v: boolean) => {
      if (controlled === undefined) setInternal(v);
      onOpenChange?.(v);
    },
    [controlled, onOpenChange],
  );
  const id = useId();
  const anchorRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = useAnchor(anchorRef, panelRef, open, placement);
  const refs = useMemo(() => [anchorRef, panelRef], []);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useOutside(refs, close, open);
  useEscape(open, close);

  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger, {
        ref: anchorRef,
        'aria-expanded': open,
        'aria-haspopup': role,
        'aria-controls': id,
        onClick: (e: React.MouseEvent) => {
          (trigger.props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
          setOpen(!open);
        },
      })
    : trigger;

  return (
    <>
      {triggerEl}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              id={id}
              role={role}
              aria-label={label}
              initial={{ opacity: 0, scale: 0.96, y: pos?.placement.startsWith('top') ? 6 : -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
              transition={{ duration: 0.24, ease: ease.out }}
              style={{
                position: 'fixed',
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                transformOrigin: `${pos?.placement.startsWith('top') ? 'bottom' : 'top'} ${pos?.placement.endsWith('end') ? 'right' : 'left'}`,
              }}
              className={cn('z-[120] rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-float', className)}
            >
              {typeof children === 'function' ? children(close) : children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Menu (dropdown)                                                      */
/* ------------------------------------------------------------------ */

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MenuProps {
  trigger: ReactElement<Record<string, unknown>>;
  /** Groups of items; groups are separated by hairlines. */
  groups: MenuItem[][];
  header?: ReactNode;
  placement?: Placement;
  label?: string;
  className?: string;
}

export function Menu({ trigger, groups, header, placement = 'bottom-end', label = 'Menu', className }: MenuProps) {
  const flat = groups.flat();
  const [active, setActive] = useState(-1);
  const listId = useId();

  return (
    <Popover trigger={trigger} placement={placement} role="menu" label={label} className={cn('w-64', className)}>
      {(close) => (
        <div
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => (a + 1) % flat.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => (a <= 0 ? flat.length - 1 : a - 1));
            }
          }}
          ref={(node) => {
            // focus the first item when the menu opens
            if (node && active === -1) node.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
          }}
        >
          {header && <div className="border-b border-line px-3 pb-3 pt-2">{header}</div>}
          {groups.map((group, gi) => (
            <div key={gi} className={cn('py-1', gi > 0 && 'border-t border-line')} role="group">
              {group.map((item) => {
                const index = flat.indexOf(item);
                return (
                  <button
                    key={item.label}
                    id={`${listId}-${index}`}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    ref={(el) => {
                      if (el && index === active) el.focus();
                    }}
                    onClick={() => {
                      close();
                      item.onSelect();
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium outline-none transition-colors focus-visible:shadow-none disabled:opacity-40',
                      item.danger
                        ? 'text-red-600 hover:bg-red-500/10 focus:bg-red-500/10 dark:text-red-400'
                        : 'text-ink hover:bg-surface-2 focus:bg-surface-2',
                    )}
                  >
                    {item.icon && <span className={cn('shrink-0', item.danger ? '' : 'text-ink-muted')}>{item.icon}</span>}
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Popover>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong bg-surface-2 px-1.5 font-mono text-[10px] font-semibold text-ink-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip                                                              */
/* ------------------------------------------------------------------ */

interface TooltipProps {
  content: ReactNode;
  children: ReactElement<Record<string, unknown>>;
  placement?: Placement;
  /** Disable (e.g. when the label is already visible). */
  disabled?: boolean;
  delay?: number;
}

export function Tooltip({ content, children, placement = 'top', disabled, delay = 350 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const anchorRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const pos = useAnchor(anchorRef, tipRef, open, placement);

  const show = () => {
    if (disabled) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const child = cloneElement(children, {
    ref: anchorRef,
    'aria-describedby': open ? id : undefined,
    onPointerEnter: show,
    onPointerLeave: hide,
    onFocus: show,
    onBlur: hide,
  });

  return (
    <>
      {child}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={tipRef}
              id={id}
              role="tooltip"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.16, ease: ease.out }}
              style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
              className="pointer-events-none z-[130] max-w-64 rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-white shadow-float"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                               */
/* ------------------------------------------------------------------ */

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Hide the default close button. */
  hideClose?: boolean;
  className?: string;
  /** Extra classes for the scrolling body. */
  bodyClassName?: string;
}

const dialogSizes = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/** Modal dialog. Bottom sheet on phones, centred card on larger screens. */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', hideClose, className, bodyClassName }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(ref, open);
  useScrollLock(open);
  useEscape(open, onClose);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-navy/55 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98, transition: { duration: 0.18 } }}
            transition={spring.soft}
            className={cn(
              'pb-safe relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface shadow-float outline-none sm:rounded-[28px]',
              dialogSizes[size],
              className,
            )}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5 sm:px-7 sm:pt-7">
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className="text-xl font-bold tracking-tight text-ink">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                      {description}
                    </p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-xl text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="size-4.5" />
                  </button>
                )}
              </div>
            )}
            <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2 sm:px-7', bodyClassName)}>{children}</div>
            {footer && (
              <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface px-6 py-4 sm:flex-row sm:justify-end sm:px-7">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Sheet (drawer)                                                       */
/* ------------------------------------------------------------------ */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: 'right' | 'left' | 'bottom';
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, side = 'right', title, children, className }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open);
  useScrollLock(open);
  useEscape(open, onClose);

  const from = side === 'right' ? { x: '100%' } : side === 'left' ? { x: '-100%' } : { y: '100%' };
  const position =
    side === 'right'
      ? 'right-0 top-0 h-full w-[min(92vw,26rem)] border-l'
      : side === 'left'
        ? 'left-0 top-0 h-full w-[min(88vw,22rem)] border-r'
        : 'bottom-0 left-0 w-full max-h-[90dvh] rounded-t-[28px] border-t';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[110]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={from}
            animate={{ x: 0, y: 0 }}
            exit={from}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className={cn('pt-safe pb-safe absolute flex flex-col overflow-hidden border-line bg-surface shadow-float outline-none', position, className)}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 id={titleId} className="text-base font-bold text-ink">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close panel"
                  className="grid size-9 place-items-center rounded-xl text-ink-faint hover:bg-surface-2 hover:text-ink"
                >
                  <X className="size-4.5" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
