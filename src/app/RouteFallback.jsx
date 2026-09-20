import { ListSkeleton, Skeleton } from '../components/ui';

/** Shown while a route chunk streams in. Mirrors the shape of a screen. */
export default function RouteFallback() {
  return (
    <div className="px-5 pb-28 pt-12">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="mt-4 h-9 w-2/3" />
      <div className="mt-8">
        <ListSkeleton rows={2} />
      </div>
    </div>
  );
}
