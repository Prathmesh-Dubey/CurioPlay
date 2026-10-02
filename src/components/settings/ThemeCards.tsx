import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * The light palette re-scoped onto a subtree, so the "Light" thumbnail stays light even
 * while the app is dark. Values are the :root tokens from index.css — no new colours.
 * (The dark thumbnail simply sits inside a `.dark` wrapper, which re-scopes the same tokens.)
 */
const LIGHT_SCOPE = {
  '--cp-canvas': '#f5f8fc',
  '--cp-surface': '#ffffff',
  '--cp-surface-2': '#eaf0f8',
  '--cp-line': '#dce4ef',
  '--cp-ink': '#071a2e',
  '--cp-rose-soft': '#e4ebf5',
  '--cp-gold': '#8bcbff',
  '--cp-navy': '#071a2e',
} as CSSProperties;

/** A tiny dashboard drawn entirely with tokens: rail, heading, two cards, a live pill. */
function MiniUI() {
  return (
    <div className="flex size-full bg-canvas" aria-hidden="true">
      <div className="flex w-[24%] flex-col gap-1 border-r border-line bg-surface p-1.5">
        <span className="size-2.5 rounded-[3px] bg-navy" />
        <span className="mt-1.5 h-1 w-full rounded-full bg-brand" />
        <span className="h-1 w-3/4 rounded-full bg-ink/15" />
        <span className="h-1 w-2/3 rounded-full bg-ink/15" />
        <span className="h-1 w-3/4 rounded-full bg-ink/15" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2">
        <span className="h-1.5 w-1/2 rounded-full bg-ink/75" />
        <span className="h-1 w-3/4 rounded-full bg-ink/20" />
        <div className="mt-auto grid grid-cols-2 gap-1">
          <span className="h-5 rounded-[4px] border border-line bg-surface" />
          <span className="relative h-5 rounded-[4px] border border-line bg-rose-soft">
            <span className="absolute right-1 top-1 size-1 rounded-full bg-gold" />
          </span>
        </div>
        <span className="mt-0.5 h-1.5 w-7 rounded-full bg-brand" />
      </div>
    </div>
  );
}

function Thumb({ mode }: { mode: ThemeMode }) {
  if (mode === 'light') {
    return (
      <div className="size-full" style={LIGHT_SCOPE}>
        <MiniUI />
      </div>
    );
  }
  if (mode === 'dark') {
    return (
      <div className="dark size-full">
        <MiniUI />
      </div>
    );
  }
  // System: light and dark meet on a diagonal seam.
  return (
    <div className="relative size-full">
      <div className="absolute inset-0" style={LIGHT_SCOPE}>
        <MiniUI />
      </div>
      <div className="dark absolute inset-0" style={{ clipPath: 'polygon(58% 0, 100% 0, 100% 100%, 42% 100%)' }}>
        <MiniUI />
      </div>
    </div>
  );
}

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

interface ThemeCardsProps {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

/** Three preview cards acting as one radio group; the selection ring is a shared-layout element. */
export function ThemeCards({ value, onChange }: ThemeCardsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = MODES.findIndex((m) => m.id === value);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % MODES.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + MODES.length) % MODES.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = MODES.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(MODES[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Theme" onKeyDown={onKeyDown} className="grid grid-cols-3 gap-3 sm:gap-5">
      {MODES.map((m, i) => {
        const on = m.id === value;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(m.id)}
            className="group relative flex flex-col gap-2.5 rounded-2xl p-1.5 text-left transition-transform duration-300 ease-out-expo hover:-translate-y-0.5 active:scale-[0.97] focus-visible:rounded-2xl"
          >
            {on && (
              <motion.span
                layoutId="settings-theme-ring"
                transition={spring.snappy}
                aria-hidden="true"
                className="absolute inset-0 rounded-2xl border-2 border-brand bg-brand-soft/40"
              />
            )}
            <span
              className={cn(
                'relative block aspect-[4/3] overflow-hidden rounded-xl border transition-[border-color,box-shadow] duration-300',
                on ? 'border-brand/40 shadow-card' : 'border-line group-hover:border-line-strong group-hover:shadow-card',
              )}
            >
              <Thumb mode={m.id} />
            </span>
            <span className="relative flex items-center justify-between gap-1.5 px-1 pb-0.5">
              <span className={cn('flex min-w-0 items-center gap-1.5 text-sm font-semibold', on ? 'text-ink' : 'text-ink-muted group-hover:text-ink')}>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{m.label}</span>
              </span>
              <motion.span
                initial={false}
                animate={{ scale: on ? 1 : 0.4, opacity: on ? 1 : 0 }}
                transition={spring.snappy}
                aria-hidden="true"
                className="hidden size-5 shrink-0 place-items-center rounded-full bg-brand text-white min-[420px]:grid"
              >
                <Check className="size-3" strokeWidth={3} />
              </motion.span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
