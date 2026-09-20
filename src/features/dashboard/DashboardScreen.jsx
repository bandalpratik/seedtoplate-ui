import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { ArrowRight, LayoutGrid, LogOut, Sprout } from 'lucide-react';
import { cancelReservation, getCustomerReservations } from '../../api/reservations';
import { useAuth } from '../auth/useAuth';
import { ROUTES } from '../../app/routes';
import {
  CANCEL_REASON,
  CANCEL_REASON_LABEL,
  FULFILLMENT_STATUS,
  FULFILLMENT_STATUS_LABEL,
  PICKUP_LOCATION_LABEL,
  RESERVATION_STATUS,
  reservationNextStep,
  reservationStatusLabel,
} from '../../lib/constants';
import { formatCurrency, formatDate, formatKg } from '../../lib/format';
import {
  Button,
  ConfirmSheet,
  CropArtwork,
  EmptyState,
  ErrorState,
  FilterChips,
  ListSkeleton,
  Reveal,
  StageRail,
  Tag,
  useToast,
} from '../../components/ui';
import CountdownBadge from '../checkout/CountdownBadge';

const STATUS_TONE = {
  PENDING_RELEASE: 'leaf',
  AWAITING_PAYMENT: 'harvest',
  PAID_READY_FOR_PICKUP: 'leaf',
  COMPLETED: 'muted',
  CANCELLED: 'muted',
};

function reservationTagLabel(reservation, cropStage) {
  if (reservation.status === RESERVATION_STATUS.PAID_READY_FOR_PICKUP) {
    return FULFILLMENT_STATUS_LABEL[reservation.fulfillmentStatus ?? FULFILLMENT_STATUS.PAID];
  }

  return reservationStatusLabel(reservation.status, cropStage);
}

function ReservationCard({ reservation, index, onCancel }) {
  const navigate = useNavigate();
  const batch = reservation.cropBatch ?? {};
  const release = reservation.release;
  const awaitingPayment = reservation.status === RESERVATION_STATUS.AWAITING_PAYMENT;
  const pending = reservation.status === RESERVATION_STATUS.PENDING_RELEASE;
  const cancelled = reservation.status === RESERVATION_STATUS.CANCELLED;
  const nextStep = reservationNextStep(reservation.status, batch.currentStage);

  return (
    <Reveal delay={index * 0.06}>
      <motion.article
        whileTap={{ scale: 0.99 }}
        className="overflow-hidden rounded-[26px] bg-white shadow-card ring-1 ring-black/[0.04]"
      >
        <div className="flex gap-4 p-4">
          <CropArtwork
            cropName={batch.cropName}
            alt={`${batch.variety ?? batch.seedVariety ?? ''} ${batch.cropName}`}
            className="h-[76px] w-[76px] shrink-0 rounded-2xl"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-[16px] font-semibold tracking-[-0.015em] text-ink">
                {batch.variety ?? batch.seedVariety} {batch.cropName}
              </h3>
              <Tag tone={STATUS_TONE[reservation.status]}>
                {reservationTagLabel(reservation, batch.currentStage)}
              </Tag>
            </div>

            <p className="numeric mt-1 text-[13px] text-gray-500">
              {formatKg(reservation.requestedQuantityKg)} ·{' '}
              {PICKUP_LOCATION_LABEL[reservation.pickupLocation]}
            </p>

            {pending && reservation.queuePosition && (
              <p className="numeric mt-1 text-[12px] text-gray-400">
                #{reservation.queuePosition} in the queue
              </p>
            )}

            {release && (
              <p className="numeric mt-1 text-[12px] text-gray-400">
                {formatCurrency(release.pricePerKg)}/kg · slice released{' '}
                {formatDate(release.releasedAt)}
              </p>
            )}

            {cancelled && reservation.cancelReason && (
              <p
                className={`mt-1.5 text-[12px] leading-relaxed ${
                  reservation.cancelReason === CANCEL_REASON.PRICE_ABOVE_BAND
                    ? 'text-harvest-600'
                    : 'text-gray-400'
                }`}
              >
                {CANCEL_REASON_LABEL[reservation.cancelReason]}
              </p>
            )}
          </div>
        </div>

        {pending && batch.currentStage && (
          <div className="px-4 pb-4">
            <StageRail currentStage={batch.currentStage} />

            {nextStep && (
              <p className="mt-3 text-[12px] leading-relaxed text-gray-500">{nextStep}</p>
            )}

            {batch.estimatedPriceLowPerKg && batch.estimatedPriceHighPerKg && (
              <p className="numeric mt-2 text-[12px] text-gray-400">
                Expected {formatCurrency(batch.estimatedPriceLowPerKg)}–
                {formatCurrency(batch.estimatedPriceHighPerKg)}/kg · never above{' '}
                {formatCurrency(batch.estimatedPriceHighPerKg)}
              </p>
            )}

            <button
              type="button"
              onClick={() => onCancel(reservation)}
              className="mt-3 cursor-pointer text-[12px] text-gray-400 underline underline-offset-4 transition-colors hover:text-gray-600"
            >
              Cancel this reservation
            </button>
          </div>
        )}

        {awaitingPayment && (
          <div className="border-t border-black/[0.04] bg-harvest-50/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow text-harvest-600">Payment due</p>
                <p className="numeric mt-1 text-[20px] font-semibold tracking-tight text-ink">
                  {formatCurrency(reservation.calculatedTotalAmount)}
                </p>
              </div>
              <CountdownBadge deadline={reservation.paymentDueAt} />
            </div>

            <Button
              fullWidth
              className="mt-3.5"
              onClick={() => navigate(ROUTES.checkout(reservation.id))}
            >
              Complete payment
              <ArrowRight size={15} strokeWidth={2.2} />
            </Button>
          </div>
        )}
      </motion.article>
    </Reveal>
  );
}

