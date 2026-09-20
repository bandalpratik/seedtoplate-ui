import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { getAdminBatches, previewRelease, releaseTranche } from '../../api/admin';
import {
  costPerSellableKg,
  marginPercent,
  PRICING_DEFAULTS,
  suggestPrice,
} from '../../lib/pricing';
import { cx, formatCurrency, formatKg } from '../../lib/format';
import { ROUTES } from '../../app/routes';
import {
  Button,
  ConfirmSheet,
  ErrorState,
  ListSkeleton,
  useToast,
} from '../../components/ui';
import AdminShell, { StatTile } from './AdminShell';

const field =
  'w-full rounded-2xl bg-white px-4 py-3 text-[15px] text-ink ring-1 ring-black/[0.06] outline-none transition-shadow placeholder:text-gray-300 focus:ring-2 focus:ring-leaf-600';

function NumberField({ id, label, hint, suffix, value, onChange, placeholder }) {
  return (
    <div>
      <label className="eyebrow text-clay" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          inputMode="decimal"
          className={cx(field, suffix && 'pr-12')}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        />
        {suffix && (
          <span className="numeric pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">{hint}</p>}
    </div>
  );
}

export default function ReleaseTrancheScreen() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [releasedKg, setReleasedKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [mandiRate, setMandiRate] = useState('');
  const [weeksInStore, setWeeksInStore] = useState('2');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);

  const { data: batches, isPending, error, refetch } = useQuery({
    queryKey: ['admin', 'batches'],
    queryFn: getAdminBatches,
  });

  const batch = (batches ?? []).find((b) => String(b.id) === String(batchId));

  const kg = Number(releasedKg);
  const price = Number(pricePerKg);
  const mandi = mandiRate === '' ? null : Number(mandiRate);
  const queuedKg = Number(batch?.queuedKg ?? 0);
  const queueCount = Number(batch?.queueCount ?? 0);
  const hasFixedPrice = Number(batch?.finalRetailPricePerKg ?? 0) > 0;

  // A slice is drawn from the reservation queue, not from unreserved stock —
  // those kilos already left `availableYieldKg` the moment they were reserved.
  const validInputs = kg > 0 && price > 0 && Boolean(batch) && kg <= queuedKg;

  const { data: plan, isFetching: previewing } = useQuery({
    queryKey: ['admin', 'release-preview', batchId, kg, price],
    queryFn: () => previewRelease(batchId, { releasedKg: kg, pricePerKg: price, mandiRate: mandi }),
    enabled: Boolean(validInputs),
    placeholderData: (previous) => previous,
  });

  const cost = useMemo(
    () =>
      mandiRate
        ? costPerSellableKg({ mandiRate: Number(mandiRate), weeksInStore: Number(weeksInStore) })
        : null,
    [mandiRate, weeksInStore],
  );

  const suggestion = useMemo(
    () =>
      mandiRate
        ? suggestPrice({ mandiRate: Number(mandiRate), weeksInStore: Number(weeksInStore) })
        : null,
    [mandiRate, weeksInStore],
  );

  const margin = marginPercent(price, cost);

  const commit = useMutation({
    mutationFn: () => releaseTranche(batchId, { releasedKg: kg, pricePerKg: price, mandiRate: mandi, note }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setConfirming(false);
      if (result.bandBreach) {
        toast.error(result.message);
      } else {
        toast.success(`${formatKg(result.releasedKg)} allocated to ${result.reservationIds.length} customers.`);
      }
      navigate(ROUTES.adminBatch(batchId));
    },
    onError: (err) => {
      setConfirming(false);
      toast.error(err.userMessage);
    },
  });

  if (isPending) {
    return (
      <AdminShell title="Release a slice" backTo={ROUTES.adminBatch(batchId)}>
        <ListSkeleton rows={3} />
      </AdminShell>
    );
  }

  if (error || !batch) {
    return (
      <AdminShell title="Release a slice" backTo={ROUTES.adminBatch(batchId)}>
        <ErrorState error={error} onRetry={refetch} />
      </AdminShell>
    );
  }

  const breached = plan?.bandBreach;
  const allocatedKg = Number(plan?.releasedKg ?? 0);
  const noQueue = queueCount === 0;

  // Say out loud why the button cannot be pressed — an unexplained disabled
  // button is the fastest way to make an admin think the app is broken.
  let disabledReason = null;
  if (hasFixedPrice) {
    disabledReason = 'This batch already has a fixed selling price, so it does not use release slices.';
  } else if (noQueue) {
    disabledReason = 'Nobody has reserved from this batch yet, so there is nothing to price.';
  } else if (!(kg > 0)) {
    disabledReason = 'Enter how many kilos this slice should cover.';
  } else if (!(price > 0)) {
    disabledReason = 'Enter a price per kilo for this slice.';
  } else if (kg > queuedKg) {
    disabledReason = `The queue only holds ${formatKg(queuedKg)}. Release that or less.`;
  } else if (previewing && !plan) {
    disabledReason = 'Working out the allocation…';
  } else if (plan && (plan.reservationIds ?? []).length === 0) {
    disabledReason =
      plan.message || 'This slice is smaller than the first reservation in the queue.';
  }

  const canRelease = !disabledReason;

  return (
    <AdminShell
      eyebrow={`${batch.variety ?? batch.seedVariety ?? ''} ${batch.cropName}`.trim()}
      title="Release a slice"
      backTo={ROUTES.adminBatch(batchId)}
    >
      <div className="flex gap-3">
        <StatTile
          label="Waiting to be priced"
          value={queueCount ? `${queueCount} · ${formatKg(queuedKg)}` : 'Nobody yet'}
          tone="dark"
        />
        <StatTile label="Unreserved stock" value={formatKg(batch.unreleasedKg)} />
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-gray-400">
        A slice is priced for the people already in the queue. Unreserved stock stays in the
        store until somebody reserves it.
      </p>

      {/* ---- the price calculator ------------------------------------- */}
      <div className="mt-6 rounded-[22px] bg-white p-4 shadow-card ring-1 ring-black/[0.04]">
        <p className="eyebrow text-clay">Work out the price</p>

        <div className="mt-3 flex gap-2.5">
          <NumberField
            id="mandi"
            label="Mandi rate"
            suffix="₹/kg"
            placeholder="e.g. 34"
            value={mandiRate}
            onChange={setMandiRate}
          />
          <NumberField
            id="weeks"
            label="Weeks in store"
            placeholder="2"
            value={weeksInStore}
            onChange={setWeeksInStore}
          />
        </div>

        {suggestion && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setPricePerKg(String(suggestion))}
            className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-2xl bg-leaf-50 px-4 py-3 text-left transition-colors hover:bg-leaf-100"
          >
            <span>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-leaf-700">
                <Sparkles size={13} strokeWidth={2.2} />
                Suggested
              </span>
              <span className="mt-0.5 block text-[11px] text-leaf-700/70">
                {PRICING_DEFAULTS.premium}x mandi + {PRICING_DEFAULTS.shrinkagePercent}% shrinkage +
                carry + pack + drive
              </span>
            </span>
            <span className="numeric text-[19px] font-semibold text-leaf-900">
              {formatCurrency(suggestion)}
            </span>
          </motion.button>
        )}

        {cost && (
          <p className="numeric mt-2.5 text-[11px] text-gray-400">
            Landed cost {formatCurrency(Math.round(cost))}/sellable kg
          </p>
        )}
      </div>

      {/* ---- the tranche ----------------------------------------------- */}
      <div className="mt-4 rounded-[22px] bg-white p-4 shadow-card ring-1 ring-black/[0.04]">
        <p className="eyebrow text-clay">This slice</p>

        <div className="mt-3 flex gap-2.5">
          <NumberField
            id="kg"
            label="Release"
            suffix="kg"
            hint={queueCount ? `Queue holds ${formatKg(queuedKg)}` : 'Nobody in the queue'}
            placeholder={String(queuedKg || 0)}
            value={releasedKg}
            onChange={setReleasedKg}
          />
          <NumberField
            id="price"
            label="Price"
            suffix="₹/kg"
            hint={
              batch.estimatedPriceHighPerKg
                ? `Ceiling ${formatCurrency(batch.estimatedPriceHighPerKg)}`
                : undefined
            }
            placeholder="0"
            value={pricePerKg}
            onChange={setPricePerKg}
          />
        </div>

        <input
          className={cx(field, 'mt-3')}
          placeholder="Note for the record (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {kg > queuedKg && (
          <p className="mt-2.5 text-[12px] text-harvest-600">
            The queue only holds {formatKg(queuedKg)}. Anything above that stays in store.
          </p>
        )}

        {margin !== null && price > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-bone px-4 py-3">
            <span className="text-[13px] text-gray-500">Gross margin</span>
            <span
              className={cx(
                'numeric text-[17px] font-semibold',
                margin < 25 ? 'text-harvest-600' : 'text-leaf-700',
              )}
            >
              {margin.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* ---- FIFO preview ---------------------------------------------- */}
      {plan && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cx('mt-4 rounded-[22px] p-4 ring-1', previewing && 'opacity-60',
            breached ? 'bg-harvest-50 ring-harvest-200' : 'bg-white shadow-card ring-black/[0.04]')}
        >
          {breached ? (
            <div className="flex gap-3">
              <AlertTriangle size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-harvest-600" />
              <div>
                <p className="text-[15px] font-semibold text-harvest-600">Above the quoted band</p>
                <p className="mt-1 text-[13px] leading-relaxed text-harvest-600/80">
                  We promised a ceiling of {formatCurrency(batch.estimatedPriceHighPerKg)}/kg. Releasing
                  at {formatCurrency(price)} will cancel {plan.reservationIds.length} reservations free
                  and return {formatKg(plan.releasedKg)} to the pool. Lower the price or raise the
                  band first.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="eyebrow text-clay">FIFO allocation</p>

              <div className="mt-3 flex gap-2">
                <div className="flex-1 rounded-xl bg-bone px-3 py-2">
                  <p className="eyebrow text-clay">Allocated</p>
                  <p className="numeric mt-0.5 text-[15px] font-semibold text-ink">
                    {formatKg(plan.releasedKg)}
                  </p>
                </div>
                <div className="flex-1 rounded-xl bg-bone px-3 py-2">
                  <p className="eyebrow text-clay">Still queued</p>
                  <p className="numeric mt-0.5 text-[15px] font-semibold text-ink">
                    {formatKg(Math.max(0, queuedKg - allocatedKg))}
                  </p>
                </div>
                <div className="flex-1 rounded-xl bg-leaf-900 px-3 py-2 text-white">
                  <p className="eyebrow text-white/40">Revenue</p>
                  <p className="numeric mt-0.5 text-[15px] font-semibold">
                    {formatCurrency(Number(plan.pricePerKg) * allocatedKg)}
                  </p>
                </div>
              </div>

              {allocatedKg < kg && (
                <p className="mt-3 text-[12px] leading-relaxed text-gray-500">
                  {formatKg(kg - allocatedKg)} of what you typed cannot be allocated — the next
                  reservation does not fit. Those kilos stay in store.
                </p>
              )}

              <ol className="mt-4 divide-y divide-black/[0.05]">
                {(plan.reservationIds ?? []).map((reservationId, i) => (
                  <li key={reservationId} className="flex items-center justify-between py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="numeric flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bone text-[11px] font-semibold text-ink">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-ink">Reservation {String(reservationId).slice(0, 8)}</p>
                        <p className="numeric text-[11px] text-gray-400">
                          FIFO match · payment window opens now
                        </p>
                      </div>
                    </div>
                    <span className="numeric text-[13px] text-gray-500">
                      {formatCurrency(price)}/kg
                    </span>
                  </li>
                ))}
              </ol>

              {(plan.reservationIds ?? []).length === 0 && (
                <p className="mt-3 text-[12px] text-gray-400">
                  Nobody fits in this slice yet. Release more kg, or wait for the queue to build.
                </p>
              )}
            </>
          )}
        </motion.div>
      )}

      <Button
        fullWidth
        size="lg"
        className="mt-5"
        disabled={!canRelease}
        onClick={() => setConfirming(true)}
      >
        Release {allocatedKg > 0 ? formatKg(allocatedKg) : 'slice'}
      </Button>

      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-gray-400">
        {disabledReason ?? 'This starts a 48 hour payment window for everyone in the slice.'}
      </p>

      <ConfirmSheet
        open={confirming}
        title={breached ? 'This will cancel reservations' : 'Release this slice?'}
        description={
          breached
            ? `Releasing above the band cancels ${(plan?.reservationIds ?? []).length} reservations free of charge. This cannot be undone.`
            : `${formatKg(allocatedKg)} goes to ${(plan?.reservationIds ?? []).length} customers at ${formatCurrency(price)}/kg. Payment links go out immediately and expire in 48 hours.`
        }
        confirmLabel={breached ? 'Release anyway' : `Release · ${formatCurrency(Number(price || 0) * allocatedKg)}`}
        cancelLabel="Go back"
        loading={commit.isPending}
        onConfirm={() => commit.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </AdminShell>
  );
}
