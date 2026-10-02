import { memo, useId, useLayoutEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { motion, useReducedMotion, type SpringOptions } from 'motion/react';
import { ArrowUpRight, MoreHorizontal, Pencil, Play, Trash2, X } from 'lucide-react';
import type { Game } from '@/api/api';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Menu, type MenuItem } from '@/components/ui/Overlay';
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTrigger,
} from '@/components/motion/morphing-dialog';
import { Spotlight } from '@/components/motion/spotlight';
import { Tilt } from '@/components/motion/tilt';
import { applyCoverRatio, coverRatioStyle } from '@/lib/masonry';
import { dur, ease, spring } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { GameCover } from './GameCover';
import { addedLabel, formatDate, hashString, rectOf, type LaunchRect } from './format';
import { useCanHover } from '@/hooks/useMediaQuery';

/**
 * card      – a masonry pin: the cover at its own proportions, then the notes and a catalogue footer.
 * ticket    – the marquee's stacked pair: horizontal stub.
 * spotlight – the marquee's lead exhibit: full-bleed poster with a night scrim.
 */
export type ExhibitVariant = 'card' | 'ticket' | 'spotlight';

export interface LaunchRequest {
  /** Where the Stage should expand from. */
  origin: LaunchRect | null;
  /** Element to refocus once the Stage closes. */
  returnFocus: HTMLElement | null;
}

export interface GameExhibitProps {
  game: Game;
  /** Catalogue number, e.g. "07". */
  plate: string;
  variant: ExhibitVariant;
  canManage: boolean;
  busy: boolean;
  onLaunch: (game: Game, request: LaunchRequest) => void;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
}

/* ------------------------------------------------------------------ */
/* Class recipes                                                       */
/* ------------------------------------------------------------------ */

/** Hidden until the card is hovered/focused — only where hover exists. Always visible on touch; stays while its menu is open. */
const REVEAL =
  'transition-[opacity,translate] duration-300 ease-out-expo ' +
  '[@media(hover:hover)_and_(pointer:fine)]:[[data-exhibit]:not(:hover):not(:focus-within):not(:has([aria-haspopup=menu][aria-expanded=true]))_&]:opacity-0 ' +
  '[@media(hover:hover)_and_(pointer:fine)]:[[data-exhibit]:not(:hover):not(:focus-within):not(:has([aria-haspopup=menu][aria-expanded=true]))_&]:translate-y-1.5';

/** Slow zoom + slight pan of the cover art on hover (CSS scale/translate, not transform). */
const COVER_ZOOM = 'group-hover/exhibit:scale-[1.06] group-hover/exhibit:-translate-y-[1.5%]';

/** Cursor light: overrides the primitive's raw-palette gradient with a soft white glow. */
const SPOTLIGHT = 'z-[1] bg-[radial-gradient(circle_at_center,rgb(255_255_255/0.55),transparent_70%)] mix-blend-soft-light';

/** Mirrors spring.snappy so the tilt follows the cursor without wobble. */
const TILT_SPRING: SpringOptions = { stiffness: 420, damping: 32 };

const CLOSE_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { delay: dur.micro, duration: dur.fast } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

/** Clicks the morphing dialog's own close button so its state and body scroll lock clean up properly. */
function closeDialogFrom(el: HTMLElement) {
  el.closest<HTMLElement>('[role="dialog"]')?.querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]')?.click();
}

/* ------------------------------------------------------------------ */
/* Accessibility patches for the shared MorphingDialog                 */
/* ------------------------------------------------------------------ */

/** MorphingDialogContent points aria-labelledby/-describedby at ids nothing renders; aim them at ours. */
function DialogLabels({ titleId, descId }: { titleId: string; descId: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current?.closest('[role="dialog"]');
    if (!dialog) return;
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('aria-describedby', descId);
  }, [titleId, descId]);
  return <span ref={ref} hidden />;
}

/* ------------------------------------------------------------------ */
/* Cover frame (shared-layout element between card and detail)         */
/* ------------------------------------------------------------------ */

