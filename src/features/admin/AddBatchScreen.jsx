import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CROP_STAGE, CROP_STAGE_LABEL, hasPhysicalStock } from '../../lib/constants';
import { cx, formatCurrency } from '../../lib/format';
import { ROUTES } from '../../app/routes';
import { createBatch } from '../../api/admin';
import { Button, useToast } from '../../components/ui';
import AdminShell from './AdminShell';

const field =
  'w-full rounded-2xl bg-white px-4 py-3 text-[15px] text-ink ring-1 ring-black/[0.06] outline-none transition-shadow placeholder:text-gray-300 focus:ring-2 focus:ring-leaf-600';

const stageOptions = [
  CROP_STAGE.SOWN,
  CROP_STAGE.GROWING,
  CROP_STAGE.HARVESTED,
  CROP_STAGE.STORED_CURING,
  CROP_STAGE.BATCH_RELEASED,
  CROP_STAGE.DISPATCHED,
];

function toBatchSummary(batch) {
  return {
    ...batch,
    seedVariety: batch.variety,
    unreleasedKg: batch.availableYieldKg,
    queueCount: 0,
    queuedKg: 0,
  };
}

export default function AddBatchScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    cropName: '',
    farmName: 'Wai Farm',
    variety: '',
    description: '',
    currentStage: CROP_STAGE.GROWING,
    pricingMode: 'band',
    plannedYieldKg: '',
    actualYieldKg: '',
    estimatedPriceLowPerKg: '',
    estimatedPriceHighPerKg: '',
    finalRetailPricePerKg: '',
  });

  const isFixedPrice = form.pricingMode === 'fixed';
  const lowBand = Number(form.estimatedPriceLowPerKg || 0);
  const highBand = Number(form.estimatedPriceHighPerKg || 0);
  const fixedPrice = Number(form.finalRetailPricePerKg || 0);
  const stageHasPhysicalStock = hasPhysicalStock(form.currentStage);
  const plannedYieldKg = Number(form.plannedYieldKg || 0);
  const actualYieldKg = Number(form.actualYieldKg || 0);
  const effectiveCapacityKg = stageHasPhysicalStock ? actualYieldKg : plannedYieldKg;

  const canSubmit = useMemo(() => {
    const hasBand = lowBand > 0 && highBand > 0 && lowBand <= highBand;
    const hasFixedPrice = fixedPrice > 0;

    return (
      form.cropName.trim() &&
      form.farmName.trim() &&
      Number.isFinite(effectiveCapacityKg) &&
      effectiveCapacityKg > 0 &&
      String(form.currentStage).trim() &&
      !(!stageHasPhysicalStock && isFixedPrice) &&
      (isFixedPrice ? hasFixedPrice : hasBand)
    );
  }, [effectiveCapacityKg, fixedPrice, form, highBand, isFixedPrice, lowBand, stageHasPhysicalStock]);

  const create = useMutation({
    mutationFn: () =>
      createBatch({
        cropName: form.cropName.trim(),
        farmName: form.farmName.trim(),
        variety: form.variety.trim() || null,
        description: form.description.trim() || null,
        currentStage: form.currentStage,
        plannedYieldKg: stageHasPhysicalStock ? Number(form.actualYieldKg || 0) : Number(form.plannedYieldKg || 0),
        actualYieldKg: stageHasPhysicalStock ? Number(form.actualYieldKg || 0) : null,
        estimatedPriceLowPerKg:
          isFixedPrice || form.estimatedPriceLowPerKg === ''
            ? null
            : Number(form.estimatedPriceLowPerKg),
        estimatedPriceHighPerKg:
          isFixedPrice || form.estimatedPriceHighPerKg === ''
            ? null
            : Number(form.estimatedPriceHighPerKg),
        finalRetailPricePerKg:
          isFixedPrice && form.finalRetailPricePerKg !== ''
            ? Number(form.finalRetailPricePerKg)
            : null,
      }),
    onSuccess: (batch) => {
      queryClient.setQueryData(['admin', 'batches'], (current) => {
        const nextBatch = toBatchSummary(batch);
        const existing = Array.isArray(current) ? current : [];
        if (existing.some((item) => String(item.id) === String(nextBatch.id))) {
          return existing;
        }
        return [nextBatch, ...existing];
      });
      queryClient.setQueryData(['admin', 'batches', batch.id], {
        ...toBatchSummary(batch),
        timeline: [],
        releases: [],
      });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      toast.success(`${batch.cropName} is now in the batch list.`);
      navigate(ROUTES.adminBatch(batch.id));
    },
    onError: (err) => {
      toast.error(err.userMessage || 'Could not create this batch.');
    },
  });

  const updateField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  return (
    <AdminShell eyebrow="Seed & Plate ops" title="Add batch" backTo={ROUTES.admin}>
      <div className="space-y-4 pb-12">
        <div>
          <label className="eyebrow text-clay" htmlFor="cropName">
            Crop name
          </label>
          <input
            id="cropName"
            className={field}
            value={form.cropName}
            onChange={updateField('cropName')}
            placeholder="Farm Onion"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="eyebrow text-clay" htmlFor="farmName">
            Farm name
          </label>
          <input
            id="farmName"
            className={field}
            value={form.farmName}
            onChange={updateField('farmName')}
            placeholder="Wai Farm"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="eyebrow text-clay" htmlFor="variety">
            Variety
          </label>
          <input
            id="variety"
            className={field}
            value={form.variety}
            onChange={updateField('variety')}
            placeholder="Nashik Local"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="eyebrow text-clay" htmlFor="currentStage">
            Stage
          </label>
          <select
            id="currentStage"
            className={field}
            value={form.currentStage}
            onChange={(event) =>
              setForm((current) => {
                const nextStage = event.target.value;
                const nextHasPhysicalStock = hasPhysicalStock(nextStage);
                return {
                  ...current,
                  currentStage: nextStage,
                  pricingMode: !nextHasPhysicalStock && current.pricingMode === 'fixed' ? 'band' : current.pricingMode,
                };
              })
            }
          >
            {stageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {CROP_STAGE_LABEL[stage] ?? stage}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
            Use a live stage here. <span className="font-medium text-gray-500">Complete</span> is for
            batches that have already finished selling, so it is not offered while you still hold stock.
          </p>
        </div>

        <div>
          <label className="eyebrow text-clay" htmlFor={stageHasPhysicalStock ? 'actualYieldKg' : 'plannedYieldKg'}>
            {stageHasPhysicalStock ? 'Stock currently with you (kg)' : 'Expected sellable yield (kg)'}
          </label>
          <input
            id={stageHasPhysicalStock ? 'actualYieldKg' : 'plannedYieldKg'}
            className={field}
            value={stageHasPhysicalStock ? form.actualYieldKg : form.plannedYieldKg}
            onChange={updateField(stageHasPhysicalStock ? 'actualYieldKg' : 'plannedYieldKg')}
            inputMode="decimal"
            placeholder="1200"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
            {stageHasPhysicalStock
              ? 'Enter the full kilos you physically have for this batch right now.'
              : 'Use your best estimate of what this sowing can finally fulfill. This acts as the reservation cap until the real harvest is weighed.'}
          </p>
        </div>

        <div>
          <p className="eyebrow text-clay">Pricing model</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2.5">
            {[
              ['band', 'Price later'],
              ['fixed', 'Fixed price now'],
            ].map(([value, label]) => {
              const active = form.pricingMode === value;
              const disabled = value === 'fixed' && !stageHasPhysicalStock;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => !disabled && setForm((current) => ({ ...current, pricingMode: value }))}
                  disabled={disabled}
                  className={cx(
                    'cursor-pointer rounded-2xl px-4 py-3 text-left transition-colors',
                    active ? 'bg-leaf-900 text-white' : 'bg-white text-ink ring-1 ring-black/[0.06]',
                    disabled ? 'cursor-not-allowed opacity-45' : '',
                  )}
                >
                  <span className="block text-[14px] font-medium">{label}</span>
                  <span className={cx('mt-1 block text-[11px] leading-relaxed', active ? 'text-white/60' : 'text-gray-400')}>
                    {disabled
                      ? 'Only harvested or stored stock can use a locked ready-stock price.'
                      : value === 'fixed'
                      ? 'Use this when the stock is already with you and the selling price is known.'
                      : 'Use this when customers are reserving first and the tranche price will be decided later.'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {isFixedPrice ? (
          <div>
            <label className="eyebrow text-clay" htmlFor="finalRetailPricePerKg">
              Selling price
            </label>
            <input
              id="finalRetailPricePerKg"
              className={field}
              value={form.finalRetailPricePerKg}
              onChange={updateField('finalRetailPricePerKg')}
              inputMode="decimal"
              placeholder="240"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
              Customers will see this as a fixed ready-stock price and move straight to payment after reserving.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow text-clay" htmlFor="estimatedPriceLowPerKg">
                Low band
              </label>
              <input
                id="estimatedPriceLowPerKg"
                className={field}
                value={form.estimatedPriceLowPerKg}
                onChange={updateField('estimatedPriceLowPerKg')}
                inputMode="decimal"
                placeholder="88"
              />
            </div>

            <div>
              <label className="eyebrow text-clay" htmlFor="estimatedPriceHighPerKg">
                High band
              </label>
              <input
                id="estimatedPriceHighPerKg"
                className={field}
                value={form.estimatedPriceHighPerKg}
                onChange={updateField('estimatedPriceHighPerKg')}
                inputMode="decimal"
                placeholder="96"
              />
            </div>
            <p className="col-span-2 text-[11px] leading-relaxed text-gray-400">
              Customers see this as the expected price window, and the actual tranche price is set later.
            </p>
          </div>
        )}

        <div>
          <label className="eyebrow text-clay" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className={`${field} min-h-[110px] resize-none`}
            value={form.description}
            onChange={updateField('description')}
            placeholder="Short summary for the batch story and customer readout."
          />
        </div>

        {isFixedPrice && fixedPrice > 0 && (
          <div className="rounded-2xl bg-bone px-4 py-3 text-[12px] leading-relaxed text-gray-500">
            Customers will see <span className="numeric font-semibold text-ink">{formatCurrency(fixedPrice)}/kg</span>{' '}
            as a fixed price, not a future estimate.
          </div>
        )}

        {!stageHasPhysicalStock && (
          <div className="rounded-2xl bg-bone px-4 py-3 text-[12px] leading-relaxed text-gray-500">
            This crop is not in hand yet, so the number above is a planning estimate, not physical stock.
          </div>
        )}

        <Button
          fullWidth
          size="lg"
          loading={create.isPending}
          disabled={!canSubmit || create.isPending}
          onClick={() => create.mutate()}
        >
          Create batch
        </Button>
      </div>
    </AdminShell>
  );
}
