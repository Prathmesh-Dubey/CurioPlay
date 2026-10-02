import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  /** Custom image URL (takes priority). */
  url?: string | null;
  /** DiceBear seed; falls back to the username. */
  seed?: string | null;
  name: string;
  className?: string;
}

/** User avatar: custom URL → DiceBear seed → initial. Always square; size it with className (e.g. size-10). */
export function Avatar({ url, seed, name, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const src = url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed || name)}`;

  return (
    <span
      className={cn(
        'relative inline-grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-brand-soft text-sm font-bold text-brand-strong',
        className,
      )}
    >
      {failed ? (
        <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
    </span>
  );
}
