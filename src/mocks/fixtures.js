import {
  CROP_STAGE,
  PICKUP_LOCATION,
  RESERVATION_STATUS,
  ROLE,
} from '../lib/constants';

const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
const daysAhead = (d) => new Date(now + d * 86400000).toISOString();

export const farms = [
  { id: 1, farmName: 'Wai Family Farm', isPrimaryHub: true, village: 'Wai', district: 'Satara' },
];

/**
 * A batch's kg fields:
 *   totalYieldKg     - estimated (pre-harvest) or actual (post-harvest) yield
 *   availableYieldKg - unreserved kg, what the waitlist slider is clamped to
 *   actualYieldKg    - weighed-in kg after harvest; null until HARVESTED
 *   releasedKg       - sum of all tranche releasedKg; the rest is still in store
 */
export const cropBatches = [
  {
    id: 1,
    farmId: 1,
    farmName: 'Wai Family Farm',
    cropName: 'Onion',
    seedVariety: 'Gaavthi',
    isChemicalFree: true,
    currentStage: CROP_STAGE.GROWING,
    totalYieldKg: 640,
    availableYieldKg: 619,
    actualYieldKg: null,
    releasedKg: 0,
    estimatedPriceLowPerKg: 70,
    estimatedPriceHighPerKg: 82,
    finalRetailPricePerKg: null,
    sownDate: daysAgo(96),
    harvestDate: null,
    heroImageUrl: null,
    description: 'Small-batch, chemical-free Gaavthi onions from our Wai farm.',
    createdAt: daysAgo(96),
  },
  {
    id: 2,
    farmId: 1,
    farmName: 'Wai Family Farm',
    cropName: 'Wheat',
    seedVariety: 'Khapli (Heritage)',
    isChemicalFree: true,
    currentStage: CROP_STAGE.BATCH_RELEASED,
    totalYieldKg: 468,
    availableYieldKg: 445,
    actualYieldKg: 468,
    releasedKg: 270,
    estimatedPriceLowPerKg: 84,
    estimatedPriceHighPerKg: 104,
    finalRetailPricePerKg: 92,
    sownDate: daysAgo(150),
    harvestDate: daysAgo(12),
    releasedAt: daysAgo(1),
    heroImageUrl: null,
    description: 'Stone-milled heritage Khapli wheat, cured for 10 days.',
    createdAt: daysAgo(150),
  },
  {
    id: 3,
    farmId: 1,
    farmName: 'Wai Family Farm',
    cropName: 'Turmeric',
    seedVariety: 'Rajapuri',
    isChemicalFree: true,
    currentStage: CROP_STAGE.STORED_CURING,
    totalYieldKg: 212,
    availableYieldKg: 197,
    actualYieldKg: 212,
    releasedKg: 0,
    estimatedPriceLowPerKg: 205,
    estimatedPriceHighPerKg: 250,
    finalRetailPricePerKg: null,
    sownDate: daysAgo(210),
    harvestDate: daysAgo(20),
    heroImageUrl: null,
    description: 'Hand-dug Rajapuri turmeric, sun-cured on the farm.',
    createdAt: daysAgo(210),
  },
];

/**
 * Tranches. A stored batch is released in slices, each with its own price set
 * on the day it leaves the store. FIFO decides who lands in which tranche.
 */
export const batchReleases = [
  {
    id: 500,
    batchId: 2,
    releasedKg: 120,
    pricePerKg: 88,
    allocatedKg: 3,
    releasedAt: daysAgo(9),
    note: 'First slice, straight after curing.',
  },
  {
    id: 501,
    batchId: 2,
    releasedKg: 150,
    pricePerKg: 92,
    allocatedKg: 20,
    releasedAt: daysAgo(1),
    note: 'Second slice. Mandi rate firmed up over the fortnight.',
  },
];

