import { useMemo, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

/*
 * Hall of Fame stage: the animated GIF (public/hall-of-fame.gif) with layers of motion on top —
 * twinkling pixel stars, embers rising from the stage floor, drifting pixel invaders, a scan beam sweeping down,
 * and a spotlight breathing behind first place. It only animates while it is on screen, and with reduced motion on
 * (or when scrolled away) the GIF is swapped for a still frame — a GIF can't be paused from CSS — and nothing loops.
 */

const GIF = `${import.meta.env.BASE_URL}hall-of-fame.gif`;
const STILL = `${import.meta.env.BASE_URL}hall-of-fame-still.webp`;

const SKY = '#8bcbff';

/** Tiny seeded generator, so the field is the same on every render. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Classic 11×8 invader, drawn as pixels. */
const INVADER = [
  '..#.....#..',
  '...#...#...',
  '..#######..',
  '.##.###.##.',
  '###########',
  '#.#######.#',
  '#.#.....#.#',
  '...##.##...',
];

function Invader({ size, color, className }: { size: number; color: string; className?: string }) {
  const px = size / 11;
  return (
    <svg width={size} height={px * 8} viewBox="0 0 11 8" shapeRendering="crispEdges" fill={color} className={className} aria-hidden="true">
      {INVADER.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  );
}

export function HallOfFameBackdrop() {
  const prefersReduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useInView(ref, { margin: '160px 0px' });
  // Everything that loops (and the GIF itself) runs only while visible and when motion is welcome.
  const reduce = prefersReduced || !onScreen;

  const stars = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: r() * 100,
      top: r() * 78,
      size: r() > 0.8 ? 3 : 2,
      delay: r() * 4,
      duration: 1.6 + r() * 2.6,
      color: r() > 0.7 ? SKY : '#ffffff',
    }));
  }, []);

  const embers = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      left: 4 + r() * 92,
      size: 2 + Math.floor(r() * 3),
      delay: r() * 7,
      duration: 6 + r() * 6,
      drift: (r() - 0.5) * 60,
    }));
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black">
      {/* The GIF animates by itself; it only fades in. */}
      <motion.img
        src={reduce ? STILL : GIF}
        alt=""
        draggable={false}
        decoding="async"
        className="absolute inset-0 size-full scale-[1.04] select-none object-cover object-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ duration: 1.2 }}
      />

      {/* Keep the heading, scores and footer readable over the artwork. */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/75 via-navy/20 to-navy/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/70 via-transparent to-navy/45" />

      {/* Spotlight behind the #1 plinth. */}
      <motion.div
        className="absolute inset-x-[22%] bottom-[-18%] h-[75%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgb(139_203_255/0.26),rgb(37_99_235/0.1)_45%,transparent_70%)] blur-2xl"
        animate={reduce ? undefined : { opacity: [0.55, 1, 0.55], scale: [0.94, 1.06, 0.94] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Pixel stars */}
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, background: s.color }}
          initial={{ opacity: 0.35 }}
          animate={reduce ? { opacity: 0.55 } : { opacity: [0.15, 1, 0.15], scale: [1, 1.5, 1] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {!reduce && (
        <>
          {/* Embers rising off the stage floor */}
          {embers.map((e) => (
            <motion.span
              key={e.id}
              className="absolute bottom-0 bg-[#8bcbff]"
              style={{ left: `${e.left}%`, width: e.size, height: e.size, boxShadow: '0 0 8px 1px rgb(139 203 255 / 0.7)' }}
              initial={{ y: 0, x: 0, opacity: 0 }}
              animate={{ y: [0, -520], x: [0, e.drift], opacity: [0, 0.9, 0.9, 0] }}
              transition={{ duration: e.duration, delay: e.delay, repeat: Infinity, ease: 'easeOut', times: [0, 0.15, 0.7, 1] }}
            />
          ))}

          {/* Pixel invaders drifting across, bobbing as they go */}
          {[
            { top: '14%', size: 34, dur: 38, delay: 0, from: -12, to: 112, color: 'rgb(139 203 255 / 0.5)' },
            { top: '58%', size: 24, dur: 46, delay: 9, from: 112, to: -12, color: 'rgb(255 255 255 / 0.28)' },
            { top: '34%', size: 18, dur: 54, delay: 20, from: -12, to: 112, color: 'rgb(37 99 235 / 0.7)' },
          ].map((v, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ top: v.top }}
              initial={{ left: `${v.from}%` }}
              animate={{ left: [`${v.from}%`, `${v.to}%`] }}
              transition={{ duration: v.dur, delay: v.delay, repeat: Infinity, ease: 'linear' }}
            >
              <motion.div animate={{ y: [0, -8, 0, 8, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}>
                <Invader size={v.size} color={v.color} />
              </motion.div>
            </motion.div>
          ))}

          {/* Scan beam sweeping down the stage */}
          <motion.div
            className="absolute inset-x-0 h-28 bg-gradient-to-b from-transparent via-[#8bcbff]/[0.11] to-transparent"
            initial={{ y: '-30%' }}
            animate={{ y: ['-30%', '420%'] }}
            transition={{ duration: 8, repeat: Infinity, repeatDelay: 2.5, ease: 'linear' }}
          />
        </>
      )}

      {/* Edge vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_30px_rgb(4_20_39/0.7)]" />
    </div>
  );
}
