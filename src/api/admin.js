import { api } from '../lib/apiClient';

function toFrontendBatch(batch) {
  return {
    ...batch,
    seedVariety: batch.variety,
    unreleasedKg: batch.availableYieldKg,
    plannedYieldKg: batch.plannedYieldKg ?? batch.actualYieldKg ?? batch.availableYieldKg,
    queueCount: batch.queueDepth ?? 0,
    queuedKg: batch.queuedKg ?? 0,
  };
}

/** GET /admin/batches — every batch with queue + store figures. */
export function getAdminBatches() {
  return api.get('/admin/batches').then((batches) =>
    (Array.isArray(batches) ? batches : []).map(toFrontendBatch),
  );
}

export function getAdminBatchDetail(batchId) {
  return Promise.all([api.get(`/admin/batches/${batchId}`), getAuditTrail()]).then(
    ([batch, auditTrail]) => {
      const base = toFrontendBatch(batch);
      const timeline = (auditTrail ?? [])
        .filter((event) => String(event.entityId) === String(batchId))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map((event) => ({
          id: event.id,
          eventDate: event.createdAt,
          title: event.eventType.replace(/_/g, ' ').toLowerCase(),
          description: event.message,
          stage: base.currentStage,
        }));

      return {
        ...base,
        timeline,
        releases: batch.releases ?? [],
      };
    },
  );
}

/** POST /admin/batches */
export function createBatch(payload) {
  return api.post('/admin/batches', payload);
}

/** POST /admin/batches/{batchId}/timeline-event */
export function addTimelineEvent(batchId, payload) {
  return api.post(`/admin/batches/${batchId}/timeline-event`, payload);
}

/**
 * POST /admin/batches/{batchId}/release/preview — dry run.
 * Returns the FIFO allocation, revenue and any band breach without committing.
 */
export function previewRelease(batchId, { releasedKg, pricePerKg, mandiRate }) {
  return api.post(`/admin/batches/${batchId}/release/preview`, { releasedKg, pricePerKg, mandiRate });
}

/**
 * POST /admin/batches/{batchId}/release — Rule 2, tranche edition.
 * Releases a slice of the stored batch at a price set today, allocates it
 * strictly FIFO, and starts the 48h payment window for everyone in it.
 */
export function releaseTranche(batchId, { releasedKg, pricePerKg, mandiRate, note }) {
  return api.post(`/admin/batches/${batchId}/release/confirm`, { releasedKg, pricePerKg, mandiRate, note });
}

/** GET /admin/logistics/manifest — Rule 3: the Smart Manifest. */
export function getLogisticsManifest(params) {
  return api.get('/admin/manifest', { params });
}

/** PUT /admin/manifest/{manifestId}/status/{status} — handoff confirmed. */
export function completeReservation(manifestId) {
  return api.put(`/admin/manifest/${manifestId}/status/DELIVERED`);
}

/** GET /admin/orders — all paid orders, ready for admin fulfillment actions. */
export function getAdminOrders() {
  return api.get('/admin/orders');
}

/** PATCH /admin/orders/{id}/status — move a paid order through packing / transit / pickup. */
export function updateOrderStatus(orderId, status) {
  return api.patch(`/admin/orders/${orderId}/status`, { status });
}

export function getAuditTrail() {
  return api.get('/admin/audit');
}
