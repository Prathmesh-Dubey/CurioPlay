/*
 * THE PLAYER CARD — shared by your own profile and every public player profile.
 * One dark card that answers "who is this, and where do they stand": portrait, name, role and presence, bio and the
 * details they chose to share, global standing, and four key figures on a ruled rail. The single bold gesture is
 * the rank — a huge outlined numeral, like a jersey number, tinted with the player's own accent and cropped by the
 * card. It stays dark in both themes, so on the light theme it reads as a physical card on the page.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useGlobalLeaderboard } from '@/hooks';
import { dur, ease } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { Avatar } from '@/components/ui';

/** Parses API dates; date-only strings ("1999-04-02") are read as local dates so they don't shift a day. */
function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "October 12, 2004" (locale-formatted), or '' when the date is missing or invalid. */
export function formatLongDate(value?: string | null): string {
  const d = parseDate(value);
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
}

/** Used when the player hasn't picked an accent: the brand's sky blue. */
const DEFAULT_ACCENT = '#8bcbff';

const ordinalRules = new Intl.PluralRules('en', { type: 'ordinal' });
const ORDINAL_SUFFIX: Record<string, string> = { one: 'st', two: 'nd', few: 'rd', other: 'th' };
export const ordinal = (n: number) => `${n}${ORDINAL_SUFFIX[ordinalRules.select(n)] ?? 'th'}`;

export interface Standing {
  rank: number;
  of: number;
  points: number;
}

/**
 * Global standing on the all-time board (total points across every game): undefined while the board loads,
 * null when the player isn't on it yet.
 */
export function useGlobalStanding(userId: string): Standing | null | undefined {
  const { data: board, isLoading } = useGlobalLeaderboard();
  return useMemo(() => {
    if (isLoading) return undefined;
    const ranked = [...(board ?? [])].sort((a, b) => b.totalScore - a.totalScore);
    const i = ranked.findIndex((r) => r.userId === userId);
    return i === -1 ? null : { rank: i + 1, of: ranked.length, points: ranked[i].totalScore };
  }, [board, isLoading, userId]);
}

export const roleLabel = (role?: string | null) => {
  const r = (role || 'player').toLowerCase();
  return r.charAt(0).toUpperCase() + r.slice(1);
};

/** The name is the card's headline; long handles (no spaces to wrap on) step down instead of splitting mid-word. */
function nameSize(name: string) {
  if (name.length <= 12) return 'text-[2.4rem] sm:text-[3.25rem]';
  if (name.length <= 18) return 'text-[1.9rem] sm:text-[2.6rem]';
  return 'text-[1.5rem] sm:text-[2rem]';
}

export interface CardDetail {
  icon: ReactNode;
  content: ReactNode;
}

export interface CardFigure {
  label: string;
  value: number;
  /** Unit after the number, e.g. "h 30m". */
  suffix?: string;
  /** Renders "value / of". */
  of?: number;
  loading?: boolean;
}

interface PlayerCardProps {
  headingId: string;
  name: string;
  role?: string | null;
  accent?: string | null;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  /** Extra chips after the role (e.g. "You", presence). */
  chips?: ReactNode;
  bio?: ReactNode;
  details?: CardDetail[];
  /** undefined while the board loads; null when the player isn't ranked yet. */
  standing: Standing | null | undefined;
  /** Who the unranked hint talks about. */
  unrankedSubject?: 'you' | 'them';
  figures: CardFigure[];
  /** Shows the online dot on the portrait. */
  online?: boolean;
  className?: string;
}