function CoverFrame({
  game,
  layoutId,
  canHover,
  tone,
  priority,
  bare,
  className,
  onImageLoad,
  children,
}: {
  game: Game;
  layoutId: string;
  canHover: boolean;
  tone?: 'light' | 'night';
  priority?: boolean;
  bare?: boolean;
  className?: string;
  onImageLoad?: (img: HTMLImageElement) => void;
  children?: ReactNode;
}) {
  return (
    <motion.div layoutId={layoutId} className={cn('relative overflow-hidden bg-surface-2', className)}>
      {/* The Spotlight primitive makes its parent relative + overflow-hidden, so it gets a plain in-flow box. */}
      <div className="relative size-full">
        <GameCover game={game} tone={tone} priority={priority} bare={bare} className={COVER_ZOOM} onImageLoad={onImageLoad} />
        {canHover && <Spotlight size={280} className={SPOTLIGHT} />}
        {children}
      </div>
    </motion.div>
  );
}

function PlateChip({ plate, className }: { plate: string; className?: string }) {
  return (
    <span
      className={cn(
        'label-mono pointer-events-none absolute left-3 top-3 z-[2] rounded-md bg-surface/90 px-2 py-1 text-ink shadow-soft backdrop-blur-sm',
        className,
      )}
    >
      № {plate}
    </span>
  );
}

