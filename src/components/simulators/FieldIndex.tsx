import { useId } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';
import { Skeleton } from '@/components/ui/Skeleton';

interface FieldIndexProps {
  fields: { name: string; count: number }[];
  active: string;
  onChange: (field: string) => void;
  loading?: boolean;
}

/**
 * Index of fields — a book-style legend (name · dotted leader · count) on desktop,
 * a horizontally scrolling index strip on phones. A shared-layout marker follows the selection.
 */
export function FieldIndex({ fields, active, onChange, loading }: FieldIndexProps) {
  const id = useId();

  return (
    <nav aria-label="Filter experiments by field" className="min-w-0 lg:sticky lg:top-6">
      <div className="mb-3 hidden items-center gap-3 lg:flex">
        <span className="label-mono text-ink-faint">Index of fields</span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>

      {loading ? (
        <div className="-mx-4 flex gap-2 overflow-hidden px-4 lg:mx-0 lg:flex-col lg:px-0" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-full lg:h-10 lg:w-full lg:rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
          {fields.map((f, i) => {
            const on = f.name === active;
            return (
              <li key={f.name} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(f.name)}
                  className={cn(
                    'relative flex h-11 items-center gap-2.5 rounded-full border px-4 text-left transition-colors duration-200 lg:h-10 lg:w-full lg:rounded-xl lg:border-transparent lg:px-3',
                    on ? 'border-transparent text-ink' : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink lg:bg-transparent lg:hover:bg-surface-2/70',
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId={`${id}-field`}
                      transition={spring.snappy}
                      className="absolute inset-0 rounded-full bg-rose-soft lg:rounded-xl"
                      aria-hidden="true"
                    >
                      <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-brand lg:block" />
                    </motion.span>
                  )}
                  <span aria-hidden="true" className={cn('label-mono relative hidden lg:inline', on ? 'text-brand-strong' : 'text-ink-faint')}>
                    {String(i).padStart(2, '0')}
                  </span>
                  <span className="relative truncate text-sm font-semibold">{f.name}</span>
                  <span className="relative hidden h-px min-w-4 flex-1 border-b border-dotted border-line-strong lg:block" aria-hidden="true" />
                  <span className="sr-only">, {f.count} {f.count === 1 ? 'experiment' : 'experiments'}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'label-mono relative rounded-md px-1.5 py-0.5 tabular-nums',
                      on ? 'bg-surface/70 text-brand-strong' : 'bg-surface-2 text-ink-faint lg:bg-transparent',
                    )}
                  >
                    {String(f.count).padStart(2, '0')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
