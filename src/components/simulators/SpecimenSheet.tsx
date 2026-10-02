import { memo, useMemo, useRef, useState, type MouseEvent } from 'react';
import { FlaskConical, MoreHorizontal, Pencil, Play, Trash2, X } from 'lucide-react';
import type { Simulator } from '@/api/api';
import { cn } from '@/lib/utils';
import { applyCoverRatio, coverRatioStyle } from '@/lib/masonry';
import { spring } from '@/lib/motion';
import { Button, IconButton, Spinner } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Overlay';
import { CornerTicks } from '@/components/ui/Decor';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogSubtitle,
  MorphingDialogTitle,
  MorphingDialogTrigger,
} from '@/components/motion/morphing-dialog';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export interface OriginRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function rectOf(el: Element | null | undefined): OriginRect | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function timeOf(value: string | null | undefined): number {
  const t = value ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

export function formatDate(value: string | null | undefined): string {
  const t = timeOf(value);
  if (!t) return 'Unknown';
  return new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const expCode = (n: number) => `EXP-${String(n).padStart(3, '0')}`;
export const figCode = (n: number) => `Fig. ${String(n).padStart(2, '0')}`;

/** Closes the morphing dialog that contains `el` (the primitive has no imperative close). */
function closeDialogFrom(el: HTMLElement) {
  el.closest<HTMLElement>('[role="dialog"]')?.querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]')?.click();
}

/* ------------------------------------------------------------------ */
/* Measurement pieces                                                  */
/* ------------------------------------------------------------------ */

/** A measuring-tape rule: minor ticks every 8px, major every 40px. */
export function Ruler({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('h-2.5 border-b border-line-strong text-line-strong', className)}
      style={{
        backgroundImage:
          'repeating-linear-gradient(to right, currentColor 0 1px, transparent 1px 8px),' +
          'repeating-linear-gradient(to right, currentColor 0 1px, transparent 1px 40px)',
        backgroundSize: '100% 4px, 100% 10px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left bottom, left bottom',
      }}
    />
  );
}

/** Deterministic pseudo-random sequence for figure art. */
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const FIG_W = 320;
const FIG_H = 240;
const OX = 30;
const OY = 210;

