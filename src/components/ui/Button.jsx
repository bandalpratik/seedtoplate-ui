import { motion } from 'motion/react';
import { cx } from '../../lib/format';

const VARIANTS = {
  primary:
    'bg-leaf-900 text-white shadow-leaf hover:bg-leaf-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none',
  accent:
    'bg-harvest-500 text-white shadow-[0_8px_24px_-8px_rgba(230,126,34,0.6)] hover:bg-harvest-600',
  secondary: 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100',
  glass:
    'bg-white/12 text-white backdrop-blur-xl border border-white/20 hover:bg-white/20',
  ghost: 'bg-transparent text-leaf-600 hover:bg-leaf-50',
  quiet: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
};

const SIZES = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-4 text-[15px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={isDisabled}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em]',
        'transition-colors duration-300 cursor-pointer select-none',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </motion.button>
  );
}
