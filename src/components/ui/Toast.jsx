import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { cx } from '../../lib/format';
import { ToastContext } from './ToastContext';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONES = { success: 'text-leaf-600', error: 'text-red-500', info: 'text-gray-600' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, { tone = 'info', duration = 3500 } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast,
      success: (m, o) => toast(m, { ...o, tone: 'success' }),
      error: (m, o) => toast(m, { ...o, tone: 'error' }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map(({ id, message, tone }) => {
          const Icon = ICONS[tone];
          return (
            <div
              key={id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-gray-50/50 bg-white/95 px-4 py-3 shadow-shell backdrop-blur"
            >
              <Icon size={18} className={cx('mt-0.5 shrink-0', TONES[tone])} />
              <p className="text-sm text-gray-700">{message}</p>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
