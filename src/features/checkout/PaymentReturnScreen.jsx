import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { AlertTriangle, Check } from 'lucide-react';
import { getPaymentStatus } from '../../api/payments';
import { getReservation } from '../../api/reservations';
import { PAYMENT_STATUS, PICKUP_LOCATION_LABEL } from '../../lib/constants';
import { formatCurrency, formatKg } from '../../lib/format';
import { ROUTES } from '../../app/routes';
import { Button, ErrorState, Screen } from '../../components/ui';

const POLL_MS = 1500;
const GIVE_UP_MS = 45000;

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
      className="block h-14 w-14 rounded-full border-[3px] border-leaf-100 border-t-leaf-600"
    />
  );
}

function SuccessMark() {
  return (
    <motion.span
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-600 text-white shadow-leaf"
    >
      <Check size={30} strokeWidth={3} />
    </motion.span>
  );
}

/**
 * Where Razorpay drops the customer after payment. The webhook is the source of
 * truth, so this screen polls the order until the backend confirms — it never
 * trusts the redirect itself.
 */
export default function PaymentReturnScreen() {
  const { reservationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const orderId = searchParams.get('orderId');

  const [startedAt] = useState(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);

  const { data: order, error } = useQuery({
    queryKey: ['payments', 'order', orderId],
    queryFn: () => getPaymentStatus(orderId),
    enabled: Boolean(orderId) && !timedOut,
    refetchInterval: (query) =>
      query.state.data?.paymentStatus === PAYMENT_STATUS.INITIATED ? POLL_MS : false,
  });

  const { data: reservation } = useQuery({
    queryKey: ['reservations', reservationId],
    queryFn: () => getReservation(reservationId),
  });

  const status = order?.paymentStatus ?? PAYMENT_STATUS.INITIATED;
  const settled = status === PAYMENT_STATUS.SUCCESS;

  useEffect(() => {
    if (settled) {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      if (navigator.vibrate) navigator.vibrate([8, 50, 14]);
    }
  }, [settled, queryClient]);

  useEffect(() => {
    if (settled || timedOut) return undefined;
    const id = setTimeout(() => setTimedOut(true), Math.max(0, GIVE_UP_MS - (Date.now() - startedAt)));
    return () => clearTimeout(id);
  }, [settled, timedOut, startedAt]);

  const summary = useMemo(() => {
    if (!reservation) return null;
    const batch = reservation.cropBatch ?? {};
    return {
      label: `${batch.variety ?? batch.seedVariety ?? ''} ${batch.cropName ?? ''}`.trim(),
      qty: formatKg(reservation.requestedQuantityKg),
      where: PICKUP_LOCATION_LABEL[reservation.pickupLocation],
      total: formatCurrency(reservation.calculatedTotalAmount),
    };
  }, [reservation]);

  if (!orderId) {
    return (
      <Screen title="Payment" backTo={ROUTES.dashboard}>
        <ErrorState
          error={{ userMessage: 'We could not find that payment reference.' }}
          onRetry={() => navigate(ROUTES.dashboard)}
        />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Payment" backTo={ROUTES.dashboard}>
        <ErrorState error={error} onRetry={() => navigate(ROUTES.checkout(reservationId))} />
      </Screen>
    );
  }

  const failed = status === PAYMENT_STATUS.FAILED;
  const waiting = !settled && !failed && !timedOut;

  return (
    <Screen title="" backTo={ROUTES.dashboard}>
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        {waiting && <Spinner />}
        {settled && <SuccessMark />}
        {(failed || timedOut) && (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-harvest-50 text-harvest-600">
            <AlertTriangle size={28} strokeWidth={2.2} />
          </span>
        )}

        <h1 className="display-lg mt-7 text-ink">
          {waiting && 'Confirming your payment'}
          {settled && 'Paid. It is yours.'}
          {failed && 'That payment did not go through'}
          {timedOut && !failed && 'Still waiting on your bank'}
        </h1>

        <p className="mt-3 max-w-[17rem] text-[14px] leading-relaxed text-gray-500">
          {waiting &&
            'Your bank is talking to ours. This usually takes a few seconds — no need to pay again.'}
          {settled &&
            summary &&
            `${summary.qty} of ${summary.label} will reach ${summary.where} on the next run from Wai.`}
          {failed &&
            'Nothing was charged. Your place in the queue is safe until the window closes.'}
          {timedOut &&
            !failed &&
            'If money left your account it will show up here shortly. Your reservation is untouched either way.'}
        </p>

        {settled && summary && (
          <p className="numeric mt-5 text-[22px] font-semibold tracking-tight text-ink">
            {summary.total}
          </p>
        )}

        <div className="mt-9 w-full space-y-2.5">
          {(failed || timedOut) && !settled && (
            <Button fullWidth size="lg" onClick={() => navigate(ROUTES.checkout(reservationId))}>
              Try again
            </Button>
          )}
          <Button
            fullWidth
            size="lg"
            variant={settled ? 'primary' : 'quiet'}
            onClick={() => navigate(ROUTES.dashboard)}
          >
            {settled ? 'Back to My Harvests' : 'Check later'}
          </Button>
        </div>
      </div>
    </Screen>
  );
}
