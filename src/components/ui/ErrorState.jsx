import { AlertTriangle, WifiOff } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ error, onRetry }) {
  const isNetwork = error?.isNetwork;
  const Icon = isNetwork ? WifiOff : AlertTriangle;

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-harvest-50">
        <Icon size={26} strokeWidth={1.8} className="text-harvest-600" />
      </div>
      <h3 className="display-md text-ink">Something went wrong</h3>
      <p className="mt-2.5 max-w-[17rem] text-[14px] leading-relaxed text-gray-500">
        {error?.userMessage || error?.message || 'Please try again in a moment.'}
      </p>
      {onRetry && (
        <Button variant="quiet" className="mt-7" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
