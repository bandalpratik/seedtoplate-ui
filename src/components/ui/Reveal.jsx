import { motion } from 'motion/react';
import { EASE_SPRING_OUT } from './motionPresets';

/** Scroll-triggered fade-and-rise, the workhorse of an Apple-style page. */
export default function Reveal({ children, delay = 0, y = 24, className, once = true }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.25 }}
      transition={{ duration: 0.7, ease: EASE_SPRING_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
