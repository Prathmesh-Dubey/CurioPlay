import { useId, useRef, type Dispatch, type FormEvent, type KeyboardEvent, type SetStateAction } from 'react';
import { motion } from 'motion/react';
import { Bell, Save, Send } from 'lucide-react';
import type { Notification } from '@/api/api';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Overlay';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';
import { BellPreviewFrame, BellPreviewItem } from './BellPreview';
import { NOTIF_TYPES, TYPE_META, fmtDateTime, localInputFromDate, relative, timeAgo, type NotifType } from './notificationMeta';

export interface ComposerForm {
  title: string;
  message: string;
  type: NotifType;
  /** datetime-local value (local time) or '' for no expiry. */
  expiresAt: string;
}

export interface ComposerErrors {
  title?: string;
  message?: string;
}

interface NotificationComposerProps {
  open: boolean;
  editing: Notification | null;
  form: ComposerForm;
  setForm: Dispatch<SetStateAction<ComposerForm>>;
  errors: ComposerErrors;
  onClearError: (field: keyof ComposerErrors) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}

const PRESETS: { label: string; ms: number | null }[] = [
  { label: 'No expiry', ms: null },
  { label: '24 hours', ms: 86_400_000 },
  { label: '3 days', ms: 3 * 86_400_000 },
  { label: '1 week', ms: 7 * 86_400_000 },
];

function TypePicker({ value, onChange }: { value: NotifType; onChange: (t: NotifType) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = NOTIF_TYPES.indexOf(value);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % NOTIF_TYPES.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + NOTIF_TYPES.length) % NOTIF_TYPES.length;
    if (next < 0) return;
    e.preventDefault();
    onChange(NOTIF_TYPES[next]);
    refs.current[next]?.focus();
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[13px] font-semibold text-ink">Type</legend>
      <div role="radiogroup" aria-label="Notification type" onKeyDown={onKeyDown} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {NOTIF_TYPES.map((t, i) => {
          const meta = TYPE_META[t];
          const Icon = meta.icon;
          const on = t === value;
          return (
            <button
              key={t}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(t)}
              className={cn(
                'relative flex h-12 items-center gap-2.5 rounded-xl border px-2.5 text-sm font-semibold transition-[border-color,color,transform,translate,scale,rotate] duration-200 active:scale-[0.97]',
                on ? 'border-transparent text-ink' : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {on && (
                <motion.span
                  layoutId="composer-type-ring"
                  transition={spring.snappy}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl border-2 border-brand bg-surface-2/50"
                />
              )}
              <span className={cn('relative grid size-7 shrink-0 place-items-center rounded-lg', meta.tile)}>
                <Icon className="size-4" />
              </span>
              <span className="relative truncate">{meta.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink-faint">{TYPE_META[value].hint}</p>
    </fieldset>
  );
}

/** Composer dialog with a live replica of the bell popover beside (desktop) or below (phones) the form. */
export function NotificationComposer({
  open,
  editing,
  form,
  setForm,
  errors,
  onClearError,
  submitting,
  onClose,
  onSubmit,
}: NotificationComposerProps) {
  const formId = useId();
  const now = Date.now();
  const expiryMs = form.expiresAt ? new Date(form.expiresAt).getTime() : NaN;
  const hasExpiry = !!form.expiresAt;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const expiryHint = !hasExpiry
    ? 'No expiry — it stays in the bell until you hide it.'
    : Number.isNaN(expiryMs)
      ? 'Enter a complete date and time.'
      : expiryMs <= now
        ? 'That moment has already passed — it will be saved as expired.'
        : `Expires ${relative(expiryMs, now)} · ${fmtDateTime(expiryMs)} (${tz})`;

  const visibilityNote = editing && !editing.active
    ? 'This notification is hidden. Saving keeps it hidden until you switch it back on.'
    : hasExpiry && !Number.isNaN(expiryMs) && expiryMs <= now
      ? 'Expired notifications drop out of the bell.'
      : "Shown at the top of every player's bell while it's visible.";

  const close = () => {
    if (!submitting) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      size="xl"
      title={editing ? 'Edit notification' : 'New notification'}
      description={
        editing ? 'Changes reach players the next time their bell refreshes.' : 'Broadcast an announcement or alert to every CurioPlay player.'
      }
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={submitting}
            leadingIcon={editing ? <Save className="size-4" /> : <Send className="size-4" />}
          >
            {editing ? 'Save changes' : 'Publish'}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 pt-2 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
        <form id={formId} onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-5">
          <TypePicker value={form.type} onChange={(type) => setForm((f) => ({ ...f, type }))} />

          <Input
            label="Title"
            value={form.title}
            error={errors.title}
            onChange={(e) => {
              setForm((f) => ({ ...f, title: e.target.value }));
              if (errors.title && e.target.value.trim()) onClearError('title');
            }}
            placeholder="e.g. Scheduled maintenance"
            data-autofocus
          />

          <Textarea
            label="Message"
            rows={4}
            value={form.message}
            error={errors.message}
            onChange={(e) => {
              setForm((f) => ({ ...f, message: e.target.value }));
              if (errors.message && e.target.value.trim()) onClearError('message');
            }}
            placeholder="What do users need to know?"
            className="resize-none"
            hint={`${form.message.trim().length.toLocaleString()} characters · shown in full in the bell.`}
          />

          <div className="flex flex-col gap-2.5">
            <Input
              label="Expires"
              optional
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              hint={expiryHint}
            />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick expiry">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, expiresAt: p.ms === null ? '' : localInputFromDate(new Date(Date.now() + p.ms)) }))
                  }
                  className={cn(
                    'font-narrow min-h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-[background-color,border-color,color,transform,translate,scale,rotate] duration-200 active:scale-[0.96]',
                    p.ms === null && !hasExpiry
                      ? 'border-rose bg-rose-soft text-brand-strong'
                      : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Live preview — how it lands in the bell */}
        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-0 lg:self-start" aria-label="Live preview">
          <p className="label-mono text-ink-faint">Preview · Bell</p>
          <div className="relative rounded-[22px] border border-line bg-surface-2/60 p-3 sm:p-4">
            <div className="mb-3 flex justify-end pr-1" aria-hidden="true">
              <span className="relative grid size-10 place-items-center rounded-xl bg-surface text-ink-muted shadow-soft">
                <Bell className="size-[18px]" />
                <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold leading-4 text-navy ring-2 ring-surface">
                  1
                </span>
              </span>
            </div>
            <BellPreviewFrame showMarkAll>
              <BellPreviewItem
                type={form.type}
                title={form.title.trim()}
                message={form.message.trim()}
                time={editing ? timeAgo(editing.createdAt) : 'just now'}
                unread
              />
            </BellPreviewFrame>
          </div>
          <p className="text-xs leading-relaxed text-ink-faint">{visibilityNote}</p>
        </aside>
      </div>
    </Dialog>
  );
}
