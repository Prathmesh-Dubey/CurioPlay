import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge doesn't know our custom utilities, so without this it would treat
 * `text-display` as a colour and drop it next to `text-ink`, or merge `font-wide` with `font-sans`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display-xl', 'display', 'title'] }],
      'font-stretch': ['font-wide', 'font-semiwide', 'font-narrow'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
