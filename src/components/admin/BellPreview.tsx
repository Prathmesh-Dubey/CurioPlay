import type { ReactNode } from 'react';
import { CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TYPE_META, type NotifType } from './notificationMeta';

/**
 * A faithful, non-interactive replica of the bell popover (NotificationsPopover) so admins can
 * see exactly how a dispatch lands: same panel, header, row anatomy, truncation and timestamps.
 */
export function BellPreviewFrame({
  children,
  showMarkAll,
  className,
}: {
  children: ReactNode;
  showMarkAll?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none select-none overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-float', className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-sm font-bold text-ink">Notifications</span>
        {showMarkAll && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-strong">
            <CheckCheck className="size-3.5" /> Mark all read
          </span>
        )}
      </div>
      <ul className="p-2">{children}</ul>
    </div>
  );
}

export function BellPreviewItem({
  type,
  title,
  message,
  time,
  unread,
}: {
  type: NotifType;
  title: string;
  message: string;
  time: string;
  unread?: boolean;
}) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <li className="flex items-start gap-3 rounded-xl p-3">
      <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg', meta.tile)}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn('truncate text-sm font-semibold', title ? 'text-ink' : 'text-ink-faint')}>{title || 'Your headline'}</span>
          <span className="shrink-0 text-[11px] text-ink-faint">{time}</span>
        </span>
        <span className={cn('mt-0.5 block text-sm leading-snug [overflow-wrap:anywhere]', message ? 'text-ink-muted' : 'text-ink-faint')}>
          {message || 'What do players need to know?'}
        </span>
      </span>
      {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" />}
    </li>
  );
}
