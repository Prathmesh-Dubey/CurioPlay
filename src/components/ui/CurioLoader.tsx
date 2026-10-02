import { motion } from 'motion/react';
import { TextLoop } from '@/components/motion/text-loop';
import { LOGO_SRC } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

const DEFAULT_MESSAGES = [
  'Warming up the lab',
  'Sparking curiosity',
  'Loading experiences',
  'Calibrating simulators',
];

const SIZES = { sm: 'w-20', md: 'w-36', lg: 'w-52' } as const;

/** The brand logo, alive: a gentle breathing bob over a soft halo. */
function Orbiter({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)} aria-hidden="true">
      <motion.span
        className="absolute inset-[-12%] rounded-full bg-brand/20 blur-2xl"
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.92, 1.06, 0.92] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.img
        src={LOGO_SRC}
        alt=""
        draggable={false}
        className="relative h-auto w-full select-none"
        animate={{ y: [0, -5, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

interface CurioLoaderProps {
  /** Cycling status lines. Pass a single-item array for a fixed message. */
  messages?: string[];
  size?: keyof typeof SIZES;
  /** Fill the viewport with the branded loading screen. */
  fullscreen?: boolean;
  /** Hide the text line (icon only). */
  silent?: boolean;
  /** Use light text for loaders shown on navy surfaces. */
  onDark?: boolean;
  className?: string;
}

export function CurioLoader({ messages = DEFAULT_MESSAGES, size = 'md', fullscreen = false, silent = false, onDark = false, className }: CurioLoaderProps) {
  const body = (
    <div className={cn('flex flex-col items-center gap-5', className)} role="status" aria-live="polite">
      <Orbiter className={SIZES[size]} />
      {!silent && (
        <div className="flex flex-col items-center gap-3">
          <span className="sr-only">Loading</span>
          <div className={cn('h-5 overflow-hidden text-sm font-semibold tracking-wide', onDark ? 'text-white/70' : 'text-ink-muted')} aria-hidden="true">
            {messages.length > 1 ? (
              <TextLoop interval={1.6} className="min-w-[14ch] text-center" transition={{ duration: 0.35 }}>
                {messages.map((m) => (
                  <span key={m}>{m}…</span>
                ))}
              </TextLoop>
            ) : (
              <span>{messages[0]}…</span>
            )}
          </div>
          <span className={cn('relative h-[3px] w-24 overflow-hidden rounded-full', onDark ? 'bg-white/15' : 'bg-line-strong/60')} aria-hidden="true">
            <motion.span
              className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-brand via-rose to-gold"
              animate={{ x: ['-100%', '220%'] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </div>
      )}
    </div>
  );

  if (!fullscreen) return body;

  return (
    <div className="pt-safe pb-safe relative grid min-h-dvh place-items-center overflow-hidden bg-canvas">
      <div className="cp-grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative">{body}</div>
    </div>
  );
}
