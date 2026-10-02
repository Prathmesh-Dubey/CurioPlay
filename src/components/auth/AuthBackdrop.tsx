import { useEffect, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react';

/*
 * The living backdrop behind the sign-in card: drifting colour blobs in the logo's palette,
 * and controller glyphs (d-pad, play, buttons, sparkles) that float and lean toward the cursor.
 */

const BLUE = '#5b7fb5';
const PINK = '#e8a5b3';
const GOLD = '#d4b06a';
const SKY = '#8bcbff';

type GlyphKind = 'plus' | 'play' | 'dot' | 'ring' | 'x' | 'spark' | 'pad';

interface Glyph {
  kind: GlyphKind;
  color: string;
  /** Position in % of the panel. */
  left: number;
  top: number;
  size: number;
  /** Parallax strength (px at the panel edge). */
  depth: number;
  float: number;
  duration: number;
  delay: number;
  spin?: number;
}

const GLYPHS: Glyph[] = [
  { kind: 'plus', color: BLUE, left: 8, top: 14, size: 44, depth: 26, float: 14, duration: 7, delay: 0, spin: 12 },
  { kind: 'play', color: GOLD, left: 84, top: 10, size: 40, depth: 18, float: 12, duration: 6.5, delay: 0.6, spin: -10 },
  { kind: 'dot', color: PINK, left: 90, top: 42, size: 26, depth: 34, float: 18, duration: 5.5, delay: 1.2 },
  { kind: 'spark', color: GOLD, left: 14, top: 46, size: 30, depth: 12, float: 10, duration: 4.8, delay: 0.3, spin: 40 },
  { kind: 'x', color: BLUE, left: 6, top: 80, size: 34, depth: 22, float: 16, duration: 6.8, delay: 0.9, spin: 25 },
  { kind: 'ring', color: SKY, left: 80, top: 78, size: 46, depth: 16, float: 12, duration: 7.5, delay: 0.4 },
  { kind: 'spark', color: PINK, left: 70, top: 26, size: 22, depth: 30, float: 10, duration: 4.2, delay: 1.6, spin: -40 },
  { kind: 'dot', color: GOLD, left: 26, top: 90, size: 18, depth: 28, float: 14, duration: 5, delay: 0.8 },
  { kind: 'pad', color: BLUE, left: 92, top: 92, size: 54, depth: 10, float: 8, duration: 8, delay: 0.2, spin: 6 },
  { kind: 'dot', color: SKY, left: 30, top: 6, size: 14, depth: 36, float: 12, duration: 4.6, delay: 1.1 },
  { kind: 'spark', color: SKY, left: 52, top: 95, size: 20, depth: 20, float: 10, duration: 5.2, delay: 0.5, spin: 30 },
  { kind: 'plus', color: PINK, left: 60, top: 4, size: 26, depth: 24, float: 10, duration: 6, delay: 1.4, spin: -15 },
];

function GlyphShape({ kind, color, size }: { kind: GlyphKind; color: string; size: number }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', 'aria-hidden': true } as const;
  switch (kind) {
    case 'plus':
      return (
        <svg {...common}>
          <path d="M18 6h12v12h12v12H30v12H18V30H6V18h12z" fill={color} stroke="rgb(15 29 51 / 0.18)" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'play':
      return (
        <svg {...common}>
          <path d="M14 8.5v31a2.5 2.5 0 0 0 3.8 2.1l24.4-15.5a2.5 2.5 0 0 0 0-4.2L17.8 6.4A2.5 2.5 0 0 0 14 8.5Z" fill={color} />
        </svg>
      );
    case 'dot':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="20" fill={color} />
          <circle cx="18" cy="17" r="6" fill="white" opacity="0.35" />
        </svg>
      );
    case 'ring':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="6" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path d="M12 12l24 24M36 12L12 36" stroke={color} strokeWidth="9" strokeLinecap="round" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...common}>
          <path d="M24 2c1.8 13.2 9 21.2 22 22-13 .8-20.2 8.8-22 22-1.8-13.2-9-21.2-22-22 13-.8 20.2-8.8 22-22Z" fill={color} />
        </svg>
      );
    case 'pad':
      // Four face buttons, like the logo's controller.
      return (
        <svg {...common}>
          <circle cx="24" cy="10" r="7" fill={GOLD} />
          <circle cx="38" cy="24" r="7" fill={PINK} />
          <circle cx="24" cy="38" r="7" fill={PINK} />
          <circle cx="10" cy="24" r="7" fill={color} />
        </svg>
      );
  }
}

function FloatingGlyph({ g, px, py, still }: { g: Glyph; px: MotionValue<number>; py: MotionValue<number>; still: boolean }) {
  const x = useTransform(px, (v) => v * g.depth);
  const y = useTransform(py, (v) => v * g.depth);
  return (
    // Outer: position + cursor parallax. Middle: centring + theme opacity. Inner: pop-in, float and sway.
    <motion.div className="absolute" style={{ left: `${g.left}%`, top: `${g.top}%`, x, y }}>
      <div className="-translate-x-1/2 -translate-y-1/2 opacity-60 dark:opacity-40">
        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          animate={still ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -g.float, 0], rotate: g.spin ? [0, g.spin, 0] : 0 }}
          transition={{
            opacity: { duration: 0.5, delay: 0.2 + g.delay * 0.4 },
            scale: { type: 'spring', bounce: 0.5, duration: 0.9, delay: 0.2 + g.delay * 0.4 },
            y: { duration: g.duration, repeat: Infinity, ease: 'easeInOut', delay: g.delay },
            rotate: { duration: g.duration * 1.3, repeat: Infinity, ease: 'easeInOut', delay: g.delay },
          }}
        >
          <GlyphShape kind={g.kind} color={g.color} size={g.size} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function Blob({ className, animate, duration }: { className: string; animate: Record<string, number[]>; duration: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      animate={reduce ? undefined : animate}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export function AuthBackdrop({ children }: { children?: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  // Pointer position in the panel, normalised to -1…1, eased with a spring.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const px = useSpring(rawX, { stiffness: 60, damping: 18 });
  const py = useSpring(rawY, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, rawX, rawY]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* soft grid that fades out toward the edges */}
      <div className="bg-dots absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,#000_15%,transparent_70%)]" />

      <Blob className="-left-24 top-[8%] size-[26rem] bg-brand/20 dark:bg-brand/25" animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }} duration={14} />
      <Blob className="-right-28 top-[30%] size-[24rem] bg-[#e8a5b3]/30 dark:bg-[#e8a5b3]/12" animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }} duration={16} />
      <Blob className="bottom-[-8rem] left-[20%] size-[22rem] bg-[#d4b06a]/25 dark:bg-[#d4b06a]/10" animate={{ x: [0, 40, 0], y: [0, -40, 0] }} duration={18} />

      {/* slow sweeping orbit lines */}
      <motion.svg
        viewBox="0 0 600 600"
        className="absolute left-1/2 top-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 opacity-60"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        <ellipse cx="300" cy="300" rx="280" ry="110" transform="rotate(-18 300 300)" fill="none" stroke={GOLD} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="2 10" strokeLinecap="round" />
        <ellipse cx="300" cy="300" rx="250" ry="140" transform="rotate(24 300 300)" fill="none" stroke={BLUE} strokeOpacity="0.25" strokeWidth="1.2" />
        <circle cx="580" cy="300" r="6" fill={PINK} transform="rotate(-18 300 300)" />
      </motion.svg>

      {GLYPHS.map((g, i) => (
        <FloatingGlyph key={i} g={g} px={px} py={py} still={reduce} />
      ))}
      {children}
    </div>
  );
}
