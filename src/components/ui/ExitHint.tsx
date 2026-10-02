import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getExitHint, subscribeExitHint } from '@/lib/nativeBack';

/** "Press back again to exit" — shown by the Android back handler when you press back on the home screen. */
export function ExitHint() {
  const visible = useSyncExternalStore(subscribeExitHint, getExitHint, () => false);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="pointer-events-none fixed inset-x-0 z-[300] flex justify-center px-4"
          style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 0.75rem) + 5.5rem)' }}
        >
          <span className="rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-float ring-1 ring-white/10">
            Press back again to exit
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
