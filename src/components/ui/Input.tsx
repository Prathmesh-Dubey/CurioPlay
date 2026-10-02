import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';

/** Shared field chrome: label, hint and an animated error line. */
function FieldShell({
  id,
  label,
  hint,
  error,
  children,
  optional,
}: {
  id: string;
  label?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-[13px] font-semibold text-ink">
          <span>{label}</span>
          {optional && <span className="label-mono text-ink-faint">Optional</span>}
        </label>
      )}
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="err"
            id={`${id}-err`}
            role="alert"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2, ease: ease.out }}
            className="text-xs font-medium text-red-600 dark:text-red-400"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" id={`${id}-hint`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-ink-faint">
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const shellBox =
  'group flex items-center gap-2.5 rounded-xl border bg-surface px-3.5 transition-[border-color,box-shadow,background-color] duration-200 ' +
  'focus-within:border-brand focus-within:shadow-[var(--cp-ring)] has-[:disabled]:opacity-55 has-[:disabled]:cursor-not-allowed';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Visual size of the control. */
  inputSize?: 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, optional, leading, trailing, className, id, inputSize = 'lg', ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      <motion.div
        animate={error ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          shellBox,
          inputSize === 'lg' ? 'h-12' : 'h-10',
          error ? 'border-red-500/80' : 'border-line-strong hover:border-brand/50',
        )}
      >
        {leading && <span className="text-ink-faint transition-colors group-focus-within:text-brand-strong">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint focus-visible:shadow-none disabled:cursor-not-allowed',
            className,
          )}
          {...rest}
        />
        {trailing}
      </motion.div>
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  /** Shows a live character counter when maxLength is set. */
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, optional, className, id, showCount, maxLength, value, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  const length = typeof value === 'string' ? value.length : 0;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} optional={optional}>
      <div
        className={cn(
          'relative rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200 focus-within:border-brand focus-within:shadow-[var(--cp-ring)]',
          error ? 'border-red-500/80' : 'border-line-strong hover:border-brand/50',
        )}
      >
        <textarea
          ref={ref}
          id={fieldId}
          value={value}
          maxLength={maxLength}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined}
          className={cn(
            'block min-h-28 w-full resize-y rounded-xl bg-transparent px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus-visible:shadow-none',
            className,
          )}
          {...rest}
        />
        {showCount && maxLength && (
          <span className="pointer-events-none absolute bottom-2 right-3 label-mono text-ink-faint">
            {length}/{maxLength}
          </span>
        )}
      </div>
    </FieldShell>
  );
});
