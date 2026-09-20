import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { getCropFeed } from '../../api/crops';
import { createReservation } from '../../api/reservations';
import { ROUTES } from '../../app/routes';
import {
  MAX_RESERVATION_KG,
  MIN_RESERVATION_KG,
  hasPhysicalStock,
  PICKUP_LOCATION,
  PICKUP_LOCATION_LABEL,
  PRICE_RULE,
  RESERVATION_STATUS,
  RESERVATION_STEP_KG,
} from '../../lib/constants';
import { clampQuantity, cx, formatCurrency, formatKg } from '../../lib/format';
import {
  Button,
  Card,
  ErrorState,
  ListSkeleton,
  PriceBandBar,
  Screen,
  useToast,
} from '../../components/ui';
import QuantitySlider from './QuantitySlider';

const PICKUP_HINT = {
  PUNE_OFFICE: 'Monday morning, at the office',
  JUINAGAR_RESIDENCE: 'Sunday evening, at your door',
};

export default function ReserveScreen() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [requestedKg, setRequestedKg] = useState(5);
  const [pickupLocation, setPickupLocation] = useState(PICKUP_LOCATION.PUNE_OFFICE);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['crops', 'feed'],
    queryFn: () => getCropFeed({ page: 0, size: 50 }),
  });

  const batch = useMemo(
    () => (data?.content ?? []).find((b) => String(b.id) === String(batchId)),
    [data, batchId],
  );

  const maxKg = Math.min(
    MAX_RESERVATION_KG,
    Number(batch?.availableYieldKg ?? MAX_RESERVATION_KG),
  );

  // Derived, so the selection always respects the batch's remaining yield
  // without a state-syncing effect.
  const kg = clampQuantity(requestedKg, {
    min: MIN_RESERVATION_KG,
    max: maxKg,
    step: RESERVATION_STEP_KG,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createReservation({
        batchId,
        quantityKg: kg,
        pickupLocation,
      }),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      if (navigator.vibrate) navigator.vibrate([6, 40, 12]);
      if (reservation?.status === RESERVATION_STATUS.AWAITING_PAYMENT) {
        toast.success('Reserved. This batch is already priced, so your payment window has started.');
        navigate(ROUTES.checkout(reservation.id));
      } else {
        toast.success('Reserved. We will message you the moment it is ready.');
        navigate(ROUTES.dashboard);
      }
    },
    onError: (err) => {
      if (err.isInsufficientYield) refetch();
      toast.error(err.userMessage);
    },
  });

  if (isPending) {
    return (
      <Screen title="Reserve" backTo={ROUTES.feed}>
        <div className="mt-8">
          <ListSkeleton rows={2} />
        </div>
      </Screen>
    );
  }

  if (error || !batch) {
    return (
      <Screen title="Reserve" backTo={ROUTES.feed}>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  const estimate =
    batch.finalRetailPricePerKg
      ? formatCurrency(kg * batch.finalRetailPricePerKg)
      : batch.estimatedPriceLowPerKg && batch.estimatedPriceHighPerKg
      ? `${formatCurrency(kg * batch.estimatedPriceLowPerKg)}–${formatCurrency(kg * batch.estimatedPriceHighPerKg)}`
      : null;

  const ceiling = batch.estimatedPriceHighPerKg
    ? formatCurrency(kg * batch.estimatedPriceHighPerKg)
    : null;
  const hasFixedPrice = Number(batch.finalRetailPricePerKg ?? 0) > 0;
  const physicalStock = hasPhysicalStock(batch.currentStage);

  return (
    <Screen
      eyebrow={`${formatKg(batch.availableYieldKg)} ${physicalStock ? 'still open to reserve' : 'left in this reservation cap'}`}
      title={`${batch.variety ?? batch.seedVariety ?? ''} ${batch.cropName}`.trim()}
      backTo={ROUTES.feed}
      className="pb-0"
    >
      <Card className="mt-7 px-6 pb-7 pt-8">
        <p className="eyebrow text-center text-clay">How much would you like?</p>

        <div className="mt-6">
          <QuantitySlider
            value={kg}
            onChange={setRequestedKg}
            min={MIN_RESERVATION_KG}
            max={maxKg}
            step={RESERVATION_STEP_KG}
          />
        </div>

        <div className="mt-8 rounded-2xl bg-bone px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-gray-500">Expected total</span>
            <span className="numeric text-[15px] font-semibold text-ink">
              {estimate ?? 'Priced when it ships'}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
            {hasFixedPrice
              ? `This stock is already priced at ${formatCurrency(batch.finalRetailPricePerKg)}/kg and your 48 hour payment window starts as soon as you reserve.`
              : PRICE_RULE}
            {!hasFixedPrice && ceiling && ` You will never be billed above ${ceiling}.`}
          </p>
        </div>

        {!hasFixedPrice && batch.estimatedPriceLowPerKg && batch.estimatedPriceHighPerKg && (
        <div className="mt-5 border-t border-black/[0.05] pt-5">
          <PriceBandBar
            low={batch.estimatedPriceLowPerKg}
              high={batch.estimatedPriceHighPerKg}
            />
            <button
              type="button"
              onClick={() => navigate(ROUTES.howWePrice)}
              className="mt-3 cursor-pointer text-[12px] font-medium text-leaf-600 underline underline-offset-4 hover:text-leaf-700"
            >
              How we price
            </button>
          </div>
        )}
      </Card>

      <div className="mt-6">
        <p className="eyebrow text-clay">Where should it reach you?</p>
        <div className="mt-3 space-y-2.5">
          {Object.values(PICKUP_LOCATION).map((loc) => {
            const active = loc === pickupLocation;
            return (
              <motion.button
                key={loc}
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => setPickupLocation(loc)}
                className={cx(
                  'flex w-full cursor-pointer items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-all duration-300',
                  active
                    ? 'bg-leaf-900 text-white shadow-leaf'
                    : 'bg-white text-ink ring-1 ring-black/[0.06] hover:ring-black/[0.12]',
                )}
              >
                <span>
                  <span className="block text-[15px] font-medium">
                    {PICKUP_LOCATION_LABEL[loc]}
                  </span>
                  <span
                    className={cx(
                      'mt-0.5 block text-[12px]',
                      active ? 'text-white/55' : 'text-gray-400',
                    )}
                  >
                    {PICKUP_HINT[loc]}
                  </span>
                </span>
                <span
                  className={cx(
                    'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
                    active ? 'bg-white text-leaf-900' : 'ring-1 ring-gray-200',
                  )}
                >
                  {active && <Check size={13} strokeWidth={3} />}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-8 border-t border-black/[0.04] bg-white/85 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <Button fullWidth size="lg" loading={mutation.isPending} onClick={() => mutation.mutate()}>
          {hasFixedPrice ? `Reserve ${formatKg(kg)} at ${formatCurrency(batch.finalRetailPricePerKg)}/kg` : `Reserve ${formatKg(kg)}`}
        </Button>
        <p className="mt-2.5 text-center text-[11px] text-gray-400">
          {hasFixedPrice
            ? 'No charge yet · payment window starts right after you reserve'
            : '₹0 charged today · Cancel any time before it ships'}
        </p>
      </div>
    </Screen>
  );
}