export const timelines = {
  1: [
    {
      id: 1,
      stage: CROP_STAGE.SOWN,
      title: 'Seeds sown at Wai farm',
      description: 'Gaavthi onion seed beds prepared and sown across two acres.',
      mediaUrl: null,
      eventDate: daysAgo(96),
    },
    {
      id: 2,
      stage: CROP_STAGE.GROWING,
      title: '60 day milestone',
      description: 'Plants at 25cm, healthy green foliage. No chemical inputs used.',
      mediaUrl: null,
      eventDate: daysAgo(36),
    },
  ],
  2: [
    {
      id: 3,
      stage: CROP_STAGE.SOWN,
      title: 'Khapli sown',
      description: 'Heritage Khapli wheat sown after the first rains.',
      mediaUrl: null,
      eventDate: daysAgo(150),
    },
    {
      id: 4,
      stage: CROP_STAGE.HARVESTED,
      title: 'Harvest completed',
      description: '468 kg weighed in after threshing — 12 kg under the estimate.',
      mediaUrl: null,
      eventDate: daysAgo(12),
    },
    {
      id: 5,
      stage: CROP_STAGE.BATCH_RELEASED,
      title: 'First 120 kg released at ₹88/kg',
      description: 'Priced against the Wai mandi rate on the day it left the store.',
      mediaUrl: null,
      eventDate: daysAgo(9),
    },
    {
      id: 6,
      stage: CROP_STAGE.BATCH_RELEASED,
      title: 'Next 150 kg released at ₹92/kg',
      description: 'Mandi rate firmed up over the fortnight. 198 kg still in store.',
      mediaUrl: null,
      eventDate: daysAgo(1),
    },
  ],
  3: [
    {
      id: 7,
      stage: CROP_STAGE.HARVESTED,
      title: 'Turmeric dug',
      description: '212 kg of Rajapuri turmeric lifted by hand and weighed in.',
      mediaUrl: null,
      eventDate: daysAgo(20),
    },
    {
      id: 8,
      stage: CROP_STAGE.STORED_CURING,
      title: 'Boiling and sun-curing',
      description: 'Fingers boiled, then laid out to cure. Expect 12% weight loss.',
      mediaUrl: null,
      eventDate: daysAgo(16),
    },
  ],
};

export const users = [
  { id: 1, fullName: 'Demo Customer', phoneNumber: '9000000001', role: ROLE.CUSTOMER },
  { id: 2, fullName: 'Neha Kulkarni', phoneNumber: '9000000002', role: ROLE.CUSTOMER },
  { id: 3, fullName: 'Rahul Deshpande', phoneNumber: '9000000003', role: ROLE.CUSTOMER },
  { id: 99, fullName: 'Farm Admin', phoneNumber: '9000000099', role: ROLE.ADMIN },
];

