import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { PackageCheck, Truck } from 'lucide-react';
import { getAdminOrders, updateOrderStatus } from '../../api/admin';
import { ROUTES } from '../../app/routes';
import {
  FULFILLMENT_SEQUENCE,
  FULFILLMENT_STATUS,
  FULFILLMENT_STATUS_LABEL,
  PAYMENT_STATUS,
  PICKUP_LOCATION_LABEL,
} from '../../lib/constants';
import { formatCurrency, formatDate, formatKg } from '../../lib/format';
import { EmptyState, ErrorState, FilterChips, ListSkeleton, Reveal, Tag, useToast } from '../../components/ui';
import AdminShell, { StatTile } from './AdminShell';

const TONE_MAP = {
  [FULFILLMENT_STATUS.PAID]: 'harvest',
  [FULFILLMENT_STATUS.PACKING]: 'leaf',
  [FULFILLMENT_STATUS.IN_TRANSIT]: 'harvest',
  [FULFILLMENT_STATUS.READY_FOR_PICKUP]: 'leaf',
  [FULFILLMENT_STATUS.DELIVERED]: 'muted',
  [FULFILLMENT_STATUS.CANCELLED]: 'muted',
};

const ORDER_PAYMENT_STATE = {
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
};

const ORDER_PAYMENT_STATE_LABEL = {
  [ORDER_PAYMENT_STATE.AWAITING_PAYMENT]: 'Awaiting payment',
  [ORDER_PAYMENT_STATE.PAYMENT_FAILED]: 'Payment failed',
};

const ORDER_PAYMENT_STATE_TONE = {
  [ORDER_PAYMENT_STATE.AWAITING_PAYMENT]: 'harvest',
  [ORDER_PAYMENT_STATE.PAYMENT_FAILED]: 'muted',
};

function isPaymentSettled(order) {
  return order.paymentStatus === PAYMENT_STATUS.SUCCESS;
}

function getOrderStage(order) {
  if (isPaymentSettled(order)) {
    return order.fulfillmentStatus ?? FULFILLMENT_STATUS.PAID;
  }

  return order.paymentStatus === PAYMENT_STATUS.FAILED
    ? ORDER_PAYMENT_STATE.PAYMENT_FAILED
    : ORDER_PAYMENT_STATE.AWAITING_PAYMENT;
}