/** `reserveEnd` keeps the right edge clear for the actions button that sits over the footer. */
function CatalogueFooter({ game, reserveEnd }: { game: Game; reserveEnd?: boolean }) {
  const category = game.category?.trim();
  return (
    <span className={cn('flex h-12 min-w-0 items-center gap-2 border-t border-line px-3.5 @3xs:px-4', reserveEnd && 'pr-12 @3xs:pr-12')}>
      {category ? (
        <Badge tone="rose" className="min-w-0 max-w-full @3xs:max-w-[60%]">
          <span className="truncate">{category}</span>
        </Badge>
      ) : (
        <span className="label-mono truncate text-ink-faint">Uncategorised</span>
      )}
      {/* Narrow pins drop the date; the detail sheet always has it. */}
      <span className="label-mono ml-auto hidden truncate text-ink-faint @3xs:block">{addedLabel(game.createdAt)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Exhibit                                                             */
/* ------------------------------------------------------------------ */

export const GameExhibit = memo(function GameExhibit({
  game,
  plate,
  variant,
  canManage,
  busy,
  onLaunch,
  onEdit,
  onDelete,
}: GameExhibitProps) {
  const uid = useId();
  const coverLayoutId = `exhibit-cover-${uid}`;
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const triggerRef = useRef<HTMLButtonElement>(null!);
  const detailCoverRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const canHover = useCanHover();
  const reduceMotion = useReducedMotion();
  // Tilt is driven by motion values (not covered by MotionConfig's reducedMotion), so gate it explicitly.
  const canTilt = canHover && !reduceMotion && variant !== 'spotlight';
  const pin = variant === 'card';

  const description = game.description?.trim() ?? '';
  const category = game.category?.trim() ?? '';

  const launchFromCard = (e: MouseEvent<HTMLButtonElement>) =>
    onLaunch(game, { origin: rectOf(triggerRef.current), returnFocus: e.currentTarget });

  const menuGroups: MenuItem[][] = [
    [{ label: 'Edit game', icon: <Pencil className="size-4" />, onSelect: () => onEdit(game) }],
    [{ label: 'Delete game', icon: <Trash2 className="size-4" />, danger: true, onSelect: () => onDelete(game) }],
  ];

  const kebab = canManage ? (
    <Menu
      label={`Actions for ${game.title}`}
      groups={menuGroups}
      className="w-52"
      trigger={
        pin ? (
          // Pins carry it in the footer row, clear of the cover's Play chip however short the cover is.
          <IconButton
            label={`More actions for ${game.title}`}
            icon={<MoreHorizontal className="size-[18px]" />}
            className="size-11 rounded-full text-ink-faint hover:text-ink sm:size-9"
          />
        ) : (
          <IconButton
            label={`More actions for ${game.title}`}
            icon={<MoreHorizontal className="size-[18px]" />}
            variant="outline"
            className="size-11 rounded-full border-line bg-surface/90 text-ink shadow-soft backdrop-blur sm:size-9"
          />
        )
      }
    />
  ) : null;

  const playChip = (
    <Button
      size="sm"
      disabled={busy}
      onClick={launchFromCard}
      aria-label={`Play ${game.title}`}
      leadingIcon={<Play className="size-3.5 fill-current" />}
      className={cn(
        'h-11 rounded-full pl-3.5 pr-4 shadow-card sm:h-9',
        // Narrow pins get a round icon button so it doesn't cover half the art.
        pin && 'aspect-square px-0 @3xs:aspect-auto @3xs:pl-3.5 @3xs:pr-4',
      )}
    >
      {pin ? <span className="sr-only @3xs:not-sr-only">Play</span> : 'Play'}
    </Button>
  );

  /* ---------- trigger body per variant ---------- */

  let body: ReactNode;
  let controls: ReactNode;

  switch (variant) {
    case 'spotlight':
      body = (
        <div data-item-id={game.id} className="relative h-full min-h-[26rem] sm:min-h-[24rem] xl:min-h-[31rem]">
          <CoverFrame game={game} layoutId={coverLayoutId} canHover={canHover} tone="night" priority bare className="absolute inset-0" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[82%] bg-gradient-to-t from-navy via-navy/60 to-transparent"
          />
          <span className="label-mono pointer-events-none absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-navy/75 px-3 py-1.5 text-night-sage backdrop-blur sm:left-7 sm:top-7">
            <span className="size-1.5 rounded-full bg-night-gold" aria-hidden="true" />
            Featured · Newest exhibit
          </span>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 block p-5 pb-[5.75rem] sm:p-8 sm:pb-[6.75rem]">
            <span className="label-mono block text-night-sage/80">
              <span className="text-night-gold">№ {plate}</span>
              {category && <> · {category}</>} · {addedLabel(game.createdAt)}
            </span>
            <span className="mt-2.5 line-clamp-2 break-words font-wide text-[2.1rem] font-extrabold leading-[0.95] text-white sm:text-5xl xl:text-[3.4rem]">
              {game.title}
            </span>
            {description && (
              <span className="mt-3 line-clamp-2 max-w-xl text-[15px] leading-relaxed text-white/75">{description}</span>
            )}
          </span>
        </div>
      );
      controls = (
        <>
          <div className="pointer-events-none absolute inset-x-5 bottom-5 z-10 flex items-center gap-2 transition-opacity duration-200 peer-aria-expanded:opacity-0 sm:inset-x-8 sm:bottom-8">
            <Button
              variant="night"
              size="lg"
              disabled={busy}
              onClick={launchFromCard}
              aria-label={`Play now: ${game.title}`}
              leadingIcon={<Play className="size-4 fill-current" />}
              className="pointer-events-auto"
            >
              Play now
            </Button>
            <Button
              variant="night-outline"
              size="lg"
              onClick={() => triggerRef.current?.click()}
              aria-label={`Details: ${game.title}`}
              trailingIcon={<ArrowUpRight className="size-4" />}
              className="pointer-events-auto hidden backdrop-blur-sm sm:inline-flex"
            >
              Details
            </Button>
          </div>
          {kebab && (
            <div className="absolute right-4 top-4 z-10 transition-opacity duration-200 peer-aria-expanded:opacity-0 sm:right-6 sm:top-6">
              {kebab}
            </div>
          )}
        </>
      );
      break;

    case 'ticket':
      body = (
        <div data-item-id={game.id} className="flex h-full min-h-[10.5rem]">
          <CoverFrame game={game} layoutId={coverLayoutId} canHover={canHover} className="w-[40%] shrink-0 self-stretch" />
          <span className={cn('flex min-w-0 flex-1 flex-col p-4 sm:p-5', canManage && 'pr-14')}>
            <span className="label-mono truncate text-ink-faint">
              № {plate}
              {category && <> · {category}</>}
            </span>
            <span className="mt-1.5 line-clamp-2 break-words font-semiwide text-lg font-extrabold leading-tight text-ink">{game.title}</span>
            {description && <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">{description}</span>}
            <span className="label-mono mt-auto pt-3 text-ink-faint">{addedLabel(game.createdAt)}</span>
          </span>
        </div>
      );
      controls = (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[40%] transition-opacity duration-200 peer-aria-expanded:opacity-0">
            <div className={cn('pointer-events-auto absolute bottom-3 left-3', REVEAL)}>{playChip}</div>
          </div>
          {kebab && (
            <div className={cn('absolute right-2.5 top-2.5 z-10 transition-opacity duration-200 peer-aria-expanded:opacity-0', REVEAL)}>
              {kebab}
            </div>
          )}
        </>
      );
      break;

    default:
      // Pin: the cover keeps its own shape (`--cover-ratio`, measured on load) and the notes run to their own
      // length, so the masonry wall gets its rhythm from the collection itself.
      body = (
        <div data-item-id={game.id} className="flex flex-col">
          <CoverFrame
            game={game}
            layoutId={coverLayoutId}
            canHover={canHover}
            className="aspect-[var(--cover-ratio)] shrink-0"
            onImageLoad={(img) => applyCoverRatio(img, shellRef.current)}
          >
            <PlateChip plate={plate} className="left-2.5 top-2.5" />
          </CoverFrame>
          <span className="block px-3.5 pb-3.5 pt-3 @3xs:px-4 @3xs:pb-4 @3xs:pt-3.5">
            <span className="line-clamp-2 break-words text-[15px] font-bold leading-snug text-ink @3xs:text-[17px]">{game.title}</span>
            {description && (
              <span className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-ink-muted @3xs:mt-1.5 @3xs:line-clamp-5 @3xs:text-sm">
                {description}
              </span>
            )}
          </span>
          <CatalogueFooter game={game} reserveEnd={!!kebab} />
        </div>
      );
      controls = (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 aspect-[var(--cover-ratio)] transition-opacity duration-200 peer-aria-expanded:opacity-0">
            <div className={cn('pointer-events-auto absolute bottom-2.5 right-2.5', REVEAL)}>{playChip}</div>
          </div>
          {kebab && (
            <div className={cn('absolute bottom-0.5 right-0.5 z-10 transition-opacity duration-200 peer-aria-expanded:opacity-0 sm:bottom-1.5 sm:right-1.5', REVEAL)}>
              {kebab}
            </div>
          )}
        </>
      );
  }

  const radius = variant === 'spotlight' ? 28 : 20;

  const shell = (
    <div
      ref={shellRef}
      data-exhibit=""
      className={cn('group/exhibit relative h-full transition-[translate] duration-300 ease-out-expo hover:-translate-y-0.5', pin && '@container')}
      style={pin ? coverRatioStyle(game.thumbnail, hashString(game.id || game.title)) : undefined}
    >
      <MorphingDialogTrigger
        triggerRef={triggerRef}
        label={`${game.title}: view details`}
        className={cn(
          'peer block h-full w-full overflow-hidden border border-line text-left',
          'transition-[box-shadow,border-color,scale] duration-300 ease-out-expo active:scale-[0.985]',
          'group-hover/exhibit:border-brand/40 group-hover/exhibit:shadow-card',
          variant === 'spotlight' ? 'bg-navy shadow-card' : 'bg-surface shadow-soft',
        )}
        style={{ borderRadius: radius }}
      >
        {body}
      </MorphingDialogTrigger>
      {controls}
    </div>
  );

  /* ---------- detail sheet actions ---------- */

  const launchFromDialog = (e: MouseEvent<HTMLButtonElement>) => {
    const origin = rectOf(detailCoverRef.current);
    closeDialogFrom(e.currentTarget);
    onLaunch(game, { origin, returnFocus: triggerRef.current });
  };

  const editFromDialog = (e: MouseEvent<HTMLButtonElement>) => {
    closeDialogFrom(e.currentTarget);
    onEdit(game);
  };

  const deleteFromDialog = (e: MouseEvent<HTMLButtonElement>) => {
    closeDialogFrom(e.currentTarget);
    onDelete(game);
  };

  return (
    <MorphingDialog transition={spring.soft}>
      {canTilt ? (
        <Tilt rotationFactor={variant === 'card' ? 5 : 3} springOptions={TILT_SPRING} className="h-full">
          {shell}
        </Tilt>
      ) : (
        shell
      )}

      <MorphingDialogContainer>
        <MorphingDialogContent
          className={cn(
            'relative flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col border border-line bg-surface shadow-float',
            'sm:grid sm:h-[min(36rem,88dvh)] sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] sm:grid-rows-[minmax(0,1fr)]',
          )}
          style={{ borderRadius: 28 }}
        >
          <DialogLabels titleId={titleId} descId={descId} />

          <motion.div
            ref={detailCoverRef}
            layoutId={coverLayoutId}
            className="relative aspect-[16/10] shrink-0 overflow-hidden bg-surface-2 sm:aspect-auto sm:h-full"
          >
            <GameCover game={game} priority />
            <PlateChip plate={plate} className="left-4 top-4" />
          </motion.div>

          <MorphingDialogClose
            variants={CLOSE_VARIANTS}
            className="right-3 top-3 z-10 grid size-11 place-items-center rounded-full border border-line bg-surface/90 text-ink shadow-card backdrop-blur transition-colors hover:bg-surface"
          >
            <X className="size-5" />
          </MorphingDialogClose>

          <motion.div
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out, delay: dur.micro } }}
            exit={{ opacity: 0, transition: { duration: dur.micro } }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pt-8">
              <p className="label-mono flex items-center gap-2.5 pr-12 text-ink-faint">
                <span className="text-gold-strong">№ {plate}</span>
                <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
                <span>The Arcade Wing</span>
              </p>
              <h2 id={titleId} className="mt-3 break-words font-semiwide text-[1.9rem] font-extrabold leading-[1.02] text-ink sm:text-[2.3rem]">
                {game.title}
              </h2>
              {category && (
                <Badge tone="rose" className="mt-4">
                  {category}
                </Badge>
              )}
              <p id={descId} className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-muted">
                {description || 'No description has been added for this game yet.'}
              </p>

              <dl className="mt-6 grid grid-cols-2 border-t border-line text-sm">
                <div className="border-b border-r border-line py-3 pr-3">
                  <dt className="label-mono text-ink-faint">Catalogued</dt>
                  <dd className="mt-1 font-semibold text-ink">{formatDate(game.createdAt)}</dd>
                </div>
                <div className="border-b border-line py-3 pl-4">
                  <dt className="label-mono text-ink-faint">Last updated</dt>
                  <dd className="mt-1 font-semibold text-ink">{formatDate(game.updatedAt)}</dd>
                </div>
                <div className="border-b border-r border-line py-3 pr-3">
                  <dt className="label-mono text-ink-faint">Category</dt>
                  <dd className="mt-1 truncate font-semibold text-ink">{category || 'Uncategorised'}</dd>
                </div>
                <div className="border-b border-line py-3 pl-4">
                  <dt className="label-mono text-ink-faint">Scores</dt>
                  <dd className="mt-1 font-semibold text-ink">Leaderboard</dd>
                </div>
              </dl>
            </div>

            {/* Launch gets the full row; the admin pair sits under it (three buttons don't fit the half-sheet). */}
            <div className="flex shrink-0 flex-col gap-2 border-t border-line bg-surface p-4 sm:px-8 sm:py-5">
              <Button
                size="lg"
                className="w-full"
                disabled={busy}
                onClick={launchFromDialog}
                leadingIcon={<Play className="size-4 fill-current" />}
              >
                Launch game
              </Button>
              {canManage && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={editFromDialog} leadingIcon={<Pencil className="size-4" />}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 hover:border-red-500/60 hover:text-red-600 dark:hover:text-red-400"
                    onClick={deleteFromDialog}
                    leadingIcon={<Trash2 className="size-4" />}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
});
