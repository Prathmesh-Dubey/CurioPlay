import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link' | 'night' | 'night-outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon' | 'icon-lg';

const base =
  'group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold ' +
  'transition-[transform,translate,scale,rotate,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out-expo ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 ' +
  // icons inside buttons nudge on hover for a deliberate micro-interaction
  '[&_[data-icon=trailing]]:transition-transform [&_[data-icon=trailing]]:duration-300 hover:[&_[data-icon=trailing]]:translate-x-0.5 ' +
  '[&_[data-icon=leading]]:transition-transform [&_[data-icon=leading]]:duration-300';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(4_20_39/0.2)] hover:bg-brand-strong hover:shadow-card',
  secondary: 'bg-rose-soft text-brand-strong hover:bg-rose/45',
  outline: 'border border-line-strong bg-surface text-ink hover:border-brand/60 hover:text-brand-strong hover:shadow-soft',
  ghost: 'text-ink-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-soft',
  link: 'h-auto px-0 text-brand-strong underline-offset-4 hover:underline',
  night: 'bg-white text-navy hover:bg-night-sage shadow-[0_8px_24px_-8px_rgb(0_0_0/0.5)]',
  'night-outline': 'border border-white/20 text-white hover:border-white/40 hover:bg-white/10',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'h-8 rounded-lg px-3 text-xs',
  sm: 'h-9 rounded-[10px] px-3.5 text-sm',
  md: 'h-11 rounded-xl px-5 text-sm',
  lg: 'h-13 rounded-2xl px-7 text-[15px]',
  'icon-sm': 'size-8 rounded-lg',
  icon: 'size-10 rounded-xl',
  'icon-lg': 'size-12 rounded-2xl',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(base, variants[variant], variant === 'link' ? 'h-auto' : sizes[size], className);
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-block size-4', className)} aria-hidden="true">
      <span className="absolute inset-0 rounded-full border-2 border-current opacity-25" />
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-current border-r-transparent border-b-transparent" />
    </span>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Optional icons; trailing icons nudge on hover. */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', leadingIcon, trailingIcon, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading ? <Spinner /> : leadingIcon && <span data-icon="leading" className="inline-flex">{leadingIcon}</span>}
      {children}
      {trailingIcon && !loading && <span data-icon="trailing" className="inline-flex">{trailingIcon}</span>}
    </button>
  );
});

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Required accessible name. */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: 'icon-sm' | 'icon' | 'icon-lg';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size = 'icon', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {icon}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  trailingIcon?: ReactNode;
}

export function ButtonLink({ variant = 'primary', size = 'md', className, children, trailingIcon, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {children}
      {trailingIcon && <span data-icon="trailing" className="inline-flex">{trailingIcon}</span>}
    </Link>
  );
}
