import { ApiError } from '../lib/ApiError';
import {
  CANCEL_REASON,
  CROP_STAGE,
  ERROR_CODE,
  FULFILLMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_WINDOW_HOURS,
  PICKUP_LOCATION_LABEL,
  RESERVATION_STATUS,
  ROLE,
} from '../lib/constants';
import * as db from './fixtures';

const LATENCY_MS = 350;

const delay = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

function fail(code, message, details, httpStatus = 400) {
  throw new ApiError({ code, message, details, httpStatus });
}

function notFound(what) {
  fail(ERROR_CODE.RESOURCE_NOT_FOUND, 'Resource not found', `${what} not found`, 404);
}

function findBatch(batchId) {
  const batch = db.cropBatches.find((b) => b.id === Number(batchId));
  if (!batch) notFound(`Crop batch ${batchId}`);
  return batch;
}

const round2 = (n) => Number(Number(n).toFixed(2));

function deriveFulfillmentStatus(reservation) {
  if (reservation.status === RESERVATION_STATUS.COMPLETED) return FULFILLMENT_STATUS.DELIVERED;
  if (reservation.status === RESERVATION_STATUS.PAID_READY_FOR_PICKUP) {
    return reservation.fulfillmentStatus ?? FULFILLMENT_STATUS.READY_FOR_PICKUP;
  }
  if (reservation.status === RESERVATION_STATUS.AWAITING_PAYMENT) return FULFILLMENT_STATUS.PAID;
  return reservation.fulfillmentStatus ?? FULFILLMENT_STATUS.PAID;
}

function buildOrderFromReservation(reservation) {
  const batch = db.cropBatches.find((b) => b.id === reservation.batchId);
  const customer = db.users.find((u) => u.id === reservation.customerId);

  return {
    id: reservation.id,
    reservationId: reservation.id,
    customerId: reservation.customerId,
    customerName: customer?.fullName ?? 'Customer',
    phoneNumber: customer?.phoneNumber ?? '',
    cropName: batch?.cropName ?? 'Crop',
    seedVariety: batch?.seedVariety ?? '',
    quantityKg: Number(reservation.requestedQuantityKg ?? 0),
    pickupLocation: reservation.pickupLocation,
    unitPrice: Number(reservation.pricePerKg ?? 0),
    totalAmount: Number(reservation.calculatedTotalAmount ?? 0),
    paymentStatus:
      reservation.status === RESERVATION_STATUS.AWAITING_PAYMENT ? PAYMENT_STATUS.INITIATED : PAYMENT_STATUS.SUCCESS,
    fulfillmentStatus: deriveFulfillmentStatus(reservation),
    createdAt: reservation.createdAt,
    paidAt: reservation.paidAt ?? null,
    completedAt: reservation.completedAt ?? null,
  };
}

/**
 * Rule 2, tranche edition. Walks the batch's FIFO queue and fills the tranche
 * strictly in order. A reservation that does not fit in the remaining kg is NOT
 * skipped — allocation stops there and the leftover kg stays in store for the
 * next tranche. Strict FIFO beats a fuller truck.
 *
 * Pure: returns a plan, mutates nothing. Used by both preview and commit.
 */
function planRelease(batch, { releasedKg, pricePerKg }) {
  const queue = db.fifoQueue(batch.id);
  const bandHigh = batch.estimatedPriceHighPerKg;
  const bandBreached = Boolean(bandHigh) && Number(pricePerKg) > Number(bandHigh);

  const allocations = [];
  const waiting = [];
  let remaining = Number(releasedKg);

  for (const reservation of queue) {
    const qty = Number(reservation.requestedQuantityKg);
    if (qty <= remaining) {
      remaining = round2(remaining - qty);
      allocations.push({
        reservationId: reservation.id,
        customerId: reservation.customerId,
        customerName: db.users.find((u) => u.id === reservation.customerId)?.fullName ?? 'Customer',
        quantityKg: qty,
        pickupLocation: reservation.pickupLocation,
        amount: round2(qty * Number(pricePerKg)),
      });
    } else {
      waiting.push({
        reservationId: reservation.id,
        quantityKg: qty,
        shortBy: round2(qty - remaining),
      });
      break;
    }
  }

  const allocatedKg = round2(allocations.reduce((sum, a) => sum + a.quantityKg, 0));

  return {
    batchId: batch.id,
    cropName: batch.cropName,
    releasedKg: Number(releasedKg),
    pricePerKg: Number(pricePerKg),
    allocatedKg,
    heldBackKg: round2(Number(releasedKg) - allocatedKg),
    revenue: round2(allocations.reduce((sum, a) => sum + a.amount, 0)),
    bandBreached,
    estimatedPriceHighPerKg: bandHigh ?? null,
    allocations,
    waiting,
    unreleasedKgAfter: round2(db.unreleasedKg(batch) - Number(releasedKg)),
  };
}

