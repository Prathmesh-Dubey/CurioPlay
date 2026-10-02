import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, RotateCcw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { Button } from './Button';

/** Small orbit drawing used as the default empty-state art (echoes the logo). */
function OrbitArt({ children }: { children?: ReactNode }) {
  return (
    <div className="relative mb-5 grid size-20 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 size-full text-rose" aria-hidden="true">
        <ellipse cx="40" cy="40" rx="36" ry="13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 4" transform="rotate(-20 40 40)" />
        <motion.circle
          cx="76"
          cy="40"
          r="3"
          className="fill-gold"
          style={{ transformOrigin: '40px 40px', rotate: -20 }}
          animate={{ rotate: [-20, 340] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
        />
      </svg>
      <div className="relative grid size-12 place-items-center rounded-2xl border border-line bg-surface text-brand-strong shadow-soft">{children}</div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** dashed = bordered placeholder (default); plain = no frame, for use inside cards. */
  variant?: 'dashed' | 'plain';
  /** Compact padding for small panels. */
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, variant = 'dashed', compact }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: ease.out }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'dashed' && 'rounded-[20px] border border-dashed border-line-strong bg-surface/60',
        compact ? 'px-5 py-8' : 'px-6 py-14',
        className,
      )}
    >
      {icon && <OrbitArt>{icon}</OrbitArt>}
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </motion.div>
  );
}

/** For failed queries: explains what happened and offers a retry. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We couldn’t load this right now. Check your connection and try again.',
  onRetry,
  className,
  compact,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-[20px] border border-red-500/25 bg-red-500/[0.04] text-center',
        compact ? 'px-5 py-8' : 'px-6 py-12',
        className,
      )}
    >
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
        <AlertTriangle className="size-5" />
      </span>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry} leadingIcon={<RotateCcw className="size-3.5" />}>
          Try again
        </Button>
      )}
    </div>
  );
}

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const alertTones: Record<AlertTone, { icon: typeof Info; box: string; iconCls: string }> = {
  info: { icon: Info, box: 'border-brand/25 bg-brand-soft/60', iconCls: 'text-brand-strong' },
  success: { icon: CheckCircle2, box: 'border-brand/30 bg-rose-soft/70', iconCls: 'text-brand-strong' },
  warning: { icon: AlertTriangle, box: 'border-gold/40 bg-gold-soft', iconCls: 'text-gold-strong' },
  danger: { icon: XCircle, box: 'border-red-500/30 bg-red-500/[0.06]', iconCls: 'text-red-600 dark:text-red-400' },
};

/** Inline banner for contextual messages. */
export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, box, iconCls } = alertTones[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3.5', box, className)}>
      <Icon className={cn('mt-0.5 size-4.5 shrink-0', iconCls)} />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && <div className={cn('text-ink-muted', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
