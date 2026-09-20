import { cx } from '../../lib/format';

export default function FilterChips({ label = 'Filter', options = [], value, onChange }) {
  if (!options.length) return null;

  return (
    <div>
      <p className="eyebrow text-clay">{label}</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cx(
                'shrink-0 cursor-pointer rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors',
                active
                  ? 'bg-leaf-900 text-white'
                  : 'bg-white text-gray-600 ring-1 ring-black/[0.06] hover:bg-gray-50',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
