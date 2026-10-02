import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the standard hover lift (use for clickable cards). */
  interactive?: boolean;
  /** night = deep-forest immersive surface. */
  tone?: 'surface' | 'night' | 'sage' | 'gold';
}

const tones = {
  surface: 'border-line bg-surface',
  night: 'border-white/10 bg-navy text-white',
  sage: 'border-transparent bg-rose-soft',
  gold: 'border-gold/30 bg-gold-soft',
};

export function Card({ className, interactive, tone = 'surface', ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'relative rounded-[20px] border',
        tones[tone],
        tone === 'surface' && 'shadow-soft',
        interactive &&
          'transition-[transform,translate,scale,rotate,box-shadow,border-color] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  className,
  title,
  description,
  action,
  eyebrow,
  children,
  ...rest
}: Omit<HTMLAttributes<HTMLDivElement>, 'title'> & { title?: ReactNode; description?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 p-5 pb-0 sm:p-6 sm:pb-0', className)} {...rest}>
      <div className="min-w-0">
        {eyebrow && <p className="label-mono mb-1.5 text-ink-faint">{eyebrow}</p>}
        {title && <h3 className="text-base font-bold tracking-tight text-ink">{title}</h3>}
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 sm:p-6', className)} {...rest} />;
}
