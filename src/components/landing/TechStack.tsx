import { InfiniteSlider } from '@/components/motion/infinite-slider';

/*
 * Instruments strip — a quiet catalogue line between chapters. Slows down on hover so
 * names can actually be read. One ambient loop, nothing else moves in this band.
 */

const tech = ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Firebase', 'Motion', 'TanStack Query', 'Capacitor'];

export function TechStack() {
  return (
    <section id="technology" aria-label="Built with" className="border-y border-line bg-surface/70 py-7">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 sm:px-8">
        <p className="label-mono hidden shrink-0 text-ink-faint sm:block">Instruments</p>
        <div className="mask-fade-x min-w-0 flex-1">
          <InfiniteSlider gap={40} speed={36} speedOnHover={10}>
            {tech.map((t, i) => (
              <span key={t} className="inline-flex items-center gap-3 whitespace-nowrap font-semiwide text-lg font-bold text-ink-muted">
                <span className="font-mono text-[10px] font-medium text-gold-strong">{String(i + 1).padStart(2, '0')}</span>
                {t}
              </span>
            ))}
          </InfiniteSlider>
        </div>
      </div>
    </section>
  );
}
