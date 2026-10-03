import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Code2, LayoutTemplate } from 'lucide-react';
import { Container, SectionHeading } from '@/components/layout/Section';
import { gamepadAnchor } from './gamepad/gamepadStore';
import { RevealGroup, RevealItem } from '@/components/motion/reveal';
import { Avatar } from '@/components/ui/Avatar';
import { ease } from '@/lib/motion';
import { cn } from '@/lib/utils';

/*
 * № 06 — Field notes & the field team. Existing testimonials (unchanged content) become
 * large editorial pull-quotes with a numbered pager; the team is a placard row.
 */

const notes = [
  {
    quote:
      'CurioPlay completely changed how I submit my final React projects. The live simulator runner makes sharing my engineering calculators with my professor incredibly easy.',
    name: 'Alex M.',
    role: 'Computer Science Student',
    seed: 'Alex',
  },
  {
    quote:
      'As a frontend developer, I love having a unified workspace to upload and playtest my HTML5 React games. The built-in analytics dashboard is a huge bonus.',
    name: 'Sarah K.',
    role: 'Indie Game Developer',
    seed: 'Sarah',
  },
  {
    quote:
      'I use CurioPlay to host interactive React-based physics simulations for my class. The platform is fast, reliable, and looks incredibly professional.',
    name: 'Dr. James L.',
    role: 'University Instructor',
    seed: 'James',
  },
];

const team = [
  { name: 'Prathmesh Dubey', email: 'prathmdubey217@gmail.com', role: 'Backend', icon: Code2 },
  { name: 'Akshata Gundure', email: 'akshatagundure@gmail.com', role: 'Frontend', icon: LayoutTemplate },
  { name: 'Shail Menghani', email: 'shailmenghani12@gmail.com', role: 'Frontend', icon: LayoutTemplate },
];

export function Voices() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const note = notes[i];
  const go = (d: number) => {
    setDir(d);
    setI((v) => (v + d + notes.length) % notes.length);
  };

  return (
    <section id="about" className="scroll-mt-24 py-24 sm:py-32">
      <Container>
        <div className="relative">
          <SectionHeading index="06" eyebrow="Field notes" title="Made for students, educators and builders." />
          {/* 3D controller waypoint (desktop) */}
          <div
            aria-hidden="true"
            {...gamepadAnchor('voices', 6, 'hoverLeft')}
            className="pointer-events-none absolute right-[8%] top-1/2 hidden aspect-[4/3] w-[clamp(200px,16vw,260px)] -translate-y-1/2 xl:block"
          />
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-9">
            <div className="relative min-h-[280px] sm:min-h-[240px]" aria-live="polite">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.figure
                  key={i}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -40 }}
                  transition={{ duration: 0.5, ease: ease.out }}
                >
                  <span aria-hidden="true" className="block font-wide text-8xl font-extrabold leading-[0.6] text-rose">
                    “
                  </span>
                  <blockquote className="mt-2 font-semiwide text-2xl font-bold leading-snug text-ink sm:text-[2rem]">{note.quote}</blockquote>
                  <figcaption className="mt-8 flex items-center gap-4">
                    <Avatar seed={note.seed} name={note.name} className="size-12 bg-rose-soft" />
                    <span className="leading-tight">
                      <span className="block font-semibold text-ink">{note.name}</span>
                      <span className="block text-sm text-ink-muted">{note.role}</span>
                    </span>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 lg:col-span-3 lg:flex-col lg:items-end lg:justify-end">
            <p className="label-mono text-ink-faint">
              Note <span className="text-ink">{String(i + 1).padStart(2, '0')}</span> / {String(notes.length).padStart(2, '0')}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous note"
                className="grid size-12 place-items-center rounded-full border border-line-strong text-ink transition-[border-color,background-color] hover:border-brand/50 hover:bg-surface"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next note"
                className="grid size-12 place-items-center rounded-full bg-ink text-canvas transition-transform active:scale-95"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
            <div className="hidden w-full gap-1.5 lg:flex" aria-hidden="true">
              {notes.map((_, k) => (
                <span key={k} className="h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                  <motion.span
                    className="block h-full bg-brand"
                    initial={false}
                    animate={{ width: k === i ? '100%' : k < i ? '100%' : '0%', opacity: k <= i ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-24 border-t border-line pt-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-mono text-brand-strong">The field team</p>
              <h3 className="mt-2 font-semiwide text-3xl font-extrabold text-ink">The people behind CurioPlay</h3>
            </div>
            <p className="max-w-sm text-sm text-ink-muted">A small team dedicated to building the best platform for developers and players alike.</p>
          </div>
          <RevealGroup className="grid gap-3 sm:grid-cols-3" stagger={0.08}>
            {team.map((m, k) => (
              <RevealItem key={m.name}>
                <a
                  href={`mailto:${m.email}`}
                  className={cn(
                    'group flex items-center gap-4 rounded-[20px] border border-line bg-surface p-5 transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card',
                  )}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-soft text-brand-strong">
                    <m.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="label-mono block text-ink-faint">{String(k + 1).padStart(2, '0')} · {m.role}</span>
                    <span className="mt-1 block truncate font-semibold text-ink">{m.name}</span>
                  </span>
                  <ArrowUpRight
                    className="size-4 shrink-0 text-ink-faint transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-strong"
                    aria-label={`Email ${m.name}`}
                  />
                </a>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </Container>
    </section>
  );
}
