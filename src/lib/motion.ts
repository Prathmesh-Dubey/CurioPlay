import type { Transition, Variant, Variants } from 'motion/react';

/**
 * CurioPlay motion language — "observe, then reveal". See DESIGN.md §5.
 * Import these instead of hand-writing easings/durations in components.
 */
export const ease = {
  /** Entrances and reveals. */
  out: [0.16, 1, 0.3, 1] as const,
  /** State swaps, morphs, panel changes. */
  inOut: [0.65, 0, 0.35, 1] as const,
  /** Exits. */
  in: [0.7, 0, 0.84, 0] as const,
};

export const dur = {
  micro: 0.15,
  fast: 0.25,
  base: 0.4,
  slow: 0.7,
  cinematic: 1.1,
};

export const spring = {
  /** Toggles, pills, active indicators. */
  snappy: { type: 'spring', stiffness: 420, damping: 32 } as Transition,
  /** Cards, dialogs, sheets. */
  soft: { type: 'spring', bounce: 0.15, duration: 0.6 } as Transition,
  /** Playful pop for rewards (achievement unlocks). */
  pop: { type: 'spring', bounce: 0.45, duration: 0.7 } as Transition,
};

export const stagger = { list: 0.05, cards: 0.08, hero: 0.12 };

/** Fade + rise, the default reveal. */
export const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.out } },
};

/** Smaller reveal for dense lists. */
export const revealSm: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: dur.base, ease: ease.out } },
};

/** Container that staggers children with the given gap. */
export const staggerContainer = (gap = stagger.cards, delay = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: gap, delayChildren: delay } },
});

/** Shared "in view once" options. */
export const viewOnce = { once: true, margin: '-80px' } as const;

/**
 * Page/tab transition used by the dashboard shell. Opacity + translate only — no filter,
 * which would create a containing block and trap `position: fixed` overlays inside the panel.
 */
export const pageTransition: { enter: Variant; center: Variant; exit: Variant } = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
  exit: { opacity: 0, y: -6, transition: { duration: dur.micro, ease: ease.in } },
};
