/*
 * Admin notifications — "the broadcast desk".
 * Instrument readings up top (total · live · expiring · expired), a filterable dispatch log on the
 * left — each card catalogued "Dispatch № 007", toned by type, with a live visibility switch that
 * flips instantly (optimistic) and a kit menu for edit/delete — and an "On air" night panel on the
 * right that mirrors exactly what players see in their bell right now. The composer previews the
 * dispatch in a replica of that bell as you type.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Clock, Ellipsis, Hourglass, Lock, Pencil, Plus, RadioTower, TimerOff, Trash2 } from 'lucide-react';
import type { Notification, NotificationRequest, User } from '@/api/api';
import {
  useAllNotifications,
  useCreateNotification,
  useDeleteNotification,
  useToggleNotification,
  useUpdateNotification,
} from '@/hooks';
import { useNotifications } from '@/context/NotificationContext';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton, Spinner } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Controls';
import { Alert, EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Menu } from '@/components/ui/Overlay';
import { Tabs } from '@/components/ui/Nav';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConfirm, useToast } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { BellPreviewFrame, BellPreviewItem } from '@/components/admin/BellPreview';
import { NotificationComposer, type ComposerErrors, type ComposerForm } from '@/components/admin/NotificationComposer';
import { TYPE_META, fmtDate, normType, relative, timeAgo, toLocalInput } from '@/components/admin/notificationMeta';
import { cn } from '@/lib/utils';
import { dur, ease, stagger } from '@/lib/motion';

type Filter = 'all' | 'active' | 'expiring' | 'expired';

const emptyForm: ComposerForm = { title: '', message: '', type: 'INFO', expiresAt: '' };

interface AdminNotificationsViewProps {
  user: User;
}

/** Re-renders on an interval so "expired"/"expires in…" stay truthful while the page is open. */
function useNow(interval = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(t);
  }, [interval]);
  return now;
}