function validateRelease(batch, body) {
  const releasedKg = Number(body.releasedKg);
  const pricePerKg = Number(body.pricePerKg);

  if (!releasedKg || releasedKg <= 0) {
    fail(ERROR_CODE.VALIDATION_ERROR, 'Validation failed', 'Released kg must be greater than 0');
  }
  if (!pricePerKg || pricePerKg <= 0) {
    fail(ERROR_CODE.VALIDATION_ERROR, 'Validation failed', 'Price per kg must be greater than 0');
  }
  if (!batch.actualYieldKg) {
    fail(
      ERROR_CODE.INVALID_STATE,
      'Invalid state',
      'Record the weighed-in yield before releasing a tranche',
      409,
    );
  }
  if (releasedKg > db.unreleasedKg(batch)) {
    fail(
      ERROR_CODE.VALIDATION_ERROR,
      'Validation failed',
      `Only ${db.unreleasedKg(batch)} kg left in store`,
    );
  }
  return { releasedKg, pricePerKg };
}

/** Route table: [method, RegExp, handler(params, body, query)]. */
const routes = [
  // ---------------------------------------------------------------- customer
  ['GET', /^\/crops\/feedList$/, (_p, _b, query) => {
    const page = Number(query.page ?? 0);
    const size = Number(query.size ?? 20);

    let items = db.cropBatches.filter((b) => b.currentStage !== CROP_STAGE.ARCHIVED);
    if (query.stage) items = items.filter((b) => b.currentStage === query.stage);
    if (query.isChemicalFree !== undefined) {
      const want = String(query.isChemicalFree) === 'true';
      items = items.filter((b) => b.isChemicalFree === want);
    }

    const start = page * size;
    return {
      content: items.slice(start, start + size),
      totalElements: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / size)),
      currentPage: page,
      pageSize: size,
    };
  }],

  ['GET', /^\/crops\/(\d+)\/timeline$/, ([batchId]) => {
    const batch = findBatch(batchId);
    return {
      batchId: batch.id,
      cropName: batch.cropName,
      seedVariety: batch.seedVariety,
      currentStage: batch.currentStage,
      timeline: db.timelines[batch.id] ?? [],
    };
  }],

  /** Public tranche history — the evidence behind the pricing promise. */
  ['GET', /^\/crops\/(\d+)\/releases$/, ([batchId]) => {
    const batch = findBatch(batchId);
    return db.batchReleases
      .filter((r) => r.batchId === batch.id)
      .sort((a, b) => new Date(a.releasedAt) - new Date(b.releasedAt));
  }],

  ['POST', /^\/waitlist\/reserve$/, (_p, body) => {
    const batch = findBatch(body.batchId);
    const qty = Number(body.quantityKg);
    const customerId = Number(body.customerId);
    const fixedPrice = Number(batch.finalRetailPricePerKg || 0);
    const fixedPriceBatch = fixedPrice > 0;
    const paymentDueAt = new Date(Date.now() + PAYMENT_WINDOW_HOURS * 3600 * 1000).toISOString();

    if (!qty || qty <= 0) {
      fail(ERROR_CODE.VALIDATION_ERROR, 'Validation failed', 'Quantity must be greater than 0');
    }
    if (qty > batch.availableYieldKg) {
      fail(
        ERROR_CODE.INSUFFICIENT_YIELD,
        'Insufficient yield',
        `Requested: ${qty.toFixed(2)} kg, Available: ${batch.availableYieldKg.toFixed(2)} kg`,
        409,
      );
    }

    const duplicate = db.reservations.find(
      (r) =>
        r.customerId === customerId &&
        r.batchId === batch.id &&
        r.status === RESERVATION_STATUS.PENDING_RELEASE,
    );
    if (duplicate) {
      fail(
        ERROR_CODE.DUPLICATE_RESERVATION,
        'Duplicate reservation',
        'You already hold a place in the queue for this batch',
        409,
      );
    }

    batch.availableYieldKg = round2(batch.availableYieldKg - qty);
    const reservation = {
      id: Math.max(0, ...db.reservations.map((r) => r.id)) + 1,
      customerId,
      batchId: batch.id,
      requestedQuantityKg: qty,
      pickupLocation: body.pickupLocation,
      status: fixedPriceBatch ? RESERVATION_STATUS.AWAITING_PAYMENT : RESERVATION_STATUS.PENDING_RELEASE,
      releaseId: null,
      pricePerKg: fixedPriceBatch ? fixedPrice : null,
      calculatedTotalAmount: fixedPriceBatch ? round2(qty * fixedPrice) : null,
      paymentDueAt: fixedPriceBatch ? paymentDueAt : null,
      createdAt: new Date().toISOString(),
    };
    db.reservations.push(reservation);
    return db.decorateReservation(reservation);
  }],

  ['GET', /^\/reservations\/user\/(\d+)$/, ([userId], _b, query) => {
    let items = db.reservations.filter((r) => r.customerId === Number(userId));
    if (query.status) items = items.filter((r) => r.status === query.status);
    return items
      .map(db.decorateReservation)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }],

  ['GET', /^\/reservations\/(\d+)$/, ([id]) => {
    const reservation = db.reservations.find((r) => r.id === Number(id));
    if (!reservation) notFound(`Reservation ${id}`);
    return db.decorateReservation(reservation);
  }],

  ['DELETE', /^\/reservations\/(\d+)$/, ([id]) => {
    const reservation = db.reservations.find((r) => r.id === Number(id));
    if (!reservation) notFound(`Reservation ${id}`);
    if (reservation.status !== RESERVATION_STATUS.PENDING_RELEASE) {
      fail(
        ERROR_CODE.INVALID_STATE,
        'Invalid state',
        'Only reservations that have not been released can be cancelled',
        409,
      );
    }
    reservation.status = RESERVATION_STATUS.CANCELLED;
    reservation.cancelReason = CANCEL_REASON.CUSTOMER;
    const batch = db.cropBatches.find((b) => b.id === reservation.batchId);
    if (batch) {
      batch.availableYieldKg = round2(batch.availableYieldKg + reservation.requestedQuantityKg);
    }
    return db.decorateReservation(reservation);
  }],

  // ---------------------------------------------------------------- payments
  ['POST', /^\/payments\/create-intent$/, (_p, body) => {
    const reservation = db.reservations.find((r) => r.id === Number(body.reservationId));
    if (!reservation) notFound(`Reservation ${body.reservationId}`);
    if (reservation.status !== RESERVATION_STATUS.AWAITING_PAYMENT) {
      fail(ERROR_CODE.INVALID_STATE, 'Invalid state', 'Reservation is not awaiting payment', 409);
    }
    if (reservation.paymentDueAt && new Date(reservation.paymentDueAt) < new Date()) {
      fail(ERROR_CODE.INVALID_STATE, 'Invalid state', 'The 48 hour window has closed', 409);
    }

    const order = {
      id: db.orders.length + 700,
      reservationId: reservation.id,
      amount: reservation.calculatedTotalAmount,
      paymentStatus: PAYMENT_STATUS.INITIATED,
      paymentLink: `${window.location.origin}/checkout/${reservation.id}/return?orderId=${
        db.orders.length + 700
      }`,
      createdAt: new Date().toISOString(),
      // Mock only: the webhook "arrives" a few seconds after the redirect.
      settlesAt: Date.now() + 4500,
    };
    db.orders.push(order);
    return order;
  }],

  ['GET', /^\/payments\/order\/(\d+)$/, ([orderId]) => {
    const order = db.orders.find((o) => o.id === Number(orderId));
    if (!order) notFound(`Order ${orderId}`);

    if (order.paymentStatus === PAYMENT_STATUS.INITIATED && Date.now() >= order.settlesAt) {
      order.paymentStatus = PAYMENT_STATUS.SUCCESS;
      order.paidAt = new Date().toISOString();
      const reservation = db.reservations.find((r) => r.id === order.reservationId);
      if (reservation && reservation.status === RESERVATION_STATUS.AWAITING_PAYMENT) {
        reservation.status = RESERVATION_STATUS.PAID_READY_FOR_PICKUP;
        reservation.paidAt = order.paidAt;
        reservation.fulfillmentStatus = FULFILLMENT_STATUS.PAID;
      }
    }
    return order;
  }],

  // -------------------------------------------------------------------- auth
  ['POST', /^\/users\/identify$/, (_p, body) => {
    const phoneNumber = String(body.phoneNumber || '').trim();
    if (!/^\d{10}$/.test(phoneNumber)) {
      fail(ERROR_CODE.VALIDATION_ERROR, 'Validation failed', 'Enter a valid 10 digit phone number');
    }
    const existing = db.users.find((u) => u.phoneNumber === phoneNumber);
    if (existing) return existing;

    const user = {
      id: Math.max(0, ...db.users.map((u) => u.id)) + 1,
      fullName: body.fullName || 'Neighbour',
      phoneNumber,
      role: ROLE.CUSTOMER,
    };
    db.users.push(user);
    return user;
  }],

  // ------------------------------------------------------------------- admin
  ['GET', /^\/admin\/batches$/, () =>
    db.cropBatches.map((batch) => {
      const queue = db.fifoQueue(batch.id);
      return {
        ...batch,
        unreleasedKg: db.unreleasedKg(batch),
        queueCount: queue.length,
        queuedKg: round2(queue.reduce((sum, r) => sum + Number(r.requestedQuantityKg), 0)),
        releases: db.batchReleases.filter((r) => r.batchId === batch.id).length,
      };
    })],

  ['POST', /^\/admin\/batches$/, (_p, body) => {
    if (!body.cropName) {
      fail(ERROR_CODE.VALIDATION_ERROR, 'Validation failed', 'Crop name is required');
    }
    const fixedPrice = Number(body.finalRetailPricePerKg) || null;
    const actualYieldKg = Number(body.actualYieldKg) || 0;
    const batch = {
      id: Math.max(0, ...db.cropBatches.map((b) => b.id)) + 1,
      farmId: 1,
      farmName: body.farmName || 'Wai Family Farm',
      cropName: body.cropName,
      seedVariety: body.variety || body.seedVariety || 'Gaavthi',
      isChemicalFree: body.isChemicalFree ?? true,
      currentStage: body.currentStage || (fixedPrice ? CROP_STAGE.STORED_CURING : CROP_STAGE.SOWN),
      totalYieldKg: actualYieldKg,
      availableYieldKg: actualYieldKg,
      actualYieldKg,
      releasedKg: 0,
      estimatedPriceLowPerKg: Number(body.estimatedPriceLowPerKg) || null,
      estimatedPriceHighPerKg: Number(body.estimatedPriceHighPerKg) || null,
      finalRetailPricePerKg: fixedPrice,
      sownDate: body.sownDate || new Date().toISOString(),
      harvestDate: null,
      heroImageUrl: null,
      description: body.description || '',
      createdAt: new Date().toISOString(),
    };
    db.cropBatches.push(batch);
    db.timelines[batch.id] = [];
    return batch;
  }],

  ['POST', /^\/admin\/batches\/(\d+)\/timeline-event$/, ([batchId], body) => {
    const batch = findBatch(batchId);
    if (!body.title) {
      fail(ERROR_CODE.VALIDATION_ERROR, 'Validation failed', 'Title is required');
    }
    const event = {
      id: Date.now(),
      stage: body.stage || batch.currentStage,
      title: body.title,
      description: body.description || '',
      mediaUrl: body.mediaUrl || null,
      eventDate: body.eventDate || new Date().toISOString(),
    };
    db.timelines[batch.id] = [...(db.timelines[batch.id] ?? []), event];
    if (body.stage) batch.currentStage = body.stage;
    if (body.actualYieldKg) batch.actualYieldKg = Number(body.actualYieldKg);
    return event;
  }],

  /** Dry run: what would this tranche do? No mutation. */
  ['POST', /^\/admin\/batches\/(\d+)\/release\/preview$/, ([batchId], body) => {
    const batch = findBatch(batchId);
    const { releasedKg, pricePerKg } = validateRelease(batch, body);
    return planRelease(batch, { releasedKg, pricePerKg });
  }],

  ['POST', /^\/admin\/batches\/(\d+)\/release$/, ([batchId], body) => {
    const batch = findBatch(batchId);
    const { releasedKg, pricePerKg } = validateRelease(batch, body);
    const plan = planRelease(batch, { releasedKg, pricePerKg });

    const releasedAt = new Date();
    const dueAt = new Date(releasedAt.getTime() + PAYMENT_WINDOW_HOURS * 3600 * 1000);

    // Band breach: we quoted a ceiling, so nobody gets billed above it.
    // Every affected reservation is cancelled free and its kg returns to the pool.
    if (plan.bandBreached) {
      plan.allocations.forEach(({ reservationId }) => {
        const reservation = db.reservations.find((r) => r.id === reservationId);
        reservation.status = RESERVATION_STATUS.CANCELLED;
        reservation.cancelReason = CANCEL_REASON.PRICE_ABOVE_BAND;
        batch.availableYieldKg = round2(
          batch.availableYieldKg + Number(reservation.requestedQuantityKg),
        );
      });
      return { ...plan, committed: true, cancelledForBandBreach: plan.allocations.length };
    }

    const release = {
      id: Math.max(0, ...db.batchReleases.map((r) => r.id)) + 1,
      batchId: batch.id,
      releasedKg,
      pricePerKg,
      allocatedKg: plan.allocatedKg,
      releasedAt: releasedAt.toISOString(),
      note: body.note || null,
    };
    db.batchReleases.push(release);

    plan.allocations.forEach(({ reservationId, amount }) => {
      const reservation = db.reservations.find((r) => r.id === reservationId);
      reservation.status = RESERVATION_STATUS.AWAITING_PAYMENT;
      reservation.releaseId = release.id;
      reservation.pricePerKg = pricePerKg;
      reservation.calculatedTotalAmount = amount;
      reservation.paymentDueAt = dueAt.toISOString();
    });

    batch.releasedKg = round2((batch.releasedKg ?? 0) + releasedKg);
    batch.finalRetailPricePerKg = pricePerKg;
    batch.currentStage = CROP_STAGE.BATCH_RELEASED;
    batch.releasedAt = release.releasedAt;

    return { ...plan, committed: true, releaseId: release.id, paymentDueAt: dueAt.toISOString() };
  }],

  /**
   * Rule 3, the Smart Manifest. Everything paid and not yet handed over,
   * grouped by drop-off zone then crop: "Load 150kg of Onions for Pune".
   */
  ['GET', /^\/admin\/logistics\/manifest$/, () => {
    const payable = db.reservations.filter(
      (r) => r.status === RESERVATION_STATUS.PAID_READY_FOR_PICKUP,
    );

    const byLocation = {};
    payable.forEach((reservation) => {
      const batch = db.cropBatches.find((b) => b.id === reservation.batchId);
      const loc = reservation.pickupLocation;
      byLocation[loc] ??= { pickupLocation: loc, label: PICKUP_LOCATION_LABEL[loc], totalKg: 0, crops: {}, handoffs: [] };

      const entry = byLocation[loc];
      entry.totalKg = round2(entry.totalKg + Number(reservation.requestedQuantityKg));
      entry.crops[batch.cropName] = round2(
        (entry.crops[batch.cropName] ?? 0) + Number(reservation.requestedQuantityKg),
      );
      entry.handoffs.push({
        reservationId: reservation.id,
        customerName: db.users.find((u) => u.id === reservation.customerId)?.fullName ?? 'Customer',
        phoneNumber: db.users.find((u) => u.id === reservation.customerId)?.phoneNumber ?? '',
        cropName: batch.cropName,
        quantityKg: Number(reservation.requestedQuantityKg),
        amountPaid: reservation.calculatedTotalAmount,
      });
    });

    const locations = Object.values(byLocation).map((entry) => ({
      ...entry,
      crops: Object.entries(entry.crops).map(([cropName, quantityKg]) => ({ cropName, quantityKg })),
    }));

    return {
      generatedAt: new Date().toISOString(),
      totalKg: round2(locations.reduce((sum, l) => sum + l.totalKg, 0)),
      totalHandoffs: payable.length,
      totalCollected: round2(
        payable.reduce((sum, r) => sum + Number(r.calculatedTotalAmount ?? 0), 0),
      ),
      locations,
    };
  }],

  ['GET', /^\/admin\/orders$/, () => {
    const relevant = db.reservations.filter(
      (reservation) =>
        reservation.status === RESERVATION_STATUS.PAID_READY_FOR_PICKUP ||
        reservation.status === RESERVATION_STATUS.COMPLETED,
    );

    return relevant
      .map(buildOrderFromReservation)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }],

  ['PATCH', /^\/admin\/orders\/(\d+)\/status$/, ([orderId], body) => {
    const reservation = db.reservations.find((r) => r.id === Number(orderId));
    if (!reservation) notFound(`Order ${orderId}`);

    const nextStatus = body.status;
    const allowed = Object.values(FULFILLMENT_STATUS);
    if (!allowed.includes(nextStatus)) {
      fail(ERROR_CODE.VALIDATION_ERROR, 'Validation failed', 'Unsupported fulfillment status', 400);
    }

    if (reservation.status === RESERVATION_STATUS.COMPLETED && nextStatus !== FULFILLMENT_STATUS.DELIVERED) {
      fail(ERROR_CODE.INVALID_STATE, 'Invalid state', 'Completed orders cannot move backwards', 409);
    }

    reservation.fulfillmentStatus = nextStatus;

    if (nextStatus === FULFILLMENT_STATUS.DELIVERED) {
      reservation.status = RESERVATION_STATUS.COMPLETED;
      reservation.completedAt = new Date().toISOString();
    } else {
      reservation.status = RESERVATION_STATUS.PAID_READY_FOR_PICKUP;
      reservation.completedAt = reservation.completedAt ?? null;
    }

    return buildOrderFromReservation(reservation);
  }],

  ['PATCH', /^\/admin\/reservations\/(\d+)\/complete$/, ([id]) => {
    const reservation = db.reservations.find((r) => r.id === Number(id));
    if (!reservation) notFound(`Reservation ${id}`);
    if (reservation.status !== RESERVATION_STATUS.PAID_READY_FOR_PICKUP) {
      fail(ERROR_CODE.INVALID_STATE, 'Invalid state', 'Reservation is not ready for handoff', 409);
    }
    reservation.status = RESERVATION_STATUS.COMPLETED;
    reservation.fulfillmentStatus = FULFILLMENT_STATUS.DELIVERED;
    reservation.completedAt = new Date().toISOString();
    return db.decorateReservation(reservation);
  }],
];

export async function mockRequest({ path, method, body, params }) {
  await delay();

  const query = params ?? {};
  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue;
    const match = pattern.exec(path);
    if (match) return handler(match.slice(1), body ?? {}, query);
  }

  throw new ApiError({
    code: ERROR_CODE.RESOURCE_NOT_FOUND,
    message: 'No mock handler',
    details: `${method} ${path} is not mocked yet`,
    httpStatus: 404,
  });
}
