export const CROP_STAGE = {
  SOWN: 'SOWN',
  GROWING: 'GROWING',
  HARVESTED: 'HARVESTED',
  STORED_CURING: 'STORED_CURING',
  BATCH_RELEASED: 'BATCH_RELEASED',
  DISPATCHED: 'DISPATCHED',
  COMPLETE: 'COMPLETE',
  ARCHIVED: 'ARCHIVED',
};

export const EARLY_CROP_STAGES = [CROP_STAGE.SOWN, CROP_STAGE.GROWING];
export const IN_HAND_CROP_STAGES = [
  CROP_STAGE.HARVESTED,
  CROP_STAGE.STORED_CURING,
  CROP_STAGE.BATCH_RELEASED,
  CROP_STAGE.DISPATCHED,
  CROP_STAGE.COMPLETE,
  CROP_STAGE.ARCHIVED,
];

export function isEarlyCropStage(stage) {
  return EARLY_CROP_STAGES.includes(stage);
}

export function hasPhysicalStock(stage) {
  return IN_HAND_CROP_STAGES.includes(stage);
}

/** Stages shown on the customer-facing progress rail, in order. */
export const CUSTOMER_STAGE_RAIL = [
  CROP_STAGE.SOWN,
  CROP_STAGE.GROWING,
  CROP_STAGE.HARVESTED,
  CROP_STAGE.STORED_CURING,
];

export const CROP_STAGE_LABEL = {
  SOWN: 'Sown',
  GROWING: 'Growing',
  HARVESTED: 'Harvested',
  STORED_CURING: 'Curing',
  BATCH_RELEASED: 'Ready',
  DISPATCHED: 'Dispatched',
  COMPLETE: 'Complete',
  ARCHIVED: 'Archived',
};

export const RESERVATION_STATUS = {
  PENDING_RELEASE: 'PENDING_RELEASE',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAID_READY_FOR_PICKUP: 'PAID_READY_FOR_PICKUP',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const RESERVATION_STATUS_LABEL = {
  PENDING_RELEASE: 'In the queue',
  AWAITING_PAYMENT: 'Payment due',
  PAID_READY_FOR_PICKUP: 'Ready for pickup',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/**
 * A reservation sits in PENDING_RELEASE from sowing right through to the day a
 * tranche goes out, so the status alone says nothing useful. Label it by what
 * the crop is actually doing — "Growing" on a batch that is already cured and
 * sitting in the store is just wrong.
 */
export function reservationStatusLabel(status, cropStage) {
  if (status !== RESERVATION_STATUS.PENDING_RELEASE) {
    return RESERVATION_STATUS_LABEL[status];
  }

  switch (cropStage) {
    case CROP_STAGE.SOWN:
    case CROP_STAGE.GROWING:
      return 'Growing';
    case CROP_STAGE.HARVESTED:
      return 'Harvested';
    case CROP_STAGE.STORED_CURING:
      return 'In store';
    case CROP_STAGE.BATCH_RELEASED:
      return 'Next in line';
    default:
      return RESERVATION_STATUS_LABEL[status];
  }
}

/** One line telling the customer what actually happens next. */
export function reservationNextStep(status, cropStage) {
  if (status !== RESERVATION_STATUS.PENDING_RELEASE) return null;

  switch (cropStage) {
    case CROP_STAGE.SOWN:
    case CROP_STAGE.GROWING:
      return 'Still in the ground. We will message you when it is harvested.';
    case CROP_STAGE.HARVESTED:
      return 'Harvested and being cured. Pricing happens when it leaves the store.';
    case CROP_STAGE.STORED_CURING:
      return 'Cured and in the store. Your price is set the day your kilos are packed.';
    case CROP_STAGE.BATCH_RELEASED:
      return 'Earlier slices have gone out. Yours is priced when the next one is released.';
    default:
      return null;
  }
}

export const CANCEL_REASON = {
  CUSTOMER: 'CUSTOMER_CANCELLED',
  PRICE_ABOVE_BAND: 'PRICE_ABOVE_BAND',
  PAYMENT_WINDOW_EXPIRED: 'PAYMENT_WINDOW_EXPIRED',
};

export const CANCEL_REASON_LABEL = {
  CUSTOMER_CANCELLED: 'Cancelled by you',
  PRICE_ABOVE_BAND: 'Cancelled free — price rose above the band we quoted',
  PAYMENT_WINDOW_EXPIRED: 'Payment window closed',
};

export const PAYMENT_STATUS = {
  INITIATED: 'INITIATED',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
};

export const FULFILLMENT_STATUS = {
  PAID: 'PAID',
  PACKING: 'PACKING',
  IN_TRANSIT: 'IN_TRANSIT',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

export const FULFILLMENT_STATUS_LABEL = {
  PAID: 'Paid',
  PACKING: 'Packing',
  IN_TRANSIT: 'In transit',
  READY_FOR_PICKUP: 'Ready for pickup',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const FULFILLMENT_SEQUENCE = [
  FULFILLMENT_STATUS.PAID,
  FULFILLMENT_STATUS.PACKING,
  FULFILLMENT_STATUS.IN_TRANSIT,
  FULFILLMENT_STATUS.READY_FOR_PICKUP,
  FULFILLMENT_STATUS.DELIVERED,
];

export const PICKUP_LOCATION = {
  PUNE_OFFICE: 'PUNE_OFFICE',
  JUINAGAR_RESIDENCE: 'JUINAGAR_RESIDENCE',
};

export const PICKUP_LOCATION_LABEL = {
  PUNE_OFFICE: 'Pune Office',
  JUINAGAR_RESIDENCE: 'Juinagar',
};

export const ROLE = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
};

export const ERROR_CODE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INSUFFICIENT_YIELD: 'INSUFFICIENT_YIELD',
  DUPLICATE_RESERVATION: 'DUPLICATE_RESERVATION',
  INVALID_STATE: 'INVALID_STATE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/** Hours a customer has to pay once a batch is released. */
export const PAYMENT_WINDOW_HOURS = 48;

/** Waitlist slider bounds, in kg. */
export const MIN_RESERVATION_KG = 1;
export const MAX_RESERVATION_KG = 20;
export const RESERVATION_STEP_KG = 0.5;

/**
 * The pricing promise, in one sentence. Shown verbatim wherever a customer is
 * asked to commit without a locked price.
 */
export const PRICE_RULE =
  'Your price is the price on the day your kilos leave the farm store.';
