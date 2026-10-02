import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';

/* ------------------------------- Checkbox ------------------------------- */

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
}

export function Checkbox({ label, description, indeterminate, className, id, checked, ...rest }: CheckboxProps) {
  const auto = useId();
  const cid = id ?? auto;
  const on = !!checked || !!indeterminate;
  return (
    <label htmlFor={cid} className={cn('group inline-flex cursor-pointer items-start gap-3 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50', className)}>
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          id={cid}
          type="checkbox"
          checked={checked}
          aria-checked={indeterminate ? 'mixed' : checked}
          className="peer absolute inset-0 cursor-pointer appearance-none rounded-md border border-line-strong bg-surface transition-colors checked:border-brand checked:bg-brand hover:border-brand/60 focus-visible:shadow-[var(--cp-ring)] disabled:cursor-not-allowed"
          {...rest}
        />
        {indeterminate && <span className="pointer-events-none absolute inset-0 rounded-md bg-brand" />}
        <motion.span
          initial={false}
          animate={{ scale: on ? 1 : 0.4, opacity: on ? 1 : 0 }}
          transition={spring.snappy}
          className="pointer-events-none relative text-white"
        >
          {indeterminate ? <Minus className="size-3.5" strokeWidth={3} /> : <Check className="size-3.5" strokeWidth={3} />}
        </motion.span>
      </span>
      {(label || description) && (
        <span className="leading-tight">
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}

/* --------------------------------- Radio -------------------------------- */

interface RadioGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; description?: ReactNode }[];
  name?: string;
  label?: string;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

export function RadioGroup<T extends string>({ value, onChange, options, name, label, className, orientation = 'vertical' }: RadioGroupProps<T>) {
  const auto = useId();
  const groupName = name ?? auto;
  return (
    <fieldset className={cn('flex flex-col gap-2', className)}>
      {label && <legend className="mb-1 text-[13px] font-semibold text-ink">{label}</legend>}
      <div className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-wrap')}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <label key={o.value} className="group inline-flex cursor-pointer items-start gap-3">
              <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
                <input
                  type="radio"
                  name={groupName}
                  value={o.value}
                  checked={on}
                  onChange={() => onChange(o.value)}
                  className="peer absolute inset-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface transition-colors checked:border-brand hover:border-brand/60 focus-visible:shadow-[var(--cp-ring)]"
                />
                <motion.span
                  initial={false}
                  animate={{ scale: on ? 1 : 0 }}
                  transition={spring.snappy}
                  className="pointer-events-none relative size-2.5 rounded-full bg-brand"
                />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-medium text-ink">{o.label}</span>
                {o.description && <span className="mt-0.5 block text-xs text-ink-muted">{o.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* --------------------------------- Switch ------------------------------- */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  /** Accessible name when no visible label is rendered. */
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function Switch({ checked, onChange, label, description, disabled, ariaLabel, className, size = 'md' }: SwitchProps) {
  const id = useId();
  const track = size === 'md' ? 'h-6 w-11' : 'h-5 w-9';
  const knob = size === 'md' ? 'size-5' : 'size-4';
  const button = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={!label ? ariaLabel : undefined}
      aria-labelledby={label ? `${id}-l` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50',
        track,
        checked ? 'justify-end bg-brand' : 'justify-start bg-line-strong',
      )}
    >
      <motion.span layout transition={spring.snappy} className={cn('rounded-full bg-white shadow-soft', knob)} />
    </button>
  );
  if (!label && !description) return <span className={className}>{button}</span>;
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <span className="min-w-0">
        {label && (
          <label id={`${id}-l`} htmlFor={id} className="block cursor-pointer text-sm font-semibold text-ink">
            {label}
          </label>
        )}
        {description && <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>}
      </span>
      {button}
    </div>
  );
}
