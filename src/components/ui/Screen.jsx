import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cx } from '../../lib/format';

/** Standard screen frame for secondary pages. */
export default function Screen({ title, eyebrow, onBack, backTo, action, children, className }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    if (backTo) return navigate(backTo);
    return navigate(-1);
  };

  return (
    <div className={cx('flex min-h-full flex-col px-5 pt-5', className)}>
      <header className="flex items-center gap-2">
        {(onBack || backTo) && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 cursor-pointer"
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </button>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow text-clay">{eyebrow}</p>}
          <h1 className="display-md truncate text-ink">{title}</h1>
        </div>
        {action && <div className="ml-auto">{action}</div>}
      </header>

      <div className="flex-1 pb-8">{children}</div>
    </div>
  );
}
