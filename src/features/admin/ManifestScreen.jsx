import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Check, Download, PackageCheck, Printer } from 'lucide-react';
import { completeReservation, getLogisticsManifest } from '../../api/admin';
import { formatKg } from '../../lib/format';
import { ROUTES } from '../../app/routes';
import { Button, EmptyState, ErrorState, ListSkeleton, Reveal, Tag, useToast } from '../../components/ui';
import AdminShell, { StatTile } from './AdminShell';

/** Build a CSV from the flat manifest list. */
function downloadCsv(manifest) {
  const rows = [['Batch', 'Zone', 'Route', 'Load Kg', 'Status', 'Created At']];
  manifest.forEach((item) => {
    rows.push([item.batchId, item.zone, item.route, item.loadKg, item.handoffStatus, item.createdAt]);
  });

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `seedtoplate-manifest-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ManifestCard({ item, onComplete, completingId }) {
  const done = item.handoffStatus === 'DELIVERED';

  return (
    <Reveal>
      <section className="overflow-hidden rounded-[24px] bg-white shadow-card ring-1 ring-black/[0.04]">
        <div className="bg-leaf-900 px-5 py-4 text-white">
          <p className="eyebrow text-white/40">Load for</p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h2 className="display-md text-white">{item.zone}</h2>
            <span className="numeric text-[20px] font-semibold">{formatKg(item.loadKg)}</span>
          </div>
        </div>

        <div className="divide-y divide-black/[0.05] px-5">
          <div className="flex items-baseline justify-between py-3">
            <span className="text-[15px] text-gray-500">Route</span>
            <span className="text-[15px] font-medium text-ink">{item.route}</span>
          </div>
          <div className="flex items-baseline justify-between py-3">
            <span className="text-[15px] text-gray-500">Batch</span>
            <span className="numeric text-[15px] font-medium text-ink">{String(item.batchId).slice(0, 8)}</span>
          </div>
          <div className="flex items-baseline justify-between py-3">
            <span className="text-[15px] text-gray-500">Status</span>
            <Tag tone={done ? 'leaf' : 'muted'}>{item.handoffStatus}</Tag>
          </div>
        </div>

        <div className="border-t border-black/[0.05] bg-bone px-5 py-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            aria-label={`Mark ${item.zone} delivered`}
            disabled={done || completingId === item.id}
            onClick={() => onComplete(item.id)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[14px] font-medium text-leaf-700 ring-1 ring-black/[0.04] transition-colors hover:bg-leaf-50 disabled:opacity-40"
          >
            <Check size={16} strokeWidth={2.6} />
            {done ? 'Delivered' : 'Mark delivered'}
          </motion.button>
        </div>
      </section>
    </Reveal>
  );
}

export default function ManifestScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['admin', 'manifest'],
    queryFn: () => getLogisticsManifest(),
  });

  const summary = useMemo(() => {
    const manifest = data ?? [];
    return {
      totalKg: manifest.reduce((sum, item) => sum + Number(item.loadKg ?? 0), 0),
      totalLoads: manifest.length,
      delivered: manifest.filter((item) => item.handoffStatus === 'DELIVERED').length,
    };
  }, [data]);

  const complete = useMutation({
    mutationFn: (manifestId) => completeReservation(manifestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      if (navigator.vibrate) navigator.vibrate(8);
      toast.success('Marked delivered.');
    },
    onError: (err) => toast.error(err.userMessage),
  });

  if (isPending) {
    return (
      <AdminShell title="Manifest" backTo={ROUTES.admin}>
        <ListSkeleton rows={3} />
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title="Manifest" backTo={ROUTES.admin}>
        <ErrorState error={error} onRetry={refetch} />
      </AdminShell>
    );
  }

  const manifest = data ?? [];
  const hasLoad = manifest.length > 0;

  return (
    <AdminShell eyebrow="Weekend run" title="Packing manifest" backTo={ROUTES.admin}>
      <div className="flex gap-3">
        <StatTile label="Total load" value={formatKg(summary.totalKg)} tone="dark" />
        <StatTile label="Loads" value={summary.totalLoads} />
        <StatTile label="Delivered" value={summary.delivered} />
      </div>

      {hasLoad && (
        <div className="mt-4 flex gap-2.5 print:hidden">
          <Button fullWidth variant="quiet" onClick={() => window.print()}>
            <Printer size={15} strokeWidth={2.1} />
            Print
          </Button>
          <Button fullWidth variant="quiet" onClick={() => downloadCsv(manifest)}>
            <Download size={15} strokeWidth={2.1} />
            CSV
          </Button>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {!hasLoad && (
          <EmptyState
            icon={PackageCheck}
            title="Nothing to load"
            description="Release a tranche and the manifest fills itself."
          />
        )}

        {manifest.map((item) => (
          <ManifestCard
            key={item.id}
            item={item}
            onComplete={complete.mutate}
            completingId={complete.isPending ? complete.variables : null}
          />
        ))}
      </div>
    </AdminShell>
  );
}