export function PlayerCard({
  headingId,
  name,
  role,
  accent,
  avatarUrl,
  avatarSeed,
  chips,
  bio,
  details = [],
  standing,
  unrankedSubject = 'them',
  figures,
  online,
  className,
}: PlayerCardProps) {
  const tint = accent || DEFAULT_ACCENT;

  return (
    <motion.section
      aria-labelledby={headingId}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.slow, ease: ease.out }}
      style={{ '--accent': tint, '--accent-lit': `color-mix(in srgb, ${tint} 70%, white)` } as CSSProperties}
      className={cn('relative isolate overflow-hidden rounded-[28px] bg-navy text-white shadow-float ring-1 ring-white/[0.08]', className)}
    >
      {/* Accent light, top-left — the player's colour, kept soft. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 transition-[background] duration-500"
        style={{
          background:
            'radial-gradient(70% 120% at 0% 0%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 62%), linear-gradient(180deg, color-mix(in srgb, var(--cp-navy-2) 70%, transparent), transparent 70%)',
        }}
      />

      {/* The jersey number: global rank as a huge outlined numeral, cropped by the card and the figures rail. */}
      {standing && (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: ease.out, delay: 0.12 }}
          className="pointer-events-none absolute -right-[0.06em] top-4 -z-10 select-none font-wide text-[clamp(9rem,24vw,15.5rem)] font-extrabold leading-[0.78] tracking-[-0.06em] text-transparent sm:top-6"
          style={{ WebkitTextStroke: '1.5px color-mix(in srgb, var(--accent-lit) 38%, transparent)' }}
        >
          {standing.rank}
        </motion.span>
      )}

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10 lg:p-10">
        {/* Identity */}
        <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-start sm:gap-7">
          <span
            className="relative w-fit shrink-0 rounded-[26px] p-[2px]"
            style={{ background: 'linear-gradient(145deg, var(--accent-lit), color-mix(in srgb, var(--accent) 10%, transparent) 65%)' }}
          >
            <Avatar
              key={`${avatarUrl ?? ''}|${avatarSeed ?? ''}`}
              url={avatarUrl}
              seed={avatarSeed}
              name={name}
              className="size-24 rounded-[24px] border-0 bg-navy-2 text-3xl text-night-sage sm:size-[7.5rem]"
            />
            {online && <span className="absolute -bottom-1 -right-1 size-5 rounded-full border-[3px] border-navy bg-emerald-400" aria-hidden="true" />}
          </span>

          <div className="min-w-0 flex-1">
            <h1
              id={headingId}
              className={cn(nameSize(name), 'font-semiwide font-extrabold leading-[1.02] tracking-[-0.03em] [overflow-wrap:anywhere]')}
            >
              {name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <CardChip>{roleLabel(role)}</CardChip>
              {chips}
            </div>

            {bio && <div className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/80">{bio}</div>}

            {details.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-white/65">
                {details.map((d, i) => (
                  <li key={i} className="flex min-w-0 max-w-full items-center gap-2">
                    <span className="shrink-0 text-white/40 [&_svg]:size-4" aria-hidden="true">
                      {d.icon}
                    </span>
                    <span className="min-w-0 truncate">{d.content}</span>
                  </li>
                ))}
              </ul>
            )}

          </div>
        </div>

        {/* Standing */}
        <div className="flex flex-col justify-end border-t border-white/10 pt-6 lg:items-end lg:border-0 lg:pt-0 lg:text-right">
          <p className="text-sm text-white/55">Global rank</p>
          {standing === undefined ? (
            <span className="mt-2 h-10 w-24 animate-pulse rounded-lg bg-white/10" aria-hidden="true" />
          ) : standing ? (
            <>
              <p className="mt-1 font-semiwide text-[2.75rem] font-extrabold leading-none tabular-nums">{ordinal(standing.rank)}</p>
              <p className="mt-2 text-sm text-white/60">
                of {standing.of.toLocaleString()} ranked {standing.of === 1 ? 'player' : 'players'}
              </p>
              <p className="mt-4 inline-flex items-baseline gap-1.5 text-[15px] font-semibold" style={{ color: 'var(--accent-lit)' }}>
                <span className="tabular-nums">{standing.points.toLocaleString()}</span>
                <span className="text-sm font-medium opacity-80">total points</span>
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 font-semiwide text-2xl font-extrabold leading-tight text-white/85">Not ranked yet</p>
              <p className="mt-2 max-w-[15rem] text-sm text-white/55">
                Any submitted score puts {unrankedSubject} on the global board.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Key figures */}
      <dl className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label} className="flex flex-col-reverse gap-1 bg-navy px-6 py-5 sm:px-8">
            <dt className="text-[13px] text-white/55">{f.label}</dt>
            <dd className="flex items-baseline gap-1 font-semiwide text-[1.75rem] font-extrabold leading-none tabular-nums">
              {f.loading ? (
                <span className="h-7 w-14 animate-pulse rounded-md bg-white/10" />
              ) : (
                <>
                  <AnimatedNumber value={f.value} />
                  {f.suffix && <span className="text-lg font-bold">{f.suffix}</span>}
                  {f.of !== undefined && <span className="ml-0.5 text-base font-bold text-white/40">/ {f.of}</span>}
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </motion.section>
  );
}

/** A quiet chip for the night card (role, "You", presence…). `tone="accent"` fills it with the player's colour. */
export function CardChip({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'accent' }) {
  if (tone === 'accent')
    return (
      <span className="rounded-full px-2.5 py-0.5 text-[13px] font-semibold text-navy" style={{ backgroundColor: 'var(--accent-lit)' }}>
        {children}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[13px] font-medium text-white/85">
      {children}
    </span>
  );
}

/** Presence line: green dot when online, otherwise "Last seen …". */
export function Presence({ online, text }: { online: boolean; text: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-white/60">
      <span className={cn('size-1.5 rounded-full', online ? 'bg-emerald-400' : 'bg-white/35')} aria-hidden="true" />
      {online ? 'Online now' : text}
    </span>
  );
}

/** Section title for the content under the card: a plain heading with an optional note on the right. */
export function SectionHeader({ id, title, note }: { id: string; title: string; note?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id={id} className="text-lg font-bold tracking-tight text-ink">
        {title}
      </h2>
      {note && <p className="min-w-0 text-sm text-ink-faint">{note}</p>}
    </div>
  );
}

/** Loading shape of the card (portrait, name, standing, figures rail). */
export function PlayerCardSkeleton() {
  const block = 'animate-pulse rounded-lg bg-white/[0.07]';
  return (
    <div className="overflow-hidden rounded-[28px] bg-navy ring-1 ring-white/[0.08]" aria-hidden="true">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:gap-7">
          <div className={cn(block, 'size-24 shrink-0 rounded-[24px] sm:size-[7.5rem]')} />
          <div className="flex-1 space-y-3">
            <div className={cn(block, 'h-11 w-72 max-w-full')} />
            <div className={cn(block, 'h-5 w-48')} />
            <div className={cn(block, 'mt-5 h-4 w-full max-w-lg')} />
            <div className={cn(block, 'h-4 w-2/3 max-w-sm')} />
          </div>
        </div>
        <div className="space-y-3 lg:justify-self-end">
          <div className={cn(block, 'h-4 w-24')} />
          <div className={cn(block, 'h-11 w-28')} />
          <div className={cn(block, 'h-4 w-40')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 bg-navy px-6 py-5 sm:px-8">
            <div className={cn(block, 'h-7 w-16')} />
            <div className={cn(block, 'h-3.5 w-24')} />
          </div>
        ))}
      </div>
    </div>
  );
}
