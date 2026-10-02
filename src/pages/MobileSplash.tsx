import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Logo } from '@/components/ui/Logo';
import { entryPath } from '@/lib/session';

/** Android (Capacitor) launch screen. */
export default function MobileSplash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate(entryPath(), { replace: true }), 2400);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="pt-safe pb-safe relative flex min-h-dvh select-none flex-col items-center justify-center overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute size-72 rounded-full bg-brand/30 blur-3xl"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.35, duration: 1 }}
        className="relative"
      >
        <Logo className="h-auto w-64" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="sr-only"
      >
        CurioPlay
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        className="relative mt-6 text-sm font-medium tracking-wide text-white/60"
      >
        Explore beyond the ordinary.
      </motion.p>

      <div className="relative mt-10 h-1 w-28 overflow-hidden rounded-full bg-white/15">
        <motion.span
          className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-[#cde8ff] to-[#9db3cf]"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
