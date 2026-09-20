import { cx } from '../../lib/format';

export function Skeleton({ className, rounded = 'rounded-xl' }) {
  return (
    <div
      className={cx(
        'relative overflow-hidden bg-gray-100/90',
        rounded,
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent',
        className,
      )}
    />
  );
}

export function CropCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[26px] bg-white shadow-card ring-1 ring-black/[0.04]">
      <Skeleton className="h-56" rounded="rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-[26px] bg-white p-5 shadow-card ring-1 ring-black/[0.04]"
        >
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}
