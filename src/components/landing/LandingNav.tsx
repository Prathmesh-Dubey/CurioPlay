import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowRight, ArrowUpRight, ChevronDown, FlaskConical, Gamepad2, Workflow } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { buttonClasses } from '@/components/ui/Button';
import { Magnetic } from '@/components/motion/magnetic';
import { ProgressiveBlur } from '@/components/motion/progressive-blur';
import { ScrollProgress } from '@/components/motion/scroll-progress';
import { useFocusTrap, useScrollLock } from '@/components/ui/Overlay';
import { useCatalog } from '@/hooks/useCatalog';
import { entryPath } from '@/lib/session';
import { ease, spring } from '@/lib/motion';
import { cn } from '@/lib/utils';

const links = [
  { id: 'games', label: 'Games' },
  { id: 'simulators', label: 'Simulators' },
  { id: 'features', label: 'Features' },
  { id: 'about', label: 'About' },
];

const sectionIds = ['explore', ...links.map((l) => l.id)];

/** Animated two-line hamburger that morphs into an X. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-3.5 w-5" aria-hidden="true">
      <motion.span
        className="absolute left-0 top-0 h-[2px] w-5 rounded-full bg-current"
        animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
        transition={spring.snappy}
      />
      <motion.span
        className="absolute bottom-0 left-0 h-[2px] rounded-full bg-current"
        animate={open ? { rotate: -45, y: -6, width: 20 } : { rotate: 0, y: 0, width: 13 }}
        transition={spring.snappy}
      />
    </span>
  );
}

function ExploreMenu({ onNavigate }: { onNavigate: () => void }) {
  const { games, simulators, isLoading } = useCatalog();
  const items = [
    { href: '#games', icon: Gamepad2, title: 'Games', text: 'Browser games with scores and leaderboards.', count: games.length },
    { href: '#simulators', icon: FlaskConical, title: 'The Laboratory', text: 'Interactive simulators across the sciences.', count: simulators.length },
    { href: '#how', icon: Workflow, title: 'How it works', text: 'From discovery to your first achievement.' },
  ];
  return (
    <div className="grid w-[34rem] grid-cols-[1fr_1fr] gap-1.5 p-1.5">
      {items.map((it, i) => (
        <a
          key={it.href}
          href={it.href}
          onClick={onNavigate}
          className={cn(
            'group relative flex flex-col gap-3 rounded-2xl p-4 transition-colors hover:bg-surface-2',
            i === 0 && 'row-span-2 bg-rose-soft/60 hover:bg-rose-soft',
          )}
        >
          <span className="flex items-center justify-between">
            <span className="grid size-9 place-items-center rounded-xl bg-surface text-brand-strong shadow-soft">
              <it.icon className="size-4" />
            </span>
            {it.count !== undefined && !isLoading && <span className="label-mono text-ink-faint">{String(it.count).padStart(2, '0')} items</span>}
          </span>
          <span>
            <span className="flex items-center gap-1 font-semibold text-ink">
              {it.title}
              <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
            </span>
            <span className="mt-1 block text-sm leading-snug text-ink-muted">{it.text}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [active, setActive] = useState<string>('');
  const [hovered, setHovered] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLLIElement>(null);
  const { scrollY } = useScroll();

  useFocusTrap(sheetRef, open);
  useScrollLock(open);

  // Scroll-responsive: frosted after 24px, tucks away when scrolling down fast, returns on scroll up.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(y > 640 && y > prev + 4 && !exploreOpen);
    if (y < prev - 4) setHidden(false);
  });

  useEffect(() => {
    const els = sectionIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Close the Explore dropdown on outside click / Escape.
  useEffect(() => {
    if (!exploreOpen) return;
    const onDown = (e: PointerEvent) => !exploreRef.current?.contains(e.target as Node) && setExploreOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExploreOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [exploreOpen]);

  const cta = entryPath();
  const mobileLinks = [{ id: 'explore', label: 'The collection' }, ...links, { id: 'how', label: 'How it works' }, { id: 'faq', label: 'Questions' }];

  return (
    <>
      <ScrollProgress className="z-[60] h-[2px] bg-brand" />

      <motion.header
        className="pt-safe fixed inset-x-0 top-0 z-[60]"
        animate={{ y: hidden && !open ? '-110%' : '0%' }}
        transition={{ duration: 0.35, ease: ease.out }}
      >
        <div
          aria-hidden="true"
          className={cn('pointer-events-none absolute inset-x-0 top-0 h-28 transition-opacity duration-500', scrolled ? 'opacity-100' : 'opacity-0')}
        >
          <ProgressiveBlur direction="top" blurIntensity={0.3} className="absolute inset-0 h-full" />
        </div>

        <div className="relative mx-auto max-w-7xl px-3 sm:px-6">
          <nav
            aria-label="Primary"
            className={cn(
              'mt-2 flex items-center justify-between rounded-[18px] border px-3 transition-[height,background-color,border-color,box-shadow] duration-500 ease-out-expo sm:mt-3 sm:px-4',
              scrolled ? 'h-14 border-line bg-surface/80 shadow-card backdrop-blur-xl' : 'h-16 border-transparent bg-transparent',
            )}
          >
            <Link to="/" aria-label="CurioPlay home" className="rounded-lg px-1">
              <Logo />
            </Link>

            <ul className="hidden items-center gap-0.5 lg:flex" onMouseLeave={() => setHovered(null)}>
              <li className="relative" ref={exploreRef}>
                <button
                  type="button"
                  aria-expanded={exploreOpen}
                  aria-haspopup="true"
                  onClick={() => setExploreOpen((v) => !v)}
                  onMouseEnter={() => setHovered('explore')}
                  className={cn(
                    'relative z-10 flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                    active === 'explore' || exploreOpen ? 'text-ink' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  Explore
                  <ChevronDown className={cn('size-3.5 transition-transform duration-300', exploreOpen && 'rotate-180')} />
                </button>
                {hovered === 'explore' && (
                  <motion.span layoutId="nav-hover" className="absolute inset-0 rounded-lg bg-surface-2" transition={spring.snappy} />
                )}
                {active === 'explore' && (
                  <motion.span layoutId="nav-active" className="absolute inset-x-3.5 -bottom-0.5 z-10 h-0.5 rounded-full bg-brand" transition={spring.snappy} />
                )}
                <AnimatePresence>
                  {exploreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.14 } }}
                      transition={{ duration: 0.28, ease: ease.out }}
                      style={{ transformOrigin: 'top left' }}
                      className="absolute left-0 top-full mt-3 rounded-[22px] border border-line bg-surface shadow-float"
                    >
                      <ExploreMenu onNavigate={() => setExploreOpen(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
              {links.map((l) => {
                const isActive = active === l.id;
                return (
                  <li key={l.id} className="relative">
                    <a
                      href={`#${l.id}`}
                      onMouseEnter={() => setHovered(l.id)}
                      onFocus={() => setHovered(l.id)}
                      aria-current={isActive ? 'location' : undefined}
                      className={cn(
                        'relative z-10 block rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                        isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
                      )}
                    >
                      {l.label}
                    </a>
                    {hovered === l.id && (
                      <motion.span layoutId="nav-hover" className="absolute inset-0 rounded-lg bg-surface-2" transition={spring.snappy} />
                    )}
                    {isActive && (
                      <motion.span layoutId="nav-active" className="absolute inset-x-3.5 -bottom-0.5 z-10 h-0.5 rounded-full bg-brand" transition={spring.snappy} />
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <Link to="/login" className={cn(buttonClasses('ghost', 'sm'), 'hidden sm:inline-flex')}>
                Log in
              </Link>
              <div className="hidden sm:block">
                <Magnetic intensity={0.3} range={90}>
                  <Link to={cta} className={buttonClasses('primary', 'sm', 'gap-1.5')}>
                    Get started <ArrowRight data-icon="trailing" className="size-3.5" />
                  </Link>
                </Magnetic>
              </div>
              <button
                type="button"
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                aria-controls="mobile-index"
                onClick={() => setOpen((v) => !v)}
                className="relative z-[70] inline-flex size-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-2 lg:hidden"
              >
                <MenuIcon open={open} />
              </button>
            </div>
          </nav>
        </div>
      </motion.header>

      {/* Mobile: a full-screen "index" — the field guide's table of contents. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-index"
            id="mobile-index"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site index"
            initial={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 40px) 40px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)', transition: { duration: 0.4, ease: ease.inOut } }}
            transition={{ duration: 0.6, ease: ease.inOut }}
            className="pt-safe pb-safe fixed inset-0 z-[55] flex flex-col bg-canvas lg:hidden"
          >
            <div className="bg-dots pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative flex h-full flex-col px-6 pb-8 pt-24">
              <p className="label-mono mb-6 text-ink-faint">Index</p>
              <ul className="flex flex-col">
                {mobileLinks.map((l, i) => (
                  <motion.li
                    key={l.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 + i * 0.05, duration: 0.5, ease: ease.out }}
                  >
                    <a
                      href={`#${l.id}`}
                      onClick={() => setOpen(false)}
                      className="group flex items-baseline gap-4 border-b border-line py-3.5"
                    >
                      <span className="label-mono w-8 text-gold-strong">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-wide text-[1.9rem] font-extrabold leading-none text-ink transition-colors group-active:text-brand-strong">
                        {l.label}
                      </span>
                    </a>
                  </motion.li>
                ))}
              </ul>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5, ease: ease.out }}
                className="mt-auto grid grid-cols-2 gap-3 pt-8"
              >
                <Link to="/login" onClick={() => setOpen(false)} className={buttonClasses('outline', 'lg')}>
                  Log in
                </Link>
                <Link to={cta} onClick={() => setOpen(false)} className={buttonClasses('primary', 'lg')}>
                  Get started
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
