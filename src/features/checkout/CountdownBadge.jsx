import { Clock } from 'lucide-react';
import { cx, formatCountdown } from '../../lib/format';
import { useCountdown } from '../../lib/useCountdown';

/** Live 48-hour payment window countdown. */
export default function CountdownBadge({ deadline, className }) {
  const { remaining } = useCountdown(deadline);

  if (!deadline) return null;

  const expired = remaining <= 0;
  const urgent = !expired && remaining < 6 * 3600 * 1000;

  return (
    <span
      className={cx(
        'numeric inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset',
        expired && 'bg-gray-100 text-gray-400 ring-gray-200',
        urgent && 'bg-red-50 text-red-600 ring-red-100',
        !expired && !urgent && 'bg-harvest-50 text-harvest-600 ring-harvest-100',
        className,
      )}
    >
      <Clock size={12} strokeWidth={2.2} />
      {formatCountdown(remaining)}
    </span>
  );
}
