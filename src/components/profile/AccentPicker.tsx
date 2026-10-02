import { useId, useRef, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { Check, Pipette, RotateCcw } from 'lucide-react';
import { spring } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const ACCENT_SWATCHES: { name: string; value: string }[] = [
  { name: 'Blue', value: '#2563eb' },
  { name: 'Rose', value: '#c4838f' },
  { name: 'Sky', value: '#8bcbff' },
  { name: 'Indigo', value: '#676fa2' },
  { name: 'Teal', value: '#3f8f9b' },
  { name: 'Terracotta', value: '#c27a5c' },
  { name: 'Plum', value: '#8b6a8e' },
  { name: 'Navy', value: '#2f4468' },
];

interface AccentPickerProps {
  /** Current colour, empty/null = default. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  /** Show a "Selected · name" readout under the swatches (off where the host renders its own). */
  showReadout?: boolean;
}

/**
 * Curated brand-compatible swatches + custom colour + reset.
 * Radiogroup with roving focus (arrow keys) and a shared-layout selection ring.
 */
export function AccentPicker({ value, onChange, disabled, showReadout }: AccentPickerProps) {
  const uid = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const current = (value || '').toLowerCase();
  const activeIndex = ACCENT_SWATCHES.findIndex((s) => s.value.toLowerCase() === current);
  const isCustom = !!current && activeIndex === -1;
  const activeName = isCustom ? `Custom ${current}` : activeIndex >= 0 ? ACCENT_SWATCHES[activeIndex].name : 'Default';

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys) || disabled) return;
    e.preventDefault();
    const from = activeIndex >= 0 ? activeIndex : 0;
    const next = (from + keys[e.key] + ACCENT_SWATCHES.length) % ACCENT_SWATCHES.length;
    onChange(ACCENT_SWATCHES[next].value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          ref={groupRef}
          role="radiogroup"
          aria-label="Accent colour"
          onKeyDown={onKeyDown}
          className="flex flex-wrap items-center gap-1.5"
        >
          {ACCENT_SWATCHES.map((s, i) => {
            const active = i === activeIndex;
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={s.name}
                title={s.name}
                tabIndex={active || (activeIndex === -1 && i === 0) ? 0 : -1}
                disabled={disabled}
                onClick={() => onChange(s.value)}
                className="relative grid size-11 place-items-center rounded-full transition-transform duration-200 ease-out-expo hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
              >
                {active && (
                  <motion.span
                    layoutId={`${uid}-ring`}
                    transition={spring.snappy}
                    className="absolute inset-0 rounded-full border-2 border-ink"
                    aria-hidden="true"
                  />
                )}
                <span
                  className="grid size-8 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]"
                  style={{ backgroundColor: s.value }}
                >
                  {active && <Check className="size-4 text-white" strokeWidth={3} aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>

        <label
          className={cn(
            'relative grid size-11 cursor-pointer place-items-center rounded-full border-2 transition-transform duration-200 ease-out-expo hover:-translate-y-0.5 has-[:focus-visible]:shadow-[var(--cp-ring)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
            isCustom ? 'border-ink' : 'border-dashed border-line-strong',
          )}
          title="Custom colour"
        >
          <span className="sr-only">Custom colour</span>
          <input
            type="color"
            disabled={disabled}
            value={isCustom ? current : '#2563eb'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span
            className="pointer-events-none grid size-8 place-items-center rounded-full"
            style={{
              background: isCustom ? current : 'conic-gradient(from 0deg, #c4838f, #8bcbff, #6f9a8a, #2563eb, #8b6a8e, #c4838f)',
            }}
          >
            {!isCustom && <Pipette className="size-3.5 text-white drop-shadow" aria-hidden="true" />}
            {isCustom && <Check className="size-4 text-white" strokeWidth={3} aria-hidden="true" />}
          </span>
        </label>

        <button
          type="button"
          disabled={disabled || !current}
          onClick={() => onChange(null)}
          className="ml-1 inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> Reset to default
        </button>
      </div>
      {showReadout && (
        <p className="label-mono text-ink-faint" aria-live="polite">
          Selected · <span className="text-ink-muted">{activeName}</span>
        </p>
      )}
    </div>
  );
}