/** Plotted "figure" used when a simulator has no thumbnail — a different experiment per seed. */
function GraphArt({ seed }: { seed: number }) {
  const kind = seed % 5;
  const plotW = FIG_W - OX - 18;
  const plotH = OY - 22;

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const x = OX + t * plotW;
      let y = 0.5;
      if (kind === 0) y = 0.5 + Math.sin(t * Math.PI * (3 + (seed % 3)) + (seed % 7)) * 0.32;
      else if (kind === 1) y = 0.08 + 0.84 / (1 + Math.exp(-(t - 0.45) * 11));
      else if (kind === 2) y = 0.5 + Math.sin(t * Math.PI * 7) * Math.exp(-t * 3.2) * 0.42;
      if (kind <= 2) pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${(OY - y * plotH).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [kind, seed, plotW, plotH]);

  const scatter = useMemo(() => {
    if (kind !== 4) return [];
    const r = rng(seed);
    return Array.from({ length: 18 }, (_, i) => {
      const t = (i + r() * 0.8) / 18;
      return { x: OX + 8 + t * (plotW - 16), y: OY - (0.15 + t * 0.62 + (r() - 0.5) * 0.22) * plotH };
    });
  }, [kind, seed, plotW, plotH]);

  return (
    <svg
      viewBox={`0 0 ${FIG_W} ${FIG_H}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full text-brand-strong"
      aria-hidden="true"
    >
      {/* axes + ticks */}
      <g stroke="currentColor" strokeOpacity="0.45" strokeWidth="1">
        <line x1={OX} y1={OY} x2={FIG_W - 12} y2={OY} />
        <line x1={OX} y1={OY} x2={OX} y2={14} />
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`x${i}`} x1={OX + (i + 1) * 28} y1={OY} x2={OX + (i + 1) * 28} y2={OY + 5} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`y${i}`} x1={OX - 5} y1={OY - (i + 1) * 30} x2={OX} y2={OY - (i + 1) * 30} />
        ))}
      </g>

      {kind <= 2 && (
        <>
          <path d={curve} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={OX + plotW * 0.62} cy={OY - plotH * 0.5} r="3.5" fill="currentColor" opacity="0.9" />
        </>
      )}

      {kind === 3 && (
        <g transform={`rotate(${-18 + (seed % 30)} ${OX + plotW / 2} ${OY - plotH / 2})`}>
          <ellipse
            cx={OX + plotW / 2}
            cy={OY - plotH / 2}
            rx={plotW * 0.36}
            ry={plotH * 0.24}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />
          <ellipse cx={OX + plotW / 2} cy={OY - plotH / 2} rx={plotW * 0.2} ry={plotH * 0.13} fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.25" />
          <circle cx={OX + plotW / 2 - plotW * 0.08} cy={OY - plotH / 2} r="7" fill="currentColor" />
          <circle cx={OX + plotW / 2 + plotW * 0.36} cy={OY - plotH / 2} r="4" fill="currentColor" />
        </g>
      )}

      {kind === 4 && (
        <>
          <line x1={OX + 8} y1={OY - 0.15 * plotH} x2={OX + plotW - 8} y2={OY - 0.77 * plotH} stroke="currentColor" strokeWidth="1.75" strokeDasharray="6 5" />
          {scatter.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.2" fill="currentColor" opacity="0.85" />
          ))}
        </>
      )}
    </svg>
  );
}

/**
 * Framed plate: a mat with crop marks around the thumbnail (or a plotted figure). `fluid` lets the window take the
 * shape in `--cover-ratio` (masonry cards) instead of the fixed 4:3 used by the full sheet.
 */
export function Plate({
  sim,
  className,
  imgClassName,
  fluid,
  onImageLoad,
}: {
  sim: Simulator;
  className?: string;
  imgClassName?: string;
  fluid?: boolean;
  onImageLoad?: (img: HTMLImageElement) => void;
}) {
  const [failed, setFailed] = useState(false);
  const seed = useMemo(() => hashString(sim.id || sim.title), [sim.id, sim.title]);
  const inactive = sim.active === false;
  const showImage = !!sim.thumbnail && !failed;

  return (
    <div className={cn('relative rounded-xl border border-line bg-surface-2/60 p-2.5', className)}>
      <CornerTicks size={6} inset={3} className="text-ink-faint" />
      <div
        className={cn(
          'relative overflow-hidden rounded-md border border-line-strong/70 bg-surface',
          fluid ? 'aspect-[var(--cover-ratio)]' : 'aspect-[4/3]',
        )}
      >
        {showImage ? (
          <img
            src={sim.thumbnail ?? ''}
            alt={`${sim.title} preview`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            onLoad={onImageLoad && ((e) => onImageLoad(e.currentTarget))}
            className={cn('size-full object-cover', inactive && 'grayscale', imgClassName)}
          />
        ) : (
          <div role="img" aria-label={`${sim.title}: plotted figure`} className={cn('absolute inset-0 bg-graph', inactive && 'opacity-60')}>
            <GraphArt seed={seed} />
          </div>
        )}
        {inactive && (
          <span className="label-mono absolute right-2.5 top-2.5 -rotate-6 rounded-md border-2 border-ink/50 bg-surface/90 px-2 py-0.5 text-ink-muted">
            Inactive
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Specimen sheet (card) + full sheet (morphing dialog)                */
/* ------------------------------------------------------------------ */

interface SpecimenSheetProps {
  sim: Simulator;
  index: number;
  canManage: boolean;
  canHover: boolean;
  busy: boolean;
  deleting: boolean;
  onLaunch: (sim: Simulator, origin?: OriginRect) => void;
  onEdit: (sim: Simulator) => void;
  onDelete: (sim: Simulator) => void;
}

export const SpecimenSheet = memo(function SpecimenSheet({
  sim,
  index,
  canManage,
  canHover,
  busy,
  deleting,
  onLaunch,
  onEdit,
  onDelete,
}: SpecimenSheetProps) {
  const code = expCode(index);
  const inactive = sim.active === false;
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null!);

  const run = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onLaunch(sim, rectOf(sheetRef.current));
  };

  const reveal = canHover
    ? 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100'
    : '';

  return (
    <MorphingDialog transition={spring.soft}>
      {/* A masonry pin: sized by its content (no h-full), the plate at the thumbnail's own shape. The sheet is a
          size container so narrow columns drop the figure ruler and the logged/status table. */}
      <div
        ref={sheetRef}
        data-sheet
        className={cn(
          'group relative rounded-[20px] shadow-soft transition-[translate,box-shadow,opacity] duration-300 ease-out-expo @container hover:-translate-y-1 hover:shadow-card',
          deleting && 'pointer-events-none opacity-55',
        )}
        style={coverRatioStyle(sim.thumbnail, hashString(sim.id || sim.title))}
      >
        <MorphingDialogTrigger
          triggerRef={triggerRef}
          label={`Open specimen sheet ${code}: ${sim.title}`}
          className="flex w-full flex-col overflow-hidden border border-line bg-surface text-left transition-colors duration-300 group-hover:border-brand/40"
          style={{ borderRadius: 20 }}
        >
          <div data-item-id={sim.id} className="flex w-full flex-col">
            {/* catalogue strip */}
            <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5 @3xs:px-4">
              <MorphingDialogSubtitle className="label-mono text-ink">{code}</MorphingDialogSubtitle>
              <span className="label-mono min-w-0 truncate text-ink-faint">{sim.category?.trim() || 'General'}</span>
            </div>

            {/* plate */}
            <div className="px-2 pt-2 @3xs:px-3 @3xs:pt-3">
              <Plate
                sim={sim}
                fluid
                className="p-1.5 @3xs:p-2.5"
                imgClassName="transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                onImageLoad={(img) => applyCoverRatio(img, sheetRef.current)}
              />
              <div className="mt-2 hidden items-center gap-3 px-1 @3xs:flex">
                <span className="label-mono shrink-0 text-ink-faint">{figCode(index)}</span>
                <Ruler className="min-w-0 flex-1" />
              </div>
            </div>

            {/* notes */}
            <div className="flex flex-col px-3 pb-[4.25rem] pt-3 @3xs:px-4 @3xs:pb-[4.5rem] @3xs:pt-3.5">
              <MorphingDialogTitle className="font-semiwide text-[15px] font-bold leading-snug text-ink @3xs:text-lg">{sim.title}</MorphingDialogTitle>
              <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-ink-muted @3xs:mt-1.5 @3xs:line-clamp-4 @3xs:text-sm">
                {sim.description?.trim() || 'No protocol notes yet.'}
              </p>
              <dl className="mt-3.5 hidden grid-cols-2 border-t border-line pt-3 text-[13px] @3xs:grid">
                <div className="min-w-0 pr-3">
                  <dt className="label-mono text-ink-faint">Logged</dt>
                  <dd className="mt-0.5 truncate font-medium text-ink">{formatDate(sim.createdAt)}</dd>
                </div>
                <div className="min-w-0 border-l border-line pl-3">
                  <dt className="label-mono text-ink-faint">Status</dt>
                  <dd className="mt-0.5 truncate font-medium text-ink">{inactive ? 'Inactive' : 'Ready'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </MorphingDialogTrigger>

        {/* bench footer — a tear line with the run affordance */}
        <div className="absolute inset-x-0 bottom-0 flex h-[3.75rem] items-center gap-2 border-t border-dashed border-line-strong pl-3 pr-2.5">
          <div className="relative flex h-11 min-w-0 flex-1 items-center">
            {canHover && (
              <span
                aria-hidden="true"
                className="label-mono pointer-events-none absolute inset-y-0 left-1 flex items-center gap-2 text-ink-faint transition-[opacity,translate] duration-300 ease-out-expo group-focus-within:-translate-y-1 group-focus-within:opacity-0 group-hover:-translate-y-1 group-hover:opacity-0"
              >
                <span className={cn('size-1.5 rounded-full', inactive ? 'bg-ink-faint' : 'bg-brand')} />
                {inactive ? 'Inactive' : <>Ready<span className="hidden @3xs:inline">&nbsp;to run</span></>}
              </span>
            )}
            {deleting ? (
              <span className="label-mono flex items-center gap-2 pl-1 text-ink-muted" role="status">
                <Spinner className="size-3.5" /> Removing…
              </span>
            ) : (
              <span className={cn('inline-flex transition-[opacity,translate] duration-300 ease-out-expo', reveal)}>
                <Button
                  size="sm"
                  className="h-11 lg:h-9"
                  disabled={busy}
                  onClick={run}
                  leadingIcon={<Play className="size-3.5 fill-current" />}
                  aria-label={`Run experiment ${sim.title}`}
                >
                  Run<span className="hidden @3xs:inline">&nbsp;experiment</span>
                </Button>
              </span>
            )}
          </div>

          {canManage && (
            <Menu
              label={`Actions for ${sim.title}`}
              groups={[
                [{ label: 'Edit simulator', icon: <Pencil className="size-4" />, onSelect: () => onEdit(sim) }],
                [{ label: 'Delete simulator', icon: <Trash2 className="size-4" />, danger: true, onSelect: () => onDelete(sim) }],
              ]}
              className="w-56"
              trigger={
                <IconButton
                  label={`Actions for ${sim.title}`}
                  icon={<MoreHorizontal className="size-[18px]" />}
                  className="size-11 shrink-0 lg:size-9"
                  disabled={deleting}
                />
              }
            />
          )}
        </div>
      </div>

      <MorphingDialogContainer>
        <SpecimenDetail
          sim={sim}
          index={index}
          canManage={canManage}
          busy={busy}
          onLaunch={onLaunch}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </MorphingDialogContainer>
    </MorphingDialog>
  );
});

function SpecimenDetail({
  sim,
  index,
  canManage,
  busy,
  onLaunch,
  onEdit,
  onDelete,
}: Pick<SpecimenSheetProps, 'sim' | 'index' | 'canManage' | 'busy' | 'onLaunch' | 'onEdit' | 'onDelete'>) {
  const code = expCode(index);
  const inactive = sim.active === false;
  const rows: [string, string, string?][] = [
    ['Field', sim.category?.trim() || 'General'],
    ['Logged', formatDate(sim.createdAt)],
    ['Revised', formatDate(sim.updatedAt)],
    ['Specimen ID', sim.id, 'font-mono text-[13px]'],
    ['Status', inactive ? 'Inactive — hidden from players' : 'Ready to run'],
  ];

  return (
    <MorphingDialogContent
      className="relative flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col border border-line-strong bg-surface shadow-float"
      style={{ borderRadius: 24 }}
    >
      {/* header strip */}
      <div className="flex shrink-0 items-center gap-3 border-b border-line py-2 pl-5 pr-2 sm:pl-6">
        <span className="label-mono text-ink-faint">Specimen sheet</span>
        <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
        <MorphingDialogSubtitle className="label-mono text-ink">{code}</MorphingDialogSubtitle>
        <MorphingDialogClose className="static ml-auto grid size-11 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink">
          <X className="size-5" />
        </MorphingDialogClose>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-8">
          {/* Same shape as the card's plate (measured there), so the full sheet never crops the figure. */}
          <div data-plate-host style={coverRatioStyle(sim.thumbnail, hashString(sim.id || sim.title))}>
            <Plate sim={sim} fluid onImageLoad={(img) => applyCoverRatio(img, img.closest<HTMLElement>('[data-plate-host]'))} />
            <div className="mt-2 flex items-center gap-3 px-1">
              <span className="label-mono shrink-0 text-ink-faint">{figCode(index)}</span>
              <Ruler className="min-w-0 flex-1" />
            </div>
          </div>

          <div className="min-w-0">
            <p className="label-mono text-brand-strong">{sim.category?.trim() || 'General'}</p>
            <MorphingDialogTitle className="mt-2 font-semiwide text-2xl font-extrabold leading-tight text-ink sm:text-[2rem]">
              {sim.title}
            </MorphingDialogTitle>
            <dl className="mt-5 border-t border-line text-sm">
              {rows.map(([k, v, cls]) => (
                <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-3 border-b border-line py-2.5">
                  <dt className="label-mono text-ink-faint">{k}</dt>
                  <dd className={cn('min-w-0 break-words font-medium text-ink', cls)} title={k === 'Specimen ID' ? v : undefined}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <MorphingDialogDescription
          disableLayoutAnimation
          variants={{
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: 6 },
          }}
          className="border-t border-line bg-graph px-5 py-5 sm:px-6"
        >
          <h3 className="label-mono text-ink-faint">Protocol notes</h3>
          <p className="mt-2 max-w-prose whitespace-pre-line text-[15px] leading-relaxed text-ink-muted">
            {sim.description?.trim() || 'No protocol notes have been added for this experiment yet.'}
          </p>
        </MorphingDialogDescription>
      </div>

      {/* actions */}
      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        {canManage && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              leadingIcon={<Pencil className="size-4" />}
              onClick={(e) => {
                closeDialogFrom(e.currentTarget);
                onEdit(sim);
              }}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              className="flex-1 text-red-600 hover:bg-red-500/10 hover:text-red-700 sm:flex-none dark:text-red-400"
              leadingIcon={<Trash2 className="size-4" />}
              onClick={(e) => {
                closeDialogFrom(e.currentTarget);
                onDelete(sim);
              }}
            >
              Delete
            </Button>
          </div>
        )}
        <Button
          size="lg"
          className="w-full sm:ml-auto sm:w-auto sm:min-w-56"
          disabled={busy}
          leadingIcon={<FlaskConical className="size-5" />}
          onClick={(e) => {
            const origin = rectOf(e.currentTarget.closest('[role="dialog"]'));
            closeDialogFrom(e.currentTarget);
            onLaunch(sim, origin);
          }}
        >
          Launch experiment
        </Button>
      </div>
    </MorphingDialogContent>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton shaped like a sheet                                        */
/* ------------------------------------------------------------------ */

/** Plate shapes for skeleton pins, so the loading bench already reads as a masonry wall. */
const SKELETON_RATIOS = ['aspect-[16/9]', 'aspect-[4/3]', 'aspect-square', 'aspect-[16/10]', 'aspect-[2/1]', 'aspect-[3/2]'];

export function SpecimenSheetSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-surface @container" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-line px-3 py-3 @3xs:px-4">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-3 w-14 rounded" />
      </div>
      <div className="px-2 pt-2 @3xs:px-3 @3xs:pt-3">
        <div className="rounded-xl border border-line p-1.5 @3xs:p-2.5">
          <Skeleton className={cn(SKELETON_RATIOS[index % SKELETON_RATIOS.length], 'rounded-md')} />
        </div>
        <Skeleton className="mt-2.5 hidden h-2.5 rounded-sm @3xs:block" />
      </div>
      <div className="space-y-3 px-3 pb-4 pt-4 @3xs:px-4">
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <SkeletonText lines={index % 2 ? 2 : 3} />
        <div className="hidden grid-cols-2 gap-3 border-t border-line pt-3 @3xs:grid">
          <Skeleton className="h-8 rounded-md" />
          <Skeleton className="h-8 rounded-md" />
        </div>
      </div>
      <div className="border-t border-dashed border-line-strong px-3 py-3 @3xs:px-4">
        <Skeleton className="h-9 w-20 @3xs:w-36" />
      </div>
    </div>
  );
}
