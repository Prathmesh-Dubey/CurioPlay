import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';

interface PageHeaderProps {
  /** Short section label, rendered as a specimen tag. */
  eyebrow?: string;
  /** Optional catalogue index shown before the eyebrow, e.g. "02". */
  index?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  /** Extra row under the description (filters, meta chips…). */
  children?: ReactNode;
  className?: string;
}

/** Standard heading block for every dashboard view ("The Observatory"). */
export function PageHeader({ eyebrow, index, title, description, actions, children, className }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: ease.out }}
      className={cn('flex flex-col gap-5', className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          {(eyebrow || index) && (
            <p className="label-mono mb-3 flex items-center gap-2.5 text-brand-strong">
              {index && <span className="text-gold-strong">№ {index}</span>}
              {index && eyebrow && <span className="h-px w-6 bg-line-strong" aria-hidden="true" />}
              {eyebrow && <span>{eyebrow}</span>}
            </p>
          )}
          <h1 className="font-semiwide text-[2rem] font-extrabold leading-[1.02] text-ink sm:text-[2.6rem]">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </motion.header>
  );
}