interface Classified {
  n: Notification;
  index: number;
  visible: boolean;
  expired: boolean;
  expiresAtMs: number;
  expiring: boolean;
  live: boolean;
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                            */
/* ------------------------------------------------------------------ */

function DispatchSkeleton() {
  return (
    <div className="rounded-[20px] border border-line bg-surface">
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-full rounded-md" />
          <Skeleton className="h-3.5 w-4/5 rounded-md" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-5">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatch card                                                        */
/* ------------------------------------------------------------------ */

interface DispatchCardProps {
  item: Classified;
  order: number;
  now: number;
  busy: boolean;
  onToggle: (n: Notification) => void;
  onEdit: (n: Notification) => void;
  onDelete: (n: Notification) => void;
}

function DispatchCard({ item, order, now, busy, onToggle, onEdit, onDelete }: DispatchCardProps) {
  const { n, index, visible, expired, expiresAtMs, expiring, live } = item;
  const meta = TYPE_META[normType(n.type)];
  const Icon = meta.icon;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out, delay: Math.min(order, 6) * stagger.list } }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: dur.fast, ease: ease.in } }}
    >
      <article
        aria-busy={busy || undefined}
        className={cn(
          'group relative overflow-hidden rounded-[20px] border bg-surface transition-[border-color,box-shadow,transform,translate,scale,rotate] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-card',
          live ? 'border-line hover:border-brand/40' : 'border-dashed border-line-strong',
          expired && 'bg-surface-2/40',
        )}
      >
        <span aria-hidden="true" className={cn('absolute inset-y-5 left-0 w-[3px] rounded-r-full', meta.bar, !live && 'opacity-40')} />

        <div className="flex items-start gap-3.5 p-4 sm:gap-4 sm:p-5">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl transition-opacity', meta.tile, !live && 'opacity-60')}>
            <Icon className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="label-mono text-ink-faint">Dispatch № {String(index).padStart(3, '0')}</p>
                <h3 className={cn('mt-1 break-words text-base font-bold', expired ? 'text-ink-muted' : 'text-ink')}>{n.title}</h3>
              </div>
              <Menu
                label={`Actions for ${n.title}`}
                className="w-52"
                groups={[
                  [{ label: 'Edit', icon: <Pencil className="size-4" />, onSelect: () => onEdit(n), disabled: busy }],
                  [{ label: 'Delete', icon: <Trash2 className="size-4" />, onSelect: () => onDelete(n), danger: true, disabled: busy }],
                ]}
                trigger={
                  <IconButton
                    label={`Actions for ${n.title}`}
                    icon={<Ellipsis className="size-5" />}
                    className="-mr-2 -mt-1.5 size-11 shrink-0"
                    disabled={busy}
                  />
                }
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {expired ? (
                <Badge tone="neutral" variant="outline">
                  Expired
                </Badge>
              ) : visible ? (
                <Badge tone="brand" variant="outline" dot>
                  Live
                </Badge>
              ) : (
                <Badge tone="neutral">Hidden</Badge>
              )}
            </div>

            <p className="mt-2.5 line-clamp-3 text-sm [overflow-wrap:anywhere] leading-relaxed text-ink-muted">{n.message}</p>
            <p className="mt-3 text-xs text-ink-faint">
              {fmtDate(n.createdAt)} · by <span className="font-semibold text-ink-muted">{n.createdByUsername}</span>
            </p>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-4 py-2 sm:px-5">
          <div className="flex min-h-11 items-center gap-3">
            <Switch
              checked={visible}
              onChange={() => onToggle(n)}
              disabled={busy}
              ariaLabel={`${visible ? 'Hide' : 'Show'} “${n.title}” ${visible ? 'from' : 'to'} users`}
            />
            <span className="text-sm font-medium text-ink" aria-hidden="true">
              {visible ? 'Visible to users' : 'Hidden'}
            </span>
            {busy && <Spinner className="size-3.5 text-ink-faint" />}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            {expired ? (
              <>
                <TimerOff className="size-3.5" /> Expired {relative(expiresAtMs, now)}
              </>
            ) : expiring ? (
              <>
                <Clock className="size-3.5" /> Expires {relative(expiresAtMs, now)}
              </>
            ) : (
              'No expiry'
            )}
          </p>
        </footer>
      </article>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                 */
/* ------------------------------------------------------------------ */

