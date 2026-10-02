import { AlertCircle, AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { MorphingPopover, MorphingPopoverContent, MorphingPopoverTrigger } from '@/components/motion/morphing-popover';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';

/*
 * The bell morphs into its own panel (Morphing Popover): the trigger's shape grows into
 * the list. Unread items carry a blue dot; reading one fades it to the archive tone.
 */

const typeStyle: Record<string, { icon: typeof Info; cls: string }> = {
  SUCCESS: { icon: CheckCircle2, cls: 'bg-rose-soft text-brand-strong' },
  WARNING: { icon: AlertTriangle, cls: 'bg-gold-soft text-gold-strong' },
  ERROR: { icon: AlertCircle, cls: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  INFO: { icon: Info, cls: 'bg-brand-soft text-brand-strong' },
};

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function readSet(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem('readNotifications') || '[]'));
  } catch {
    return new Set();
  }
}

export function NotificationsPopover() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const read = readSet();

  return (
    <MorphingPopover className="relative" transition={{ type: 'spring', bounce: 0.08, duration: 0.4 }}>
      <MorphingPopoverTrigger
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative grid size-10 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <motion.span
          animate={unreadCount ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="inline-flex"
        >
          <Bell className="size-[18px]" />
        </motion.span>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-canvas">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </MorphingPopoverTrigger>

      <MorphingPopoverContent className="right-0 top-0 z-50 w-[min(92vw,23rem)] origin-top-right rounded-[22px] border border-line bg-surface p-0 text-ink shadow-float dark:border-line dark:bg-surface dark:text-ink">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <div>
            <p className="label-mono text-ink-faint">Broadcasts</p>
            <h2 className="text-sm font-bold text-ink">
              Notifications {unreadCount > 0 && <span className="text-brand-strong">· {unreadCount} new</span>}
            </h2>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-brand-strong transition-colors hover:bg-brand-soft"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <li className="flex flex-col items-center px-4 py-10 text-center">
              <span className="grid size-11 place-items-center rounded-2xl bg-rose-soft text-brand-strong">
                <Radio className="size-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink">All quiet on the airwaves</p>
              <p className="mt-1 text-xs text-ink-muted">Announcements from the CurioPlay team land here.</p>
            </li>
          ) : (
            notifications.map((n) => {
              const { icon: Icon, cls } = typeStyle[n.type] ?? typeStyle.INFO;
              const isRead = read.has(n.id);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markAsRead(n.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-[background-color,opacity] hover:bg-surface-2',
                      isRead && 'opacity-60',
                    )}
                  >
                    <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl', cls)}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{n.title}</span>
                        <span className="label-mono shrink-0 pt-0.5 text-ink-faint">{timeAgo(n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-ink-muted [overflow-wrap:anywhere]">{n.message}</span>
                    </span>
                    {!isRead && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </MorphingPopoverContent>
    </MorphingPopover>
  );
}
