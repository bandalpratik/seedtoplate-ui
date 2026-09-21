import { api } from '../lib/apiClient';

/** POST /payments/create-intent — returns the live Razorpay hosted payment link. */
export function createPaymentIntent({ reservationId, returnBaseUrl }) {
  return api.post('/payments/create-intent', { reservationId, returnBaseUrl });
}

/** POST /payments/create-order — create a Razorpay Order to use with Checkout.js */
export function createCheckoutOrder({ reservationId, returnBaseUrl }) {
  return api.post('/payments/create-order', { reservationId, returnBaseUrl });
}

/** GET /payments/order/{orderId} — poll payment state (webhook is source of truth). */
export function getPaymentStatus(orderId) {
  return api.get(`/payments/order/${orderId}`).then((payment) => ({
    ...payment,
    paymentStatus:
      payment.status === 'PENDING'
        ? 'INITIATED'
        : payment.status === 'PAID'
          ? 'SUCCESS'
          : payment.status,
  }));
}
