import { motion } from 'motion/react';
import { CROP_STAGE_LABEL, CUSTOMER_STAGE_RAIL } from '../../lib/constants';
import { cx } from '../../lib/format';

/**
 * Sown -> Growing -> Harvested -> Curing. A released batch reads as fully
 * complete, since release only happens after curing.
 */
export default function StageRail({ currentStage, tone = 'light', className }) {
  const isReleased =
    currentStage === 'BATCH_RELEASED' ||
    currentStage === 'DISPATCHED' ||
    currentStage === 'COMPLETE' ||
    currentStage === 'ARCHIVED';
  const activeIndex = isReleased
    ? CUSTOMER_STAGE_RAIL.length - 1
    : CUSTOMER_STAGE_RAIL.indexOf(currentStage);

  const progress = activeIndex <= 0 ? 0 : activeIndex / (CUSTOMER_STAGE_RAIL.length - 1);
  const onDark = tone === 'dark';

  return (
    <div className={cx('w-full', className)}>
      <div
        className={cx(
          'relative h-[3px] w-full overflow-hidden rounded-full',
          onDark ? 'bg-white/20' : 'bg-gray-100',
        )}
      >
        <motion.div
          className={cx(
            'absolute inset-y-0 left-0 rounded-full',
            isReleased ? 'bg-leaf-500' : 'bg-harvest-500',
          )}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(progress, 0.04) * 100}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <ol className="mt-2.5 flex justify-between">
        {CUSTOMER_STAGE_RAIL.map((stage, index) => {
          const isDone = index < activeIndex || isReleased;
          const isActive = index === activeIndex && !isReleased;

          return (
            <li
              key={stage}
              className={cx(
                'text-[11px] tracking-[-0.005em] transition-colors duration-500',
                isActive && (onDark ? 'font-semibold text-white' : 'font-semibold text-harvest-600'),
                isDone && !isActive && (onDark ? 'text-white/75' : 'text-leaf-600'),
                !isActive && !isDone && (onDark ? 'text-white/35' : 'text-gray-300'),
              )}
            >
              {CROP_STAGE_LABEL[stage]}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
