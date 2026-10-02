import { memo, useState } from 'react';
import { FlaskConical, Gamepad2, Play } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { CornerTicks } from '@/components/ui/Decor';
import { cn } from '@/lib/utils';

type Kind = 'game' | 'simulator';

const COVER_GRADIENTS = [
  'from-brand-soft via-surface-2 to-rose-soft',
  'from-rose-soft via-surface-2 to-gold-soft',
  'from-gold-soft via-surface-2 to-brand-soft',
];

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface CoverPreviewProps {
  kind: Kind;
  /** Stable seed for the composed fallback (the edit id, or a constant for drafts). */
  seed: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  failed: boolean;
  onImageError: () => void;
  className?: string;
}

/**
 * The library card, rendered live from the form: cover (image or the composed fallback the
 * library uses), category, title, two-line description and the play action — so authors see
 * exactly what players will see. Purely presentational; nothing in it is interactive.
 */
export const CoverPreview = memo(function CoverPreview({
  kind,
  seed,
  title,
  description,
  category,
  thumbnail,
  failed,
  onImageError,
  className,
}: CoverPreviewProps) {
  const src = thumbnail.trim();
  const showImage = !!src && !failed;
  // Track which src finished loading (derived, so a cached image can never race a reset effect).
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src;

  const gradient = COVER_GRADIENTS[hashString(seed) % COVER_GRADIENTS.length];
  const name = title.trim();
  const initial = (name[0] ?? (kind === 'simulator' ? 'S' : 'G')).toUpperCase();
  const Icon = kind === 'simulator' ? FlaskConical : Gamepad2;

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none select-none overflow-hidden rounded-[24px] border border-line bg-surface shadow-soft', className)}
    >
      <div className={cn('relative aspect-[16/10] overflow-hidden', showImage ? 'bg-surface-2' : kind === 'simulator' ? 'bg-brand-soft' : cn('bg-gradient-to-br', gradient))}>
        {showImage ? (
          <>
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setLoadedSrc(src)}
              onError={onImageError}
              className={cn('size-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
            />
            {!loaded && <div className="skeleton-shimmer absolute inset-0" />}
            <div className="absolute inset-0 bg-gradient-to-t from-navy/35 via-transparent to-transparent" />
          </>
        ) : kind === 'simulator' ? (
          <>
            <div className="bg-graph absolute inset-0" />
            <svg viewBox="0 0 200 120" className="absolute inset-0 size-full text-brand/50" preserveAspectRatio="none">
              <path
                d={`M0 ${90 - (hashString(seed) % 20)} C 40 ${40 + (hashString(seed) % 30)}, 80 100, 120 55 S 180 30, 200 ${45 + (hashString(seed) % 25)}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid size-14 place-items-center rounded-2xl border border-line bg-surface/85 text-brand-strong shadow-card">
                <Icon className="size-7" />
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="absolute -bottom-10 -right-2 text-[11rem] font-black leading-none text-ink/[0.04]">{initial}</span>
            <span className="absolute -left-10 -top-10 size-40 rounded-full border border-brand/20" />
            <span className="absolute left-6 top-6 size-24 rounded-full border border-rose/40" />
            <span className="absolute -right-6 bottom-8 size-28 rounded-full bg-gold/15" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid size-16 place-items-center rounded-2xl border border-line bg-surface/80 text-brand-strong shadow-card">
                <Icon className="size-8" />
              </div>
            </div>
          </>
        )}
        {kind === 'simulator' && (
          <>
            <CornerTicks className="text-brand-strong/60" />
            <span className="label-mono absolute bottom-3 left-4 rounded bg-surface/90 px-1.5 py-0.5 text-[9px] text-ink-muted">FIG. NEW</span>
          </>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {category.trim() ? <Badge tone="brand">{category.trim()}</Badge> : <Badge tone="neutral">No category</Badge>}
        <h3 className={cn('mt-2.5 line-clamp-2 text-lg font-extrabold', name ? 'text-ink' : 'text-ink-faint')}>
          {name || `Untitled ${kind}`}
        </h3>
        <p className="mt-1.5 line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed text-ink-muted">{description.trim() || 'No description yet.'}</p>
        <span className={buttonClasses('primary', 'sm', 'mt-4 h-11 w-full')}>
          <Play className="size-4 fill-current" /> {kind === 'simulator' ? 'Launch' : 'Play'}
        </span>
      </div>
    </div>
  );
});
