import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { ArrowRight, Sprout, Truck } from 'lucide-react';
import { getAdminBatches } from '../../api/admin';
import { CROP_STAGE, CROP_STAGE_LABEL, hasPhysicalStock } from '../../lib/constants';
import { formatCurrency, formatKg } from '../../lib/format';
import { ROUTES } from '../../app/routes';
import { Button, EmptyState, ErrorState, FilterChips, ListSkeleton, Reveal, Tag } from '../../components/ui';
import AdminShell, { StatTile } from './AdminShell';

function BatchRow({ batch, index }) {
  const navigate = useNavigate();
  const fixedPrice = Number(batch.finalRetailPricePerKg ?? 0);
  const isFixedPrice = fixedPrice > 0;
  const physicalStock = hasPhysicalStock(batch.currentStage);
  const releasable = !isFixedPrice && batch.queueCount > 0 && physicalStock && Boolean(batch.actualYieldKg);

  return (
    <Reveal delay={index * 0.05}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate(ROUTES.adminBatch(batch.id))}
        className="block w-full cursor-pointer rounded-[22px] bg-white p-4 text-left shadow-card ring-1 ring-black/[0.04]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-semibold tracking-[-0.015em] text-ink">
              {batch.variety ?? batch.seedVariety ?? ''} {batch.cropName}
            </h3>
            <p className="numeric mt-1 text-[12px] text-gray-400">
              {batch.queueCount} in queue · {formatKg(batch.queuedKg)} claimed
            </p>
          </div>
          <Tag tone={batch.currentStage === CROP_STAGE.GROWING ? 'leaf' : 'harvest'}>
            {CROP_STAGE_LABEL[batch.currentStage]}
          </Tag>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="flex-1 rounded-xl bg-bone px-3 py-2">
            <p className="eyebrow text-clay">{physicalStock ? 'In hand' : 'Expected yield'}</p>
            <p className="numeric mt-0.5 text-[15px] font-semibold text-ink">
              {physicalStock
                ? batch.actualYieldKg
                  ? formatKg(batch.unreleasedKg)
                  : 'Not weighed'
                : formatKg(batch.plannedYieldKg)}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-bone px-3 py-2">
            <p className="eyebrow text-clay">{isFixedPrice ? 'Fixed price' : 'Band'}</p>
            <p className="numeric mt-0.5 text-[15px] font-semibold text-ink">
              {isFixedPrice
                ? formatCurrency(batch.finalRetailPricePerKg)
                : batch.estimatedPriceLowPerKg
                ? `${formatCurrency(batch.estimatedPriceLowPerKg)}–${formatCurrency(batch.estimatedPriceHighPerKg)}`
                : '—'}
            </p>
          </div>
        </div>

        {isFixedPrice && (
          <p className="mt-3 text-[12px] font-medium text-leaf-700">
            Ready stock with a locked price
          </p>
        )}

        {releasable && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-harvest-600">
            Ready to release a slice
            <ArrowRight size={13} strokeWidth={2.4} />
          </p>
        )}
      </motion.button>
    </Reveal>
  );
}

export default function AdminHomeScreen() {
  const navigate = useNavigate();
  const [selectedCrop, setSelectedCrop] = useState('ALL');

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['admin', 'batches'],
    queryFn: getAdminBatches,
  });

  const batches = data ?? [];
  const cropOptions = useMemo(() => {
    const cropNames = [...new Set(batches.map((batch) => batch.cropName).filter(Boolean))].sort();
    return [{ value: 'ALL', label: `All crops (${batches.length})` }].concat(
      cropNames.map((cropName) => ({
        value: cropName,
        label: `${cropName} (${batches.filter((batch) => batch.cropName === cropName).length})`,
      })),
    );
  }, [batches]);
  const visibleBatches =
    selectedCrop === 'ALL' ? batches : batches.filter((batch) => batch.cropName === selectedCrop);
  const reservable = visibleBatches.reduce((sum, b) => sum + Number(b.availableYieldKg ?? 0), 0);
  const queued = visibleBatches.reduce((sum, b) => sum + Number(b.queueCount ?? 0), 0);

  return (
    <AdminShell eyebrow="Seed & Plate ops" title="Batches" backTo={ROUTES.dashboard}>
      <div className="flex gap-3">
        <StatTile label="Open to reserve" value={formatKg(reservable)} tone="dark" />
        <StatTile label="In queue" value={queued} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button size="lg" variant="secondary" onClick={() => navigate(ROUTES.adminAddBatch)}>
          Add new crop
        </Button>
        <Button size="lg" variant="secondary" onClick={() => navigate(ROUTES.adminOrders)}>
          Orders
        </Button>
        <Button className="col-span-2" size="lg" variant="secondary" onClick={() => navigate(ROUTES.adminManifest)}>
          <Truck size={16} strokeWidth={2.1} />
          Manifest
        </Button>
      </div>

      {!isPending && !error && batches.length > 0 && (
        <div className="mt-6">
          <FilterChips
            label="Filter by crop"
            options={cropOptions}
            value={selectedCrop}
            onChange={setSelectedCrop}
          />
        </div>
      )}

      <div className="mt-7 space-y-3">
        {isPending && <ListSkeleton rows={3} />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {!isPending && !error && batches.length > 0 && visibleBatches.length === 0 && (
          <EmptyState
            icon={Sprout}
            title="No batches in this crop"
            description="Pick another crop filter to see the rest of your stock."
            action="Show all crops"
            onAction={() => setSelectedCrop('ALL')}
          />
        )}
        {visibleBatches.map((batch, index) => (
          <BatchRow key={batch.id} batch={batch} index={index} />
        ))}
      </div>
    </AdminShell>
  );
}
