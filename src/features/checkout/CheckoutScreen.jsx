import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { getReservation } from '../../api/reservations';
import { createCheckoutOrder } from '../../api/payments';
import { PICKUP_LOCATION_LABEL, RESERVATION_STATUS } from '../../lib/constants';
import { formatCurrency, formatDate, formatKg } from '../../lib/format';
import { useCountdown } from '../../lib/useCountdown';
import { ROUTES } from '../../app/routes';
import {
  Button,
  CropArtwork,
  EmptyState,
  ErrorState,
  ListSkeleton,
  Screen,
  useToast,
} from '../../components/ui';
import CountdownBadge from './CountdownBadge';

function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline justify-between py-3">
      <span className={strong ? 'text-[15px] font-medium text-ink' : 'text-[14px] text-gray-500'}>
        {label}
      </span>
      <span
        className={
          strong
            ? 'numeric text-[20px] font-semibold tracking-tight text-ink'
            : 'numeric text-[14px] text-ink'
        }
      >
        {value}
      </span>
    </div>
  );
}

/** Deep-linkable target of the WhatsApp "your harvest is ready" message. */
export default function CheckoutScreen() {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const {
    data: reservation,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reservations', reservationId],
    queryFn: () => getReservation(reservationId),
  });

  const { expired } = useCountdown(reservation?.paymentDueAt, 10_000);

  const pay = useMutation({
    mutationFn: () =>
      createCheckoutOrder({ reservationId, returnBaseUrl: window.location.origin }),
    onSuccess: async (resp) => {
      // resp contains { paymentIntentId, reservationId, amount, orderId, keyId }
      const { orderId, paymentIntentId, amount, keyId } = resp;

      // Load Razorpay Checkout script dynamically
      await new Promise((resolve, reject) => {
        if (window.Razorpay) return resolve();
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });

      const options = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: 'Seed & Plate',
        description: `Reservation ${reservationId}`,
        order_id: orderId,
        handler: function (response) {
          // Razorpay provides payment_id/order_id/signature — the backend webhook is the source of truth.
          // Redirect to the payment return screen (it polls the backend). Use our paymentIntentId as orderId param.
          window.location.assign(`${ROUTES.paymentReturn(reservationId)}?orderId=${paymentIntentId}`);
        },
        modal: { ondismiss: function() { /* user dismissed */ } },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    },
    onError: (err) => toast.error(err.userMessage),
  });

  if (isPending) {
    return (
      <Screen title="Checkout" backTo={ROUTES.dashboard}>
        <div className="mt-8">
          <ListSkeleton rows={2} />
        </div>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Checkout" backTo={ROUTES.dashboard}>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  const batch = reservation.cropBatch ?? {};
  const release = reservation.release;
  const total = reservation.calculatedTotalAmount;
  const label = `${batch.variety ?? batch.seedVariety ?? ''} ${batch.cropName}`.trim();
  const pricePerKg = reservation.pricePerKg ?? batch.finalRetailPricePerKg;
  const isFixedPriceBatch = Number(batch.finalRetailPricePerKg ?? 0) > 0 && !release;

  if (reservation.status !== RESERVATION_STATUS.AWAITING_PAYMENT || expired) {
    return (
      <Screen title="Checkout" backTo={ROUTES.dashboard}>
        <EmptyState
          icon={expired ? Clock : CheckCircle2}
          title={
            expired
              ? 'This window has closed'
              : reservation.status === RESERVATION_STATUS.CANCELLED
                ? 'This reservation was cancelled'
                : 'Already settled'
          }
          description={
            expired
              ? 'The 48 hour window passed, so these kilos went back to the pool for the next person in the queue. Reserve again any time — it still costs nothing.'
              : reservation.status === RESERVATION_STATUS.CANCELLED
                ? 'Nothing was charged. You can join the queue again whenever you like.'
                : 'This one is paid for and on its way to you.'
          }
          action="Back to My Harvests"
          onAction={() => navigate(ROUTES.dashboard)}
        />
      </Screen>
    );
  }

  return (
    <Screen eyebrow="Ready to travel" title="Your harvest" backTo={ROUTES.dashboard} className="pb-0">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-lift ring-1 ring-black/[0.04]"
      >
        <CropArtwork cropName={batch.cropName} alt={label} className="h-44 w-full">
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
            <h2 className="display-md text-white">{label}</h2>
            <CountdownBadge deadline={reservation.paymentDueAt} />
          </div>
        </CropArtwork>

        <div className="px-5 pb-5 pt-2">
          <div className="divide-y divide-black/[0.05]">
            <Row label="Quantity" value={formatKg(reservation.requestedQuantityKg)} />
            <Row label={isFixedPriceBatch ? 'Fixed price' : 'Price on release'} value={`${formatCurrency(pricePerKg)}/kg`} />
            <Row label="Handover" value={PICKUP_LOCATION_LABEL[reservation.pickupLocation]} />
            <Row label="Total" value={formatCurrency(total)} strong />
          </div>

          {(release || isFixedPriceBatch) && (
            <p className="mt-4 rounded-2xl bg-bone px-4 py-3 text-[11px] leading-relaxed text-gray-500">
              {release
                ? (
                  <>
                    Priced against the market on {formatDate(release.releasedAt)}, the day your{' '}
                    {formatKg(reservation.requestedQuantityKg)} left the farm store. Packing and the drive
                    from Wai are included — there is nothing else to pay.
                  </>
                )
                : (
                  <>
                    This batch was already priced before you reserved it, so your kilos moved straight to
                    payment. Packing and the drive are included — there is nothing else to pay.
                  </>
                )}
            </p>
          )}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck size={13} strokeWidth={2.2} />
            Secure UPI payment via Razorpay
          </p>
        </div>
      </motion.div>

      <div className="sticky bottom-0 -mx-5 mt-7 border-t border-black/[0.04] bg-white/85 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <Button fullWidth size="lg" loading={pay.isPending} onClick={() => pay.mutate()}>
          Pay {formatCurrency(total)}
        </Button>
        <p className="mt-2.5 text-center text-[11px] text-gray-400">
          Unpaid batches return to the pool when the window closes
        </p>
      </div>
    </Screen>
  );
}
