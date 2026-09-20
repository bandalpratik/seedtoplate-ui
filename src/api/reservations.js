import { api } from '../lib/apiClient';
import { getBatchReleases, getCropFeed } from './crops';

const DEFAULT_PICKUP_LOCATION = 'PUNE_OFFICE';

function toFrontendBatch(batch) {
  if (!batch) return null;
  return {
    ...batch,
    seedVariety: batch.variety,
    unreleasedKg: batch.availableYieldKg,
    plannedYieldKg: batch.plannedYieldKg ?? batch.actualYieldKg ?? batch.availableYieldKg,
    queueCount: batch.queueDepth ?? 0,
    queuedKg: batch.queuedKg ?? 0,
  };
}

function findRelease(raw, releases) {
  if (raw.release) return raw.release;
  if (raw.releaseId) {
    return releases.find((release) => String(release.id) === String(raw.releaseId)) ?? null;
  }
  return null;
}

function toFrontendReservation(raw, batchesById = new Map(), releasesByBatch = new Map(), index = 0) {
  const batch = toFrontendBatch(batchesById.get(raw.batchId));
  const releases = releasesByBatch.get(raw.batchId) ?? [];
  const release = findRelease(raw, releases);
  const reservedKg = Number(raw.reservedKg ?? raw.requestedQuantityKg ?? 0);
  const pricePerKg = Number(raw.pricePerKg ?? release?.pricePerKg ?? 0);
  const createdAt = raw.createdAt ?? new Date().toISOString();
  const paymentDueAt =
    raw.paymentDueAt ?? new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000).toISOString();

  return {
    ...raw,
    reservedKg,
    requestedQuantityKg: reservedKg,
    paymentDueAt,
    pickupLocation: raw.pickupLocation ?? DEFAULT_PICKUP_LOCATION,
    calculatedTotalAmount: Number((reservedKg * pricePerKg).toFixed(2)),
    queuePosition: raw.queuePosition ?? (raw.status === 'PENDING_RELEASE' ? index + 1 : null),
    cropBatch: batch,
    release,
  };
}

/** POST /waitlist/reserve — zero-cost reservation. */
export function createReservation({ batchId, quantityKg, pickupLocation }) {
  return api.post('/reservations', {
    batchId,
    reservedKg: quantityKg,
    pickupLocation,
  });
}

/** GET /reservations/user/{userId} — "My Harvests". */
export function getCustomerReservations(userId, { status, sortBy } = {}) {
  return Promise.all([
    api.get(`/reservations/user/${userId}`, { params: { status, sortBy } }),
    getCropFeed({ page: 0, size: 200 }),
  ]).then(async ([reservations, feed]) => {
    const batchesById = new Map((feed?.content ?? []).map((batch) => [batch.id, batch]));
    const releaseEntries = await Promise.all(
      (reservations ?? []).map(async (reservation) => {
        const releases = await getBatchReleases(reservation.batchId);
        return [reservation.batchId, releases];
      }),
    );
    const releasesByBatch = new Map(releaseEntries);

    return (reservations ?? []).map((reservation, index) =>
      toFrontendReservation(reservation, batchesById, releasesByBatch, index),
    );
  });
}

/** GET /reservations/{id} — single reservation, used by the checkout deep link. */
export function getReservation(reservationId) {
  return Promise.all([api.get(`/reservations/${reservationId}`), getCropFeed({ page: 0, size: 200 })]).then(
    async ([reservation, feed]) => {
      const batchesById = new Map((feed?.content ?? []).map((batch) => [batch.id, batch]));
      const releases = await getBatchReleases(reservation.batchId);
      const releasesByBatch = new Map([[reservation.batchId, releases]]);
      return toFrontendReservation(reservation, batchesById, releasesByBatch);
    },
  );
}

/** DELETE /reservations/{id} — customer cancels before release. */
export function cancelReservation(reservationId) {
  return api.delete(`/reservations/${reservationId}`);
}