export const reservations = [
  // --- Onion, still growing: a live FIFO queue -------------------------------
  {
    id: 10,
    customerId: 1,
    batchId: 1,
    requestedQuantityKg: 5,
    pickupLocation: PICKUP_LOCATION.PUNE_OFFICE,
    status: RESERVATION_STATUS.PENDING_RELEASE,
    releaseId: null,
    pricePerKg: null,
    calculatedTotalAmount: null,
    createdAt: daysAgo(20),
  },
  {
    id: 15,
    customerId: 2,
    batchId: 1,
    requestedQuantityKg: 10,
    pickupLocation: PICKUP_LOCATION.JUINAGAR_RESIDENCE,
    status: RESERVATION_STATUS.PENDING_RELEASE,
    releaseId: null,
    pricePerKg: null,
    calculatedTotalAmount: null,
    createdAt: daysAgo(15),
  },
  {
    id: 16,
    customerId: 3,
    batchId: 1,
    requestedQuantityKg: 6,
    pickupLocation: PICKUP_LOCATION.PUNE_OFFICE,
    status: RESERVATION_STATUS.PENDING_RELEASE,
    releaseId: null,
    pricePerKg: null,
    calculatedTotalAmount: null,
    createdAt: daysAgo(3),
  },

  // --- Wheat, released in two tranches at two different prices ---------------
  {
    id: 19,
    customerId: 1,
    batchId: 2,
    requestedQuantityKg: 3,
    pickupLocation: PICKUP_LOCATION.PUNE_OFFICE,
    status: RESERVATION_STATUS.COMPLETED,
    releaseId: 500,
    pricePerKg: 88,
    calculatedTotalAmount: 264,
    paidAt: daysAgo(8),
    createdAt: daysAgo(60),
  },
  {
    id: 11,
    customerId: 1,
    batchId: 2,
    requestedQuantityKg: 10,
    pickupLocation: PICKUP_LOCATION.PUNE_OFFICE,
    status: RESERVATION_STATUS.AWAITING_PAYMENT,
    releaseId: 501,
    pricePerKg: 92,
    calculatedTotalAmount: 920,
    paymentDueAt: daysAhead(1),
    createdAt: daysAgo(40),
  },
  {
    id: 17,
    customerId: 2,
    batchId: 2,
    requestedQuantityKg: 4,
    pickupLocation: PICKUP_LOCATION.JUINAGAR_RESIDENCE,
    status: RESERVATION_STATUS.PAID_READY_FOR_PICKUP,
    releaseId: 501,
    pricePerKg: 92,
    calculatedTotalAmount: 368,
    paidAt: daysAgo(1),
    createdAt: daysAgo(38),
  },
  {
    id: 18,
    customerId: 3,
    batchId: 2,
    requestedQuantityKg: 6,
    pickupLocation: PICKUP_LOCATION.PUNE_OFFICE,
    status: RESERVATION_STATUS.PAID_READY_FOR_PICKUP,
    releaseId: 501,
    pricePerKg: 92,
    calculatedTotalAmount: 552,
    paidAt: daysAgo(1),
    createdAt: daysAgo(30),
  },

  // --- Turmeric, cured and waiting for the admin to release a tranche --------
  {
    id: 12,
    customerId: 1,
    batchId: 3,
    requestedQuantityKg: 2,
    pickupLocation: PICKUP_LOCATION.JUINAGAR_RESIDENCE,
    status: RESERVATION_STATUS.PENDING_RELEASE,
    releaseId: null,
    pricePerKg: null,
    calculatedTotalAmount: null,
    createdAt: daysAgo(8),
  },
  {
    id: 13,
    customerId: 2,
    batchId: 3,
    requestedQuantityKg: 5,
    pickupLocation: PICKUP_LOCATION.JUINAGAR_RESIDENCE,
    status: RESERVATION_STATUS.PENDING_RELEASE,
    releaseId: null,
    pricePerKg: null,
    calculatedTotalAmount: null,
    createdAt: daysAgo(7),
  },
  {
    id: 14,
    customerId: 3,
    batchId: 3,
    requestedQuantityKg: 8,
    pickupLocation: PICKUP_LOCATION.PUNE_OFFICE,
    status: RESERVATION_STATUS.PENDING_RELEASE,
    releaseId: null,
    pricePerKg: null,
    calculatedTotalAmount: null,
    createdAt: daysAgo(5),
  },
];

export const orders = [];

/** Pending reservations for a batch, oldest first — the FIFO queue. */
export function fifoQueue(batchId) {
  return reservations
    .filter(
      (r) => r.batchId === Number(batchId) && r.status === RESERVATION_STATUS.PENDING_RELEASE,
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/** 1-based position of a reservation in its batch's FIFO queue, or null. */
export function queuePosition(reservation) {
  if (reservation.status !== RESERVATION_STATUS.PENDING_RELEASE) return null;
  const index = fifoQueue(reservation.batchId).findIndex((r) => r.id === reservation.id);
  return index === -1 ? null : index + 1;
}

export function releaseSummary(releaseId) {
  const release = batchReleases.find((r) => r.id === Number(releaseId));
  if (!release) return null;
  return {
    id: release.id,
    releasedKg: release.releasedKg,
    pricePerKg: release.pricePerKg,
    releasedAt: release.releasedAt,
    note: release.note ?? null,
  };
}

/** kg harvested and in store but not yet released into a tranche. */
export function unreleasedKg(batch) {
  if (!batch?.actualYieldKg) return 0;
  return Number((batch.actualYieldKg - (batch.releasedKg ?? 0)).toFixed(2));
}

export function batchSummary(batchId) {
  const batch = cropBatches.find((b) => b.id === Number(batchId));
  if (!batch) return null;
  return {
    id: batch.id,
    cropName: batch.cropName,
    seedVariety: batch.seedVariety,
    currentStage: batch.currentStage,
    finalRetailPricePerKg: batch.finalRetailPricePerKg,
    estimatedPriceLowPerKg: batch.estimatedPriceLowPerKg,
    estimatedPriceHighPerKg: batch.estimatedPriceHighPerKg,
    availableYieldKg: batch.availableYieldKg,
    releasedAt: batch.releasedAt ?? null,
  };
}

/** Reservation as the API returns it: joined to its batch and tranche. */
export function decorateReservation(reservation) {
  return {
    ...reservation,
    queuePosition: queuePosition(reservation),
    cropBatch: batchSummary(reservation.batchId),
    release: reservation.releaseId ? releaseSummary(reservation.releaseId) : null,
  };
}
