import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Compass } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { CornerTicks, OrbitLines } from '@/components/ui/Decor';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { entryPath } from '@/lib/session';
import { ease } from '@/lib/motion';

/** 404 — a catalogue card for a specimen that isn't in the collection. */
export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="pt-safe flex h-16 items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="CurioPlay home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 pb-16">
        <OrbitLines className="pointer-events-none absolute left-1/2 top-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 opacity-70" />
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          transition={{ duration: 0.8, ease: ease.out }}
          className="relative w-full max-w-md rounded-[24px] border border-line bg-surface p-8 shadow-float"
        >
          <CornerTicks />
          <p className="label-mono text-gold-strong">Catalogue card · № 404</p>
          <h1 className="mt-4 font-wide text-6xl font-extrabold leading-[0.9]">
            Specimen
            <br />
            not found.
          </h1>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line pt-5 text-sm">
            <dt className="label-mono text-ink-faint">Requested</dt>
            <dd className="truncate font-mono text-ink-muted">{pathname}</dd>
            <dt className="label-mono text-ink-faint">Status</dt>
            <dd className="text-ink-muted">Not in the collection (yet)</dd>
          </dl>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Link to="/" className={buttonClasses('primary', 'md', 'flex-1')}>
              <ArrowLeft className="size-4" /> Back to the guide
            </Link>
            <Link to={entryPath()} className={buttonClasses('outline', 'md', 'flex-1')}>
              <Compass className="size-4" /> Explore
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
