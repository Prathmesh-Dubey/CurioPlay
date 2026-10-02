import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Check, Cloud, Monitor, RotateCcw } from 'lucide-react';
import { AccentPicker } from '@/components/profile/AccentPicker';
import { Spinner } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import {
  contrast,
  DEFAULT_PALETTE,
  isHex,
  luminance,
  PALETTE_PRESETS,
  useLocalPalette,
  type LocalColorKey,
  type PaletteKey,
  type PalettePreset,
} from '@/lib/palette';
import { cn } from '@/lib/utils';

const ROWS: { key: PaletteKey; label: string; hint: string }[] = [
  { key: 'background', label: 'Background', hint: 'The page behind everything.' },
  { key: 'text', label: 'Text', hint: 'Headings and body copy. Muted text is mixed from it.' },
  { key: 'primary', label: 'Primary', hint: 'Buttons, links, focus rings and your player card.' },
  { key: 'secondary', label: 'Secondary', hint: 'Soft fills, chips and secondary buttons.' },
  { key: 'accent', label: 'Accent', hint: 'Highlights, medals and small details.' },
];

function Where({ synced }: { synced: boolean }) {
  return synced ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong">
      <Cloud className="size-3" /> Saved to your profile
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
      <Monitor className="size-3" /> This device only
    </span>
  );
}

/** Colour well + hex field. Commits valid hex as you type; the native picker commits as you drag. */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="flex items-center gap-2">
      <label className="relative grid size-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-line-strong shadow-soft transition-transform hover:scale-105">
        <span className="absolute inset-1 rounded-lg" style={{ background: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} colour`}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <input
        value={draft}
        onChange={(e) => {
          const v = e.target.value.trim();
          setDraft(v);
          const hex = v.startsWith('#') ? v : `#${v}`;
          if (isHex(hex)) onChange(hex);
        }}
        onBlur={() => setDraft(value)}
        aria-label={`${label} hex value`}
        spellCheck={false}
        maxLength={7}
        className="h-10 w-[6.5rem] rounded-xl border border-line-strong bg-surface px-3 font-mono text-sm uppercase text-ink outline-none transition-[border-color,box-shadow] hover:border-brand/50 focus:border-brand focus:shadow-[var(--cp-ring)]"
      />
    </div>
  );
}

interface PaletteEditorProps {
  userId: string;
  /** Primary = the profile's accent colour (backend). */
  primary: string | null;
  onPrimaryChange: (value: string | null) => void;
  savingPrimary: boolean;
}

