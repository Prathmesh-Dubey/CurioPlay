import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';

/* Shared password-field pieces: the show/hide toggle and the strength meter. */

export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-pressed={shown}
      className="relative grid size-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={shown ? 'off' : 'on'}
          initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.6, rotate: 30 }}
          transition={{ duration: 0.16 }}
          className="absolute"
        >
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/** Honest strength heuristic (length + variety) — guidance only, not a server rule. */
function strength(pw: string) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export function StrengthMeter({ value }: { value: string }) {
  const s = strength(value);
  const labels = ['Too short', 'Fair', 'Good', 'Strong', 'Excellent'];
  if (!value) return null;
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="h-1 flex-1 rounded-full bg-surface-2"
            animate={{ backgroundColor: i < s ? (s >= 3 ? 'var(--cp-brand)' : 'var(--cp-gold)') : 'var(--cp-surface-2)' }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
      <span className="label-mono w-20 text-right text-ink-faint">{labels[s]}</span>
    </div>
  );
}
