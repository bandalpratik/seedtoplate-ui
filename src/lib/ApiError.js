import { ERROR_CODE } from './constants';

/**
 * Normalised API failure. `code` maps to the backend error codes in
 * docs-backend/API_CONTRACTS.md so screens can branch on it.
 */
export class ApiError extends Error {
  constructor({ code, message, details, httpStatus }) {
    super(message || 'Something went wrong');
    this.name = 'ApiError';
    this.code = code || ERROR_CODE.UNKNOWN_ERROR;
    this.details = details || null;
    this.httpStatus = httpStatus ?? 0;
  }

  get isNotFound() {
    return this.code === ERROR_CODE.RESOURCE_NOT_FOUND || this.httpStatus === 404;
  }

  get isInsufficientYield() {
    return this.code === ERROR_CODE.INSUFFICIENT_YIELD;
  }

  get isNetwork() {
    return this.code === ERROR_CODE.NETWORK_ERROR;
  }

  /** Copy suitable for showing directly to a customer. */
  get userMessage() {
    if (this.isNetwork) return 'No connection. Check your network and try again.';
    if (this.isInsufficientYield) return this.details || 'Not enough of this harvest left.';
    if (this.isNotFound) return 'We could not find that.';
    return this.details || this.message;
  }
}