export function PaletteEditor({ userId, primary, onPrimaryChange, savingPrimary }: PaletteEditorProps) {
  const { theme } = useTheme();
  const defaults = DEFAULT_PALETTE[theme];
  const { palette, setColor, setAll, resetAll } = useLocalPalette(userId);

  const effective = (key: PaletteKey): string => {
    if (key === 'primary') return primary || defaults.primary;
    if (key === 'text' && !palette.text && palette.background) {
      // Mirrors applyPalette: text follows a custom background's brightness.
      return luminance(palette.background) < 0.18 ? DEFAULT_PALETTE.dark.text : DEFAULT_PALETTE.light.text;
    }
    return palette[key] || defaults[key];
  };
  const isCustom = (key: PaletteKey) => (key === 'primary' ? !!primary : !!palette[key]);
  const anyCustom = ROWS.some((r) => isCustom(r.key));

  const isActive = (preset: PalettePreset) =>
    preset.id === 'curioplay'
      ? !anyCustom
      : ROWS.every((r) => (r.key === 'primary' ? primary : palette[r.key])?.toLowerCase() === preset.colors[r.key].toLowerCase());

  const applyPreset = (preset: PalettePreset) => {
    if (preset.id === 'curioplay') {
      resetAll();
      if (primary) onPrimaryChange(null);
      return;
    }
    const { primary: p, ...local } = preset.colors;
    setAll(local);
    if ((primary || '').toLowerCase() !== p.toLowerCase()) onPrimaryChange(p);
  };

  // With only one of background/text changed, the other follows the surface brightness (see applyPalette),
  // so compare against what is actually shown.
  const textOnBg = contrast(effective('text'), effective('background'));
  const lowContrast = textOnBg < 4.5;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <h3 className="text-[15px] font-semibold text-ink">Colours</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Make CurioPlay yours. Primary follows you to every device; the others stay on this device. Untouched colours use the CurioPlay
            defaults for the {theme} theme.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetAll();
            if (primary) onPrimaryChange(null);
          }}
          disabled={!anyCustom}
          className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-semibold text-ink-muted transition-colors hover:border-brand/60 hover:text-brand-strong disabled:pointer-events-none disabled:opacity-45"
        >
          <RotateCcw className="size-3.5 transition-transform duration-500 group-hover:-rotate-[360deg]" /> Reset all to default
        </button>
      </div>

      <div className="mt-5">
        <p className="label-mono mb-2.5 text-ink-faint">Themes · one click</p>
        <div role="radiogroup" aria-label="Colour themes" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {PALETTE_PRESETS.map((preset) => {
            const active = isActive(preset);
            const c = preset.colors;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => applyPreset(preset)}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border text-left transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:shadow-card',
                  active ? 'border-brand shadow-[var(--cp-ring)]' : 'border-line hover:border-brand/40',
                )}
              >
                {/* A miniature of the theme: its background, a text line, a primary button, secondary chip and accent dot. */}
                <span className="block p-3" style={{ background: c.background }}>
                  <span className="block h-1.5 w-12 rounded-full" style={{ background: c.text, opacity: 0.85 }} />
                  <span className="mt-1.5 block h-1.5 w-8 rounded-full" style={{ background: c.text, opacity: 0.45 }} />
                  <span className="mt-3 flex items-center gap-1.5">
                    <span className="h-4 w-9 rounded-md transition-transform duration-300 group-hover:scale-110" style={{ background: c.primary }} />
                    <span className="h-4 w-6 rounded-md" style={{ background: c.secondary }} />
                    <span className="size-2.5 rotate-45 rounded-[2px] transition-transform duration-500 group-hover:rotate-[225deg]" style={{ background: c.accent }} />
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 border-t border-line bg-surface px-3 py-2">
                  <span className="truncate text-xs font-semibold text-ink">{preset.name}</span>
                  {active ? (
                    <Check className="size-3.5 shrink-0 text-brand-strong" />
                  ) : preset.id === 'curioplay' ? (
                    <span className="label-mono shrink-0 text-[10px] text-ink-faint">Default</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
        {ROWS.map((row) => {
          const synced = row.key === 'primary';
          const value = effective(row.key);
          return (
            <li key={row.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{row.label}</span>
                  <Where synced={synced} />
                  {!isCustom(row.key) && <span className="label-mono text-ink-faint">Default</span>}
                </div>
                <p className="mt-1 text-sm text-ink-muted">{row.hint}</p>
                {synced && savingPrimary && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-faint" aria-live="polite">
                    <Spinner className="size-3 text-brand" /> Saving to your profile…
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ColorField
                  label={row.label}
                  value={value}
                  onChange={(hex) => (synced ? onPrimaryChange(hex) : setColor(row.key as LocalColorKey, hex))}
                />
                <button
                  type="button"
                  onClick={() => (synced ? onPrimaryChange(null) : setColor(row.key as LocalColorKey, null))}
                  disabled={!isCustom(row.key)}
                  aria-label={`Reset ${row.label.toLowerCase()} to default`}
                  title="Reset to default"
                  className={cn(
                    'grid size-10 place-items-center rounded-xl text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink',
                    'disabled:pointer-events-none disabled:opacity-0',
                  )}
                >
                  <RotateCcw className="size-4" />
                </button>
              </div>
              {synced && (
                <div className="sm:hidden">
                  <AccentPicker value={primary} onChange={onPrimaryChange} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 hidden sm:block">
        <p className="label-mono mb-2 text-ink-faint">Primary presets</p>
        <AccentPicker value={primary} onChange={onPrimaryChange} />
      </div>

      <AnimatePresence>
        {lowContrast && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-start gap-2 overflow-hidden rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-ink"
            role="status"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            Text and background are hard to tell apart (contrast {textOnBg.toFixed(1)}:1). Aim for at least 4.5:1 so everything stays readable.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
