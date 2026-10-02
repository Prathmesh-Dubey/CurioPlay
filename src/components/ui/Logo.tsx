import { cn } from '@/lib/utils';

/** The CurioPlay artwork (controller emblem + wordmark), trimmed from public/curioPlay.png. Aspect ≈ 1.4 : 1. */
export const LOGO_SRC = `${import.meta.env.BASE_URL}logo.webp`;

/** The logo letterboxed inside a square box sized by `className` (e.g. `size-24`). Decorative. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn('size-8 shrink-0 select-none object-contain', className)}
    />
  );
}

/** The full logo, sized by height (default 3rem). The wordmark is part of the artwork. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={LOGO_SRC}
      alt="CurioPlay"
      draggable={false}
      width={640}
      height={456}
      className={cn('h-12 w-auto shrink-0 select-none', className)}
    />
  );
}
