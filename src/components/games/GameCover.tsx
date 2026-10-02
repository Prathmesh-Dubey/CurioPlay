import { useState } from 'react';
import { motion } from 'motion/react';
import { Gamepad2 } from 'lucide-react';
import type { Game } from '@/api/api';
import { OrbitLines } from '@/components/ui/Decor';
import { cn } from '@/lib/utils';
import { hashString } from './format';

/** Paper-toned fields for covers without art (no gold: gold is reserved for rewards). */
const LIGHT_FIELDS = [
  'bg-gradient-to-br from-brand-soft via-surface-2 to-rose-soft',
  'bg-gradient-to-br from-rose-soft via-surface to-surface-2',
  'bg-gradient-to-br from-surface-2 via-rose-soft to-brand-soft',
];

interface GameCoverProps {
  game: Pick<Game, 'id' | 'title' | 'thumbnail'>;
  /** `night` composes the fallback art for deep-forest surfaces. */
  tone?: 'light' | 'night';
  className?: string;
  /** Load eagerly (above-the-fold art). */
  priority?: boolean;
  /** Drop the centre glyph when a title is set over the cover. */
  bare?: boolean;
  /** Called once the cover image has loaded (masonry pins read its natural shape). */
  onImageLoad?: (img: HTMLImageElement) => void;
}

/**
 * Fills its (relative) parent with the game's cover art, or a composed "specimen plate" when there is none.
 * Uses `layout` so it stays undistorted while a parent morphs (card → detail sheet). Hover zoom is applied by
 * the caller through the CSS `scale`/`translate` properties, which never fight motion's `transform`.
 */
export function GameCover({ game, tone = 'light', className, priority, bare, onImageLoad }: GameCoverProps) {
  const [failed, setFailed] = useState(false);
  const base = 'absolute inset-0 size-full transition-[scale,translate] duration-700 ease-out-expo';

  if (game.thumbnail && !failed) {
    return (
      <motion.img
        layout
        src={game.thumbnail}
        alt={`Cover art for ${game.title}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setFailed(true)}
        onLoad={onImageLoad && ((e) => onImageLoad(e.currentTarget))}
        className={cn(base, 'object-cover', className)}
      />
    );
  }

  const seed = hashString(game.id || game.title);
  const initial = (game.title.trim()[0] ?? 'G').toUpperCase();
  const night = tone === 'night';

  return (
    <motion.div
      layout
      role="img"
      aria-label={`Cover for ${game.title}`}
      className={cn(base, 'overflow-hidden [container-type:size]', night ? 'bg-navy-2' : LIGHT_FIELDS[seed % LIGHT_FIELDS.length], className)}
    >
      {night && (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(90%_70%_at_72%_18%,rgb(205_232_255/0.14),transparent_70%)]"
        />
      )}
      <OrbitLines
        animate={false}
        night={night}
        className="absolute left-[62%] top-[46%] aspect-square w-[118cqmax] -translate-x-1/2 -translate-y-1/2"
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -bottom-[0.16em] left-[0.05em] select-none font-wide text-[74cqh] font-extrabold leading-none',
          night ? 'text-white/[0.06]' : 'text-ink/[0.06]',
        )}
      >
        {initial}
      </span>
      {!bare && (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 grid size-[clamp(2.75rem,24cqmin,4.5rem)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-line bg-surface/85 text-brand-strong shadow-card backdrop-blur-sm"
        >
          <Gamepad2 className="size-1/2" />
        </span>
      )}
    </motion.div>
  );
}
