import { useBackClose } from '@/lib/backStack';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Award } from 'lucide-react';
import type { UserAchievement } from '@/api/api';
import { Button } from '@/components/ui/Button';
import { CornerTicks } from '@/components/ui/Decor';
import { useFocusTrap, useScrollLock } from '@/components/ui/Overlay';
import { dur, ease, spring, stagger } from '@/lib/motion';

/* ------------------------------------------------------------------ */
/* Medal: engraved blank → struck in gold → one pass of light          */
/* ------------------------------------------------------------------ */

const TICKS = Array.from({ length: 40 }, (_, i) => i * 9);

function MedalFace({ struck, gradientId }: { struck: boolean; gradientId: string }) {
  const rim = struck ? 'var(--cp-gold-strong)' : 'var(--cp-line-strong)';
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 size-full" aria-hidden="true">
      {struck && (
        <defs>
          <radialGradient id={gradientId} cx="34%" cy="28%" r="78%">
            <stop offset="0%" stopColor="var(--cp-gold-soft)" />
            <stop offset="42%" stopColor="var(--cp-gold)" />
            <stop offset="100%" stopColor="var(--cp-gold-strong)" />
          </radialGradient>
        </defs>
      )}
      <circle cx="60" cy="60" r="57" fill={struck ? `url(#${gradientId})` : 'var(--cp-surface-2)'} stroke={rim} strokeWidth="1.5" />
      <circle cx="60" cy="60" r="44" fill="none" stroke={rim} strokeOpacity={struck ? 0.55 : 0.8} strokeWidth="1" strokeDasharray="1.2 3" />
      {TICKS.map((a) => (
        <line key={a} x1="60" y1="6.5" x2="60" y2="11" stroke={rim} strokeOpacity={struck ? 0.5 : 0.7} strokeWidth="1" transform={`rotate(${a} 60 60)`} />
      ))}
    </svg>
  );
}

function Medal({ reduce }: { reduce: boolean }) {
  const gradientId = `medal-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <motion.div
      className="relative mx-auto size-28 sm:size-32"
      initial={reduce ? false : { scale: 0.55, rotate: -14 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ ...spring.pop, delay: dur.micro }}
    >
      {/* engraved, unearned state */}
      <MedalFace struck={false} gradientId={gradientId} />
      <span className="absolute inset-0 grid place-items-center text-ink-faint">
        <Award className="size-12" strokeWidth={1.4} />
      </span>

      {/* struck in gold: revealed from the centre outward */}
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-full"
        initial={reduce ? false : { clipPath: 'circle(0% at 50% 60%)' }}
        animate={{ clipPath: 'circle(72% at 50% 50%)' }}
        transition={{ duration: dur.slow, ease: ease.out, delay: dur.base }}
      >
        <MedalFace struck gradientId={gradientId} />
        <span className="absolute inset-0 grid place-items-center text-navy/75">
          <Award className="size-12" strokeWidth={1.6} />
        </span>
        {!reduce && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1/3"
            initial={{ x: '-150%' }}
            animate={{ x: '420%' }}
            transition={{ duration: dur.cinematic, ease: ease.inOut, delay: dur.slow + dur.base }}
          >
            <span className="block h-full w-full -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent mix-blend-soft-light" />
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

interface AchievementUnlockProps {
  items: UserAchievement[];
  onClose: () => void;
}

/**
 * The reward moment after a score unlocks achievements. Titles/descriptions come straight from the API.
 * Portals into the fullscreen element when the Stage is fullscreen, so it is never hidden behind it.
 */
export function AchievementUnlock({ items, onClose }: AchievementUnlockProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const reduce = !!useReducedMotion();
  useFocusTrap(panelRef, true);
  useScrollLock(true);
  useBackClose(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const many = items.length > 1;
  const first = items[0];
  const host = (document.fullscreenElement as HTMLElement | null) ?? document.body;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: dur.fast } }}
      transition={{ duration: dur.fast }}
    >
      <div className="absolute inset-0 bg-navy/70 backdrop-blur-sm" aria-hidden="true" />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={spring.soft}
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-line bg-surface px-6 pb-6 pt-10 text-center shadow-float outline-none sm:px-9 sm:pb-8 sm:pt-12"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-gold-soft to-transparent" aria-hidden="true" />
        <CornerTicks inset={14} />

        <Medal reduce={reduce} />

        <p className="label-mono relative mt-7 text-gold-strong">
          {many ? `${items.length} medals unlocked` : 'Medal unlocked'}
        </p>
        <h2 id={titleId} className="relative mt-2 font-semiwide text-[1.65rem] font-extrabold leading-tight text-ink sm:text-3xl">
          {many ? 'New entries in your cabinet' : first.achievementTitle}
        </h2>

        {many ? (
          <>
            <p id={descId} className="sr-only">
              {items.map((a) => a.achievementTitle).join(', ')}
            </p>
            <ul className="relative mt-5 max-h-56 divide-y divide-line overflow-y-auto rounded-2xl border border-line text-left">
              {items.map((a, i) => (
                <motion.li
                  key={a.id}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dur.slow + i * stagger.list, duration: dur.base, ease: ease.out }}
                  className="flex items-start gap-3 bg-surface px-4 py-3"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-gold/50 bg-gold-soft text-gold-strong">
                    <Award className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{a.achievementTitle}</span>
                    {a.achievementDescription && (
                      <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{a.achievementDescription}</span>
                    )}
                  </span>
                </motion.li>
              ))}
            </ul>
          </>
        ) : (
          <p id={descId} className="relative mx-auto mt-2.5 max-w-xs text-[15px] leading-relaxed text-ink-muted">
            {first.achievementDescription || 'A new medal has been entered into your cabinet.'}
          </p>
        )}

        <Button size="lg" className="relative mt-7 w-full" onClick={onClose} data-autofocus="">
          Claim
        </Button>
      </motion.div>
    </motion.div>,
    host,
  );
}