export default function DashboardScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, userId, isAdmin, signOut } = useAuth();
  const [pendingCancel, setPendingCancel] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('ALL');

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['reservations', 'user', userId],
    queryFn: () => getCustomerReservations(userId),
    enabled: Boolean(userId),
  });

  const cancel = useMutation({
    mutationFn: (reservationId) => cancelReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      setPendingCancel(null);
      toast.success('Reservation cancelled. Your kilos went back to the pool.');
    },
    onError: (err) => {
      setPendingCancel(null);
      toast.error(err.userMessage);
    },
  });

  const reservations = data ?? [];
  const cropOptions = useMemo(() => {
    const cropNames = [
      ...new Set(reservations.map((reservation) => reservation.cropBatch?.cropName).filter(Boolean)),
    ].sort();
    return [{ value: 'ALL', label: `All crops (${reservations.length})` }].concat(
      cropNames.map((cropName) => ({
        value: cropName,
        label: `${cropName} (${reservations.filter((reservation) => reservation.cropBatch?.cropName === cropName).length})`,
      })),
    );
  }, [reservations]);
  const visibleReservations =
    selectedCrop === 'ALL'
      ? reservations
      : reservations.filter((reservation) => reservation.cropBatch?.cropName === selectedCrop);
  const growing = visibleReservations.filter((r) => r.status === RESERVATION_STATUS.PENDING_RELEASE);
  const totalKg = visibleReservations
    .filter(
      (r) =>
        r.status !== RESERVATION_STATUS.CANCELLED && r.status !== RESERVATION_STATUS.COMPLETED,
    )
    .reduce((sum, r) => sum + Number(r.requestedQuantityKg), 0);

  return (
    <div className="px-5 pb-32 pt-[max(2rem,env(safe-area-inset-top))]">
      <Reveal>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-clay">{user?.fullName ?? 'Your account'}</p>
            <h1 className="display-xl mt-2 text-ink">My Harvests</h1>
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-1.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate(ROUTES.admin)}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-leaf-900 px-3.5 py-2 text-[12px] font-medium text-white transition-colors hover:bg-leaf-700"
              >
                <LayoutGrid size={14} strokeWidth={2.2} />
                Ops
              </button>
            )}
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
            >
              <LogOut size={16} strokeWidth={2.1} />
            </button>
          </div>
        </div>
      </Reveal>

      {reservations.length > 0 && (
        <Reveal delay={0.08}>
          <div className="mt-6 flex gap-3">
            <div className="flex-1 rounded-2xl bg-leaf-900 px-4 py-3.5 text-white">
              <p className="eyebrow text-white/40">On its way</p>
              <p className="numeric mt-1 text-[22px] font-semibold tracking-tight">
                {formatKg(totalKg)}
              </p>
            </div>
            <div className="flex-1 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-black/[0.05]">
              <p className="eyebrow text-clay">In the queue</p>
              <p className="numeric mt-1 text-[22px] font-semibold tracking-tight text-ink">
                {growing.length}
              </p>
            </div>
          </div>
        </Reveal>
      )}

      <main className="mt-7 space-y-4">
        {isPending && <ListSkeleton rows={3} />}
        {error && <ErrorState error={error} onRetry={refetch} />}

        {!isPending && !error && reservations.length === 0 && (
          <EmptyState
            icon={Sprout}
            title="Nothing reserved yet"
            description="Claim a share of a batch while it is still in the ground. It costs nothing today."
            action="See what's growing"
            onAction={() => navigate(ROUTES.feed)}
          />
        )}

        {!isPending && !error && reservations.length > 0 && (
          <FilterChips
            label="Filter by crop"
            options={cropOptions}
            value={selectedCrop}
            onChange={setSelectedCrop}
          />
        )}

        {!isPending && !error && reservations.length > 0 && visibleReservations.length === 0 && (
          <EmptyState
            icon={Sprout}
            title="No reservations in this crop"
            description="Pick another crop filter to see the rest of your harvests."
          />
        )}

        {visibleReservations.map((reservation, index) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            index={index}
            onCancel={setPendingCancel}
          />
        ))}
      </main>

      <ConfirmSheet
        open={Boolean(pendingCancel)}
        title="Give up your place?"
        description={
          pendingCancel
            ? `${formatKg(pendingCancel.requestedQuantityKg)} of ${
                pendingCancel.cropBatch?.cropName ?? 'this batch'
              } goes back to the pool, and you lose your spot in the queue. Nothing is charged either way.`
            : ''
        }
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep my place"
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate(pendingCancel.id)}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  );
}
