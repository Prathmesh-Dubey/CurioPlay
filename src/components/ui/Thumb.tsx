import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';

interface ThumbProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Remote image URL. Missing or failing URLs render `fallback` instead. */
  src?: string | null;
  fallback: ReactNode;
}

/**
 * A remote thumbnail (covers, avatars) that never shows the browser's broken-image icon: when the URL is
 * missing or fails to load (third-party hosts do), it renders `fallback`. Lazy, async and no-referrer by default.
 */
export function Thumb({ src, fallback, alt = '', onError, ...rest }: ThumbProps) {
  // Track the URL that failed, so a new src gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      {...rest}
      onError={(e) => {
        setFailedSrc(src);
        onError?.(e);
      }}
    />
  );
}
