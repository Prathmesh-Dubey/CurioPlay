import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/ui/Badge';

export type NotifType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export const NOTIF_TYPES: NotifType[] = ['INFO', 'SUCCESS', 'WARNING', 'ERROR'];

export interface TypeMeta {
  label: string;
  icon: LucideIcon;
  /** Badge tone (INFO→brand, SUCCESS→rose, WARNING→gold, ERROR→danger). */
  tone: BadgeTone;
  /** Icon tile fill + ink. */
  tile: string;
  /** Thin edge rule on admin cards. */
  bar: string;
  /** One-line guidance in the composer. */
  hint: string;
}

export const TYPE_META: Record<NotifType, TypeMeta> = {
  INFO: {
    label: 'Info',
    icon: Info,
    tone: 'brand',
    tile: 'bg-brand-soft text-brand-strong',
    bar: 'bg-brand',
    hint: 'News, tips and new arrivals.',
  },
  SUCCESS: {
    label: 'Success',
    icon: CheckCircle2,
    tone: 'rose',
    tile: 'bg-rose-soft text-brand-strong',
    bar: 'bg-rose',
    hint: 'Good news: fixes shipped, goals reached.',
  },
  WARNING: {
    label: 'Warning',
    icon: AlertTriangle,
    tone: 'gold',
    tile: 'bg-gold-soft text-gold-strong',
    bar: 'bg-gold',
    hint: 'Heads-up: maintenance, upcoming changes.',
  },
  ERROR: {
    label: 'Error',
    icon: AlertCircle,
    tone: 'danger',
    tile: 'bg-red-500/10 text-red-600 dark:text-red-400',
    bar: 'bg-red-500',
    hint: 'Outages and anything currently broken.',
  },
};

export function normType(t: string | null | undefined): NotifType {
  const u = (t ?? '').toUpperCase();
  return (NOTIF_TYPES as string[]).includes(u) ? (u as NotifType) : 'INFO';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Date -> value for <input type="datetime-local"> in the viewer's local time. */
export function localInputFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO string -> value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return localInputFromDate(d);
}

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** "in 3 days", "2 hours ago", "now". */
export function relative(targetMs: number, nowMs: number): string {
  const diff = targetMs - nowMs;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['week', 604_800_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, ms] of units) if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  return rtf.format(0, 'second');
}

/** Same wording as the bell popover. */
export function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
