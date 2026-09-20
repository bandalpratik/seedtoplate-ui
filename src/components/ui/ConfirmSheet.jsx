import { AnimatePresence, motion } from 'motion/react';
import Button from './Button';

/** Bottom sheet for destructive confirmations. */
export default function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep it',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-[60] flex items-end">
          <motion.button
            type="button"
            aria-label="Dismiss"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 cursor-default bg-black/35 backdrop-blur-[2px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="relative w-full rounded-t-[28px] bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3"
          >
            <span className="mx-auto mb-5 block h-1 w-9 rounded-full bg-gray-200" />

            <h2 className="display-md text-ink">{title}</h2>
            {description && (
              <p className="mt-2.5 text-[14px] leading-relaxed text-gray-500">{description}</p>
            )}

            <div className="mt-6 space-y-2.5">
              <Button fullWidth size="lg" loading={loading} onClick={onConfirm}>
                {confirmLabel}
              </Button>
              <Button fullWidth size="lg" variant="quiet" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