export default function AdminNotificationsView({ user }: AdminNotificationsViewProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: raw = [], isLoading, error, refetch } = useAllNotifications();
  const createMutation = useCreateNotification();
  const updateMutation = useUpdateNotification();
  const deleteMutation = useDeleteNotification();
  const toggleMutation = useToggleNotification();
  const { refreshNotifications, notifications: bell, loading: bellLoading } = useNotifications();
  const now = useNow();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Notification | null>(null);
  const [form, setForm] = useState<ComposerForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<ComposerErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<Filter>('all');

  const notifications = useMemo(
    () => [...raw].filter((n) => !removed.has(n.id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [raw, removed],
  );

  const classified = useMemo<Classified[]>(() => {
    const total = notifications.length;
    return notifications.map((n, i) => {
      const expiresAtMs = n.expiresAt ? new Date(n.expiresAt).getTime() : NaN;
      const expired = !Number.isNaN(expiresAtMs) && expiresAtMs < now;
      const visible = optimistic[n.id] ?? n.active;
      return {
        n,
        index: total - i, // oldest = № 001
        visible,
        expired,
        expiresAtMs,
        expiring: !expired && !Number.isNaN(expiresAtMs),
        live: visible && !expired,
      };
    });
  }, [notifications, optimistic, now]);

  const counts = useMemo(
    () => ({
      all: classified.length,
      active: classified.filter((c) => c.live).length,
      expiring: classified.filter((c) => c.expiring).length,
      expired: classified.filter((c) => c.expired).length,
    }),
    [classified],
  );

  const visibleList = useMemo(
    () =>
      classified.filter((c) =>
        filter === 'all' ? true : filter === 'active' ? c.live : filter === 'expiring' ? c.expiring : c.expired,
      ),
    [classified, filter],
  );

  const markPending = useCallback((id: string, on: boolean) => {
    setPending((p) => {
      const next = new Set(p);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  if (user.role !== 'ADMIN') {
    return (
      <EmptyState
        icon={<Lock className="size-5" />}
        title="Access denied"
        description="Only administrators can manage system notifications."
      />
    );
  }

  const openCreate = () => {
    setForm(emptyForm);
    setFormErrors({});
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (n: Notification) => {
    setForm({
      title: n.title,
      message: n.message,
      type: normType(n.type),
      expiresAt: toLocalInput(n.expiresAt),
    });
    setFormErrors({});
    setEditing(n);
    setOpen(true);
  };

  const handleToggle = async (n: Notification) => {
    const wasActive = optimistic[n.id] ?? n.active;
    setOptimistic((o) => ({ ...o, [n.id]: !wasActive }));
    markPending(n.id, true);
    try {
      await toggleMutation.mutateAsync(n.id);
      await Promise.all([refreshNotifications(), refetch()]);
      toast.success(wasActive ? 'Notification deactivated' : 'Notification activated');
    } catch (err) {
      toast.error('Could not update status', err instanceof Error ? err.message : undefined);
    } finally {
      setOptimistic((o) => {
        const next = { ...o };
        delete next[n.id];
        return next;
      });
      markPending(n.id, false);
    }
  };

  const handleDelete = async (n: Notification) => {
    const ok = await confirm({
      title: 'Delete this notification?',
      description: `"${n.title}" will be removed for every user. This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    markPending(n.id, true);
    try {
      await deleteMutation.mutateAsync(n.id);
      setRemoved((r) => new Set(r).add(n.id));
      await refreshNotifications();
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Could not delete notification', err instanceof Error ? err.message : undefined);
    } finally {
      markPending(n.id, false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.title.trim() || !form.message.trim()) {
      setFormErrors({
        title: form.title.trim() ? undefined : 'Give it a short headline.',
        message: form.message.trim() ? undefined : 'Tell players what they need to know.',
      });
      toast.error('Title and message are required');
      return;
    }
    setSubmitting(true);
    try {
      const data: NotificationRequest = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data });
      } else {
        await createMutation.mutateAsync({ data, adminId: user.id });
      }
      await refreshNotifications();
      toast.success(editing ? 'Notification updated' : 'Notification published');
      setOpen(false);
    } catch (err) {
      toast.error('Could not save notification', err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const filterEmpty: Record<Filter, { title: string; description: string }> = {
    all: { title: 'Nothing here', description: 'No notifications match.' },
    active: { title: 'Nothing on air', description: 'No notification is currently visible to players. Switch one on, or publish a new one.' },
    expiring: { title: 'No scheduled expiries', description: 'Notifications with a future expiry date will be listed here.' },
    expired: { title: 'Nothing has expired', description: 'Notifications whose expiry date has passed collect here.' },
  };

  const onAir = bell.slice(0, 3);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        eyebrow="Admin · Broadcast desk"
        title="Notifications"
        description="Broadcast announcements and alerts to every CurioPlay user."
        actions={
          <Button onClick={openCreate} leadingIcon={<Plus className="size-4" />}>
            New notification
          </Button>
        }
      />

      {error && !isLoading && raw.length === 0 ? (
        <ErrorState
          title="Couldn't load notifications"
          description={(error as Error).message || 'Failed to load notifications.'}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          {error && (
            <Alert
              tone="danger"
              title="Showing the last loaded list"
              action={
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  Retry
                </Button>
              }
            >
              {(error as Error).message || 'Failed to refresh notifications.'}
            </Alert>
          )}

          {/* Instrument readings */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard icon={<Bell className="size-4" />} label="Total" value={counts.all} loading={isLoading} tone="rose" hint="Every dispatch on record" />
            <StatCard icon={<RadioTower className="size-4" />} label="Live now" value={counts.active} loading={isLoading} tone="brand" hint="Visible in the bell" />
            <StatCard icon={<Hourglass className="size-4" />} label="Expiring" value={counts.expiring} loading={isLoading} tone="rose" hint="Scheduled to expire" />
            <StatCard icon={<TimerOff className="size-4" />} label="Expired" value={counts.expired} loading={isLoading} tone="rose" hint="Past their expiry" />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Dispatch log */}
            <section aria-label="Dispatch log" className="flex min-w-0 flex-col gap-5">
              <Tabs<Filter>
                variant="underline"
                label="Filter notifications"
                value={filter}
                onChange={(f) => setFilter(f)}
                items={[
                  { value: 'all', label: 'All', count: isLoading ? undefined : counts.all },
                  { value: 'active', label: 'Active', count: isLoading ? undefined : counts.active },
                  { value: 'expiring', label: 'Expiring', count: isLoading ? undefined : counts.expiring },
                  { value: 'expired', label: 'Expired', count: isLoading ? undefined : counts.expired },
                ]}
              />

              {isLoading ? (
                <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading notifications">
                  {[0, 1, 2].map((i) => (
                    <DispatchSkeleton key={i} />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <EmptyState
                  icon={<Bell className="size-5" />}
                  title="No notifications yet"
                  description="Publish your first announcement to reach every player."
                  action={
                    <Button onClick={openCreate} leadingIcon={<Plus className="size-4" />}>
                      New notification
                    </Button>
                  }
                />
              ) : visibleList.length === 0 ? (
                <EmptyState
                  compact
                  icon={filter === 'expired' ? <TimerOff className="size-5" /> : filter === 'expiring' ? <Hourglass className="size-5" /> : <RadioTower className="size-5" />}
                  title={filterEmpty[filter].title}
                  description={filterEmpty[filter].description}
                  action={
                    <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                      Show all {counts.all}
                    </Button>
                  }
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  <AnimatePresence initial>
                    {visibleList.map((item, i) => (
                      <DispatchCard
                        key={item.n.id}
                        item={item}
                        order={i}
                        now={now}
                        busy={pending.has(item.n.id)}
                        onToggle={handleToggle}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </section>

            {/* On air — what players see in the bell right now */}
            <aside className="lg:sticky lg:top-6 lg:self-start" aria-labelledby="on-air-title">
              <div className="grain relative overflow-hidden rounded-[28px] bg-navy p-5 text-white sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="on-air-title" className="label-mono text-night-sage/80">
                    On air
                  </h2>
                  {!bellLoading && (
                    <Badge tone="night" dot={bell.length > 0 ? 'pulse' : true}>
                      {bell.length} live
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/70">Exactly what players see when they open the bell right now.</p>

                <div className="relative mt-5">
                  {bellLoading ? (
                    <div className="space-y-2 rounded-2xl bg-white/5 p-3">
                      {[0, 1].map((i) => (
                        <div key={i} className="flex gap-3 p-2">
                          <div className="size-8 shrink-0 rounded-lg bg-white/10" />
                          <div className="flex-1 space-y-2 pt-1">
                            <div className="h-2.5 w-2/3 rounded-full bg-white/10" />
                            <div className="h-2.5 w-full rounded-full bg-white/10" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <BellPreviewFrame>
                      {onAir.length === 0 ? (
                        <li className="px-4 py-8 text-center text-sm text-ink-muted">You're all caught up.</li>
                      ) : (
                        onAir.map((n) => (
                          <BellPreviewItem key={n.id} type={normType(n.type)} title={n.title} message={n.message} time={timeAgo(n.createdAt)} />
                        ))
                      )}
                    </BellPreviewFrame>
                  )}
                </div>
                {bell.length > onAir.length && (
                  <p className="mt-3 text-xs text-white/60">
                    +{bell.length - onAir.length} more in the bell
                  </p>
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      <NotificationComposer
        open={open}
        editing={editing}
        form={form}
        setForm={setForm}
        errors={formErrors}
        onClearError={(field) => setFormErrors((e) => ({ ...e, [field]: undefined }))}
        submitting={submitting}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
