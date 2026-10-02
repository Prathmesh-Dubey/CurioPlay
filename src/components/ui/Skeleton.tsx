import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Placeholder block with a soft travelling sheen (static under reduced motion). */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden="true" className={cn('relative overflow-hidden rounded-xl bg-surface-2', className)} {...rest}>
      <div className="skeleton-shimmer absolute inset-0" />
    </div>
  );
}

/** A few lines of text-shaped skeletons. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3.5 rounded-md" style={{ width: `${i === lines - 1 ? 60 : 100 - i * 8}%` }} />
      ))}
    </div>
  );
}
