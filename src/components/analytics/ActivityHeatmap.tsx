import { useMemo, useState, type KeyboardEvent } from 'react';
import type { GameSession } from '@/api/api';
import { cn } from '@/lib/utils';
import { dayKey, formatDuration, startOfDay, toTime, weekdayDate } from './utils';

interface ActivityHeatmapProps {
  sessions: GameSession[];
  /** Days before this timestamp are dimmed (ties the grid to the range control). */
  highlightFrom?: number;
  weeks?: number;
  className?: string;
}

interface Day {
  t: number;
  count: number;
  seconds: number;
  future: boolean;
}

const LEVEL_FILL = [
  'var(--cp-surface-2)',
  'color-mix(in srgb, var(--cp-brand) 24%, var(--cp-surface-2))',
  'color-mix(in srgb, var(--cp-brand) 48%, var(--cp-surface-2))',
  'color-mix(in srgb, var(--cp-brand) 74%, var(--cp-surface-2))',
  'var(--cp-brand)',
];

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

/** Calendar heatmap of session starts: weeks run left → right, Monday on top. */
export function ActivityHeatmap({ sessions, highlightFrom = -Infinity, weeks = 12, className }: ActivityHeatmapProps) {
  const [active, setActive] = useState<number | null>(null);

  const model = useMemo(() => {
    const today = startOfDay(Date.now());
    const todayDate = new Date(today);
    const mondayOffset = (todayDate.getDay() + 6) % 7; // 0 = Monday
    const gridStart = new Date(todayDate);
    gridStart.setDate(todayDate.getDate() - mondayOffset - (weeks - 1) * 7);

    const byDay = new Map<string, { count: number; seconds: number }>();
    sessions.forEach((s) => {
      const t = toTime(s.startTime);
      if (!Number.isFinite(t)) return;
      const k = dayKey(t);
      const cur = byDay.get(k) ?? { count: 0, seconds: 0 };
      byDay.set(k, { count: cur.count + 1, seconds: cur.seconds + (s.duration ?? 0) });
    });

    const days: Day[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const t = d.getTime();
      const v = byDay.get(dayKey(t));
      days.push({ t, count: v?.count ?? 0, seconds: v?.seconds ?? 0, future: t > today });
    }

    const max = Math.max(0, ...days.map((d) => d.count));
    const activeDays = days.filter((d) => d.count > 0).length;
    const total = days.reduce((a, d) => a + d.count, 0);

    // current streak: consecutive active days ending today (or yesterday if today is still blank)
    const todayIdx = days.findIndex((d) => d.t === today);
    let streak = 0;
    let i = todayIdx >= 0 && days[todayIdx].count === 0 ? todayIdx - 1 : todayIdx;
    while (i >= 0 && days[i].count > 0) {
      streak++;
      i--;
    }

    const months: { col: number; label: string }[] = [];
    for (let w = 0; w < weeks; w++) {
      const first = days[w * 7];
      const m = new Date(first.t).getMonth();
      const prev = w === 0 ? -1 : new Date(days[(w - 1) * 7].t).getMonth();
      if (m !== prev) months.push({ col: w, label: new Date(first.t).toLocaleDateString(undefined, { month: 'short' }) });
    }
    // a partial first month would collide with the next label
    if (months.length > 1 && months[1].col - months[0].col < 2) months.shift();
    return { days, max, activeDays, total, streak, months, todayIdx };
  }, [sessions, weeks]);

  const level = (count: number) => (count === 0 || model.max === 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((count / model.max) * 4))));

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = model.todayIdx >= 0 ? model.todayIdx : model.days.length - 1;
    const cur = active ?? last;
    const delta: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    if (e.key in delta) {
      e.preventDefault();
      const next = active === null ? last : Math.max(0, Math.min(last, cur + delta[e.key]));
      setActive(next);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(last);
    } else if (e.key === 'Escape') setActive(null);
  };

  const a = active !== null ? model.days[active] : null;
  const readout = a
    ? `${weekdayDate(a.t)} — ${
        a.count === 0
          ? 'no sessions'
          : `${a.count} session${a.count === 1 ? '' : 's'}${a.seconds ? ` · ${formatDuration(a.seconds)} played` : ''}`
      }`
    : '';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <dl className="grid grid-cols-3 gap-3 border-y border-line py-3">
        {[
          ['Sessions', model.total],
          ['Active days', model.activeDays],
          ['Streak', `${model.streak}d`],
        ].map(([k, v]) => (
          <div key={k as string} className="min-w-0">
            <dt className="label-mono truncate text-ink-faint">{k}</dt>
            <dd className="mt-0.5 font-semiwide text-xl font-extrabold tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div
        tabIndex={0}
        role="group"
        aria-label={`Activity over the last ${weeks} weeks: ${model.total} sessions on ${model.activeDays} days. Use arrow keys to read each day.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        className="grid w-full max-w-lg gap-[3px] rounded-lg outline-none"
        style={{ gridTemplateColumns: `auto repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {/* month row */}
        <span aria-hidden="true" />
        {Array.from({ length: weeks }, (_, w) => {
          const m = model.months.find((x) => x.col === w);
          return (
            <span key={`m${w}`} aria-hidden="true" className="label-mono h-4 overflow-visible whitespace-nowrap text-[10px] text-ink-faint">
              {m?.label ?? ''}
            </span>
          );
        })}

        {/* day rows */}
        {Array.from({ length: 7 }, (_, d) => (
          <span
            key={`d${d}`}
            aria-hidden="true"
            className="label-mono flex items-center pr-1.5 text-[10px] leading-none text-ink-faint"
            style={{ gridColumn: 1, gridRow: d + 2 }}
          >
            {DAY_LABELS[d]}
          </span>
        ))}
        {model.days.map((day, i) => {
          const w = Math.floor(i / 7);
          const d = i % 7;
          const lvl = level(day.count);
          const dim = day.t < highlightFrom;
          return (
            <span
              key={day.t}
              aria-hidden="true"
              onPointerEnter={() => !day.future && setActive(i)}
              className={cn(
                'aspect-square w-full max-w-9 justify-self-center rounded-[4px] transition-[opacity,box-shadow] duration-200',
                day.future && 'opacity-0',
                dim && !day.future && 'opacity-35',
                active === i && 'shadow-[0_0_0_2px_var(--cp-surface),0_0_0_3.5px_var(--cp-ink)]',
              )}
              style={{ gridColumn: w + 2, gridRow: d + 2, backgroundColor: LEVEL_FILL[lvl] }}
            />
          );
        })}
      </div>

      <div className="flex min-h-5 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs font-medium text-ink-muted" aria-live="polite">
          {readout || <span className="text-ink-faint">Hover or focus a day to read it.</span>}
        </p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="label-mono text-[10px] text-ink-faint">Less</span>
          {LEVEL_FILL.map((c) => (
            <span key={c} className="size-3 rounded-[3px]" style={{ backgroundColor: c }} />
          ))}
          <span className="label-mono text-[10px] text-ink-faint">More</span>
        </div>
      </div>
    </div>
  );
}
