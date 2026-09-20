import { cx } from '../../lib/format';

const TONES = {
  leaf: 'bg-leaf-50 text-leaf-700 ring-leaf-100',
  harvest: 'bg-harvest-50 text-harvest-600 ring-harvest-100',
  neutral: 'bg-gray-100 text-gray-700 ring-gray-200/70',
  muted: 'bg-gray-50 text-gray-400 ring-gray-100',
  glass: 'bg-white/15 text-white ring-white/25 backdrop-blur-md',
};

export default function Tag({ tone = 'leaf', icon: Icon, className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon size={12} strokeWidth={2.2} />}
      {children}
    </span>
  );
}
