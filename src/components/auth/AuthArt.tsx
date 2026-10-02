import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Award, FlaskConical, Gamepad2, LineChart } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { OrbitLines } from '@/components/ui/Decor';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { TextScramble } from '@/components/motion/text-scramble';
import { useCatalog } from '@/hooks/useCatalog';
import { ease } from '@/lib/motion';
import type { AuthMode } from './AuthView';

/*
 * Night panel of the Reading Room: the logo (which carries the name), and beneath it a story that changes with the mode — returning explorers see what's waiting,
 * new ones see what they'll get. Live counts come from the real catalogue.
 */

const perks = [
  {
    icon: LineChart,
    title: 'Every score saved',
    text: 'Your sessions and best runs follow you everywhere.',
  },
  {
    icon: Award,
    title: 'Medals worth earning',
    text: 'Unlock achievements as your scores climb.',
  },
  {
    icon: Gamepad2,
    title: 'A place on the board',
    text: 'Compete on per-game leaderboards.',
  },
];

export function AuthArt({ mode }: { mode: AuthMode }) {
  const { games, simulators, isLoading } = useCatalog();

  return (
    <div className="grain relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col xl:p-16">
      <div className="bg-graph-night pointer-events-none absolute inset-0" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 size-[28rem] rounded-full bg-brand/35 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 24, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <OrbitLines night className="pointer-events-none absolute -bottom-40 -right-40 size-[44rem] opacity-80" />

      {/* The logo carries the name, so nothing repeats it: logo first, the story directly beneath, centred as one group. */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center py-6">
        <div className="relative grid place-items-center">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute size-[22rem] rounded-full bg-brand/30 blur-3xl"
            animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Link to="/" aria-label="CurioPlay home" className="relative block rounded-3xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
              transition={{
                opacity: { duration: 0.6, ease: ease.out },
                scale: { type: 'spring', bounce: 0.35, duration: 0.9 },
                y: {
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.9,
                },
              }}
            >
              <Logo className="h-auto w-[min(24rem,100%)] drop-shadow-[0_24px_48px_rgb(0_0_0/0.45)] xl:w-[28rem]" />
            </motion.div>
          </Link>
        </div>

        <div className="relative mt-6 w-full max-w-lg text-center">
          {/* The logo already says CurioPlay, so only "Portal" follows it. */}
          <h2 className="font-wide text-5xl font-extrabold leading-none text-night-sage xl:text-6xl">
            <span className="sr-only">CurioPlay </span>
            <TextScramble as="span" duration={1.3}>
              Portal
            </TextScramble>
          </h2>
          <p className="label-mono mt-4 text-night-sage/70">
            <span className="text-night-gold">Reading room</span> — members’ entrance
          </p>
          <div className="mt-7 min-h-[14rem]">
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: ease.out }}
                >
                  <p className="text-xl leading-relaxed text-white/75">
                    Welcome back, explorer. Your field guide is exactly where you left it.
                  </p>
                  <div className="mt-8 grid grid-cols-2 gap-3 text-left">
                    {[
                      {
                        icon: Gamepad2,
                        label: 'Games waiting',
                        value: games.length,
                      },
                      {
                        icon: FlaskConical,
                        label: 'Experiments ready',
                        value: simulators.length,
                      },
                    ].map((s) => (
                      <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <s.icon className="size-4 text-night-gold" />
                        <p className="mt-3 font-wide text-4xl font-extrabold">{isLoading ? '—' : <AnimatedNumber value={s.value} />}</p>
                        <p className="label-mono mt-1 text-night-sage/70">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: ease.out }}
                >
                  <p className="text-xl leading-relaxed text-white/75">Begin your field guide. Here’s what comes with it:</p>
                  <ul className="mx-auto mt-7 w-fit space-y-4 text-left">
                    {perks.map((p, i) => (
                      <motion.li
                        key={p.title}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.15 + i * 0.08,
                          duration: 0.4,
                          ease: ease.out,
                        }}
                        className="flex items-start gap-4"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-night-gold">
                          <p.icon className="size-4" />
                        </span>
                        <span>
                          <span className="block font-semibold">{p.title}</span>
                          <span className="block text-sm text-white/60">{p.text}</span>
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
