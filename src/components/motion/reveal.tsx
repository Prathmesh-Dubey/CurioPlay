import { motion, type HTMLMotionProps, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.15, duration: 0.9 } },
};

interface RevealGroupProps extends Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'whileInView'> {
  children: ReactNode;
  stagger?: number;
  delay?: number;
}

/** Container that staggers its <RevealItem> children once it scrolls into view. */
export function RevealGroup({ children, stagger = 0.09, delay = 0, ...rest }: RevealGroupProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, ...rest }: Omit<HTMLMotionProps<'div'>, 'variants'> & { children?: ReactNode }) {
  return (
    <motion.div variants={itemVariants} {...rest}>
      {children}
    </motion.div>
  );
}
