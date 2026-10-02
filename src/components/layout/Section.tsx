import type { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { Eyebrow } from '@/components/ui/Decor';

export function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('page-wrap', className)} {...rest} />;
}

/**
 * Catalogue-style section heading: "№ 03 — Label", a wide editorial title and an optional lede.
 * Reveals once as it scrolls into view.
 */
export function SectionHeading({
  eyebrow,
  index,
  title,
  description,
  align = 'left',
  night,
  size = 'display',
  className,
}: {
  eyebrow?: string;
  index?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  night?: boolean;
  size?: 'display' | 'title';
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: ease.out }}
      className={cn('flex flex-col gap-5', align === 'center' && 'mx-auto items-center text-center', className)}
    >
      {eyebrow && (
        <Eyebrow index={index} night={night}>
          {eyebrow}
        </Eyebrow>
      )}
      <h2
        className={cn(
          'max-w-4xl font-wide font-extrabold',
          size === 'display' ? 'text-display' : 'text-title',
          night ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn('max-w-2xl text-lg leading-relaxed', night ? 'text-white/65' : 'text-ink-muted')}>{description}</p>
      )}
    </motion.div>
  );
}