function OrderCard({ order, onStatusChange, updatingId }) {
  const currentStage = getOrderStage(order);
  const currentIndex = isPaymentSettled(order)
    ? FULFILLMENT_SEQUENCE.indexOf(order.fulfillmentStatus ?? FULFILLMENT_STATUS.PAID)
    : -1;

  return (
    <Reveal>
      <motion.section
        whileTap={{ scale: 0.995 }}
        className="overflow-hidden rounded-[26px] bg-white shadow-card ring-1 ring-black/[0.04]"
      >
        <div className="border-b border-black/[0.04] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow text-clay">{order.customerName}</p>
              <h3 className="mt-1 truncate text-[18px] font-semibold tracking-[-0.02em] text-ink">
                {order.cropName}
              </h3>
            </div>
            <Tag tone={TONE_MAP[currentStage] ?? ORDER_PAYMENT_STATE_TONE[currentStage] ?? 'muted'}>
              {FULFILLMENT_STATUS_LABEL[currentStage] ?? ORDER_PAYMENT_STATE_LABEL[currentStage]}
            </Tag>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-bone px-3 py-2">
              <p className="eyebrow text-clay">Qty</p>
              <p className="numeric mt-1 text-[15px] font-semibold text-ink">{formatKg(order.quantityKg)}</p>
            </div>
            <div className="rounded-2xl bg-bone px-3 py-2">
              <p className="eyebrow text-clay">Total</p>
              <p className="numeric mt-1 text-[15px] font-semibold text-ink">{formatCurrency(order.totalAmount)}</p>
            </div>
            <div className="rounded-2xl bg-bone px-3 py-2">
              <p className="eyebrow text-clay">Pickup</p>
              <p className="mt-1 text-[14px] font-medium text-ink">
                {PICKUP_LOCATION_LABEL[order.pickupLocation] ?? order.pickupLocation}
              </p>
            </div>
            <div className="rounded-2xl bg-bone px-3 py-2">
              <p className="eyebrow text-clay">Phone</p>
              <p className="numeric mt-1 text-[14px] font-medium text-ink">{order.phoneNumber}</p>
            </div>
          </div>

          {!isPaymentSettled(order) && (
            <p className="mt-4 text-[12px] leading-relaxed text-gray-500">
              Fulfillment starts only after the customer completes payment.
            </p>
          )}
        </div>

        <div className="border-t border-black/[0.04] px-4 py-4">
          <p className="eyebrow text-clay">Fulfillment timeline</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FULFILLMENT_SEQUENCE.map((status) => {
              const active = isPaymentSettled(order) && (order.fulfillmentStatus ?? FULFILLMENT_STATUS.PAID) === status;
              const canClick = isPaymentSettled(order) && FULFILLMENT_SEQUENCE.indexOf(status) >= currentIndex;
              const disabled = active || !canClick || updatingId === order.id;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusChange(order.id, status)}
                  disabled={disabled}
                  className={[
                    'rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                    active
                      ? 'bg-leaf-900 text-white'
                      : 'border border-black/[0.06] bg-white text-gray-600 hover:bg-gray-50',
                    disabled && !active ? 'cursor-not-allowed opacity-40' : '',
                  ].join(' ')}
                >
                  {FULFILLMENT_STATUS_LABEL[status]}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-[12px] text-gray-500">
            <span>Placed {formatDate(order.createdAt)}</span>
            {order.paidAt && <span>Paid {formatDate(order.paidAt)}</span>}
          </div>
        </div>
      </motion.section>
    </Reveal>
  );
}

export default function OrdersScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedCrop, setSelectedCrop] = useState('ALL');

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: getAdminOrders,
  });

  const update = useMutation({
    mutationFn: ({ orderId, status }) => updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Order updated.');
    },
    onError: (err) => toast.error(err.userMessage),
  });

  const orders = data ?? [];
  const cropOptions = useMemo(() => {
    const cropNames = [...new Set(orders.map((order) => order.cropName).filter(Boolean))].sort();
    return [{ value: 'ALL', label: `All crops (${orders.length})` }].concat(
      cropNames.map((cropName) => ({
        value: cropName,
        label: `${cropName} (${orders.filter((order) => order.cropName === cropName).length})`,
      })),
    );
  }, [orders]);
  const visibleOrders =
    selectedCrop === 'ALL' ? orders : orders.filter((order) => order.cropName === selectedCrop);
  const awaitingPayment = visibleOrders.filter((order) => !isPaymentSettled(order)).length;
  const needsFulfillment = visibleOrders.filter(
    (order) =>
      isPaymentSettled(order) && order.fulfillmentStatus !== FULFILLMENT_STATUS.DELIVERED,
  ).length;
  const readyForPickup = visibleOrders.filter(
    (order) => order.fulfillmentStatus === FULFILLMENT_STATUS.READY_FOR_PICKUP,
  ).length;
  const delivered = visibleOrders.filter(
    (order) => order.fulfillmentStatus === FULFILLMENT_STATUS.DELIVERED,
  ).length;

  return (
    <AdminShell eyebrow="Order flow" title="Fulfillment" backTo={ROUTES.admin}>
      <div className="flex gap-3">
        <StatTile label="Awaiting pay" value={awaitingPayment} tone="dark" />
        <StatTile label="Need fulfil" value={needsFulfillment} tone="dark" />
        <StatTile label="Ready" value={readyForPickup} />
        <StatTile label="Delivered" value={delivered} />
      </div>

      <div className="mt-7 space-y-4">
        {isPending && <ListSkeleton rows={3} />}
        {error && <ErrorState error={error} onRetry={refetch} />}

        {!isPending && !error && orders.length > 0 && (
          <FilterChips
            label="Filter by crop"
            options={cropOptions}
            value={selectedCrop}
            onChange={setSelectedCrop}
          />
        )}

        {!isPending && !error && orders.length === 0 && (
          <EmptyState
            icon={Truck}
            title="No active orders"
            description="Once a customer pays, the order will appear here for packing and pickup tracking."
          />
        )}

        {!isPending && !error && orders.length > 0 && visibleOrders.length === 0 && (
          <EmptyState
            icon={Truck}
            title="No orders in this crop"
            description="Choose another crop filter to see the rest of the fulfillment queue."
          />
        )}

        {visibleOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            updatingId={update.isPending ? update.variables?.orderId : null}
            onStatusChange={(orderId, status) => update.mutate({ orderId, status })}
          />
        ))}

        {!isPending && orders.length > 0 && (
          <div className="rounded-[22px] border border-dashed border-black/[0.08] bg-white p-4 text-[12px] leading-relaxed text-gray-500">
            <div className="flex items-center gap-2 font-medium text-ink">
              <PackageCheck size={15} strokeWidth={2.1} />
              Admin workflow
            </div>
            <p className="mt-2">
              Unpaid orders appear here first. Once payment lands, move them from packing to in transit to ready for pickup and then delivered.
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
