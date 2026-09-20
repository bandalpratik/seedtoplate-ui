import { PAYMENT_WINDOW_HOURS } from './constants';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—';
  return inr.format(Number(amount));
}

export function formatKg(kg) {
  if (kg === null || kg === undefined) return '—';
  const n = Number(kg);
  return `${Number.isInteger(n) ? n : n.toFixed(1)} kg`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Line total for a reservation: quantity x final retail price. */
export function lineTotal(quantityKg, pricePerKg) {
  if (quantityKg === null || pricePerKg === null) return null;
  return Number(quantityKg) * Number(pricePerKg);
}

/** Deadline for a released batch, derived from when it entered AWAITING_PAYMENT. */
export function paymentDeadline(releasedAt) {
  if (!releasedAt) return null;
  return new Date(new Date(releasedAt).getTime() + PAYMENT_WINDOW_HOURS * 3600 * 1000);
}

export function formatCountdown(msRemaining) {
  if (msRemaining === null || msRemaining === undefined) return '—';
  if (msRemaining <= 0) return 'Expired';

  const totalMinutes = Math.floor(msRemaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function clampQuantity(value, { min, max, step }) {
  const stepped = Math.round(value / step) * step;
  const bounded = Math.min(Math.max(stepped, min), max);
  return Number(bounded.toFixed(2));
}

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}
