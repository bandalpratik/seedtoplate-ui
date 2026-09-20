import { useNavigate } from 'react-router-dom';
import { cx } from '../../lib/format';
import { ChevronLeft } from 'lucide-react';

/** Shared chrome for the admin console: dark header, tight density. */
export default function AdminShell({ title, eyebrow, backTo, action, children }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-bone pb-28">
      <header className="grain bg-leaf-900 px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2">
          {backTo && (
            <button
              type="button"
              onClick={() => navigate(backTo)}
              aria-label="Go back"
              className="-ml-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10"
            >
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
          )}
          <p className="eyebrow text-white/40">{eyebrow ?? 'Seed & Plate ops'}</p>
          {action && <div className="ml-auto">{action}</div>}
        </div>
        <h1 className="display-lg mt-2.5 text-white">{title}</h1>
      </header>

      <div className="px-5 pt-6">{children}</div>
    </div>
  );
}

export function StatTile({ label, value, tone = 'light', className }) {
  return (
    <div
      className={cx(
        'flex-1 rounded-2xl px-4 py-3.5',
        tone === 'dark' ? 'bg-leaf-900 text-white' : 'bg-white ring-1 ring-black/[0.05]',
        className,
      )}
    >
      <p className={tone === 'dark' ? 'eyebrow text-white/40' : 'eyebrow text-clay'}>{label}</p>
      <p
        className={cx(
          'numeric mt-1 text-[21px] font-semibold tracking-tight',
          tone === 'dark' ? 'text-white' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}
