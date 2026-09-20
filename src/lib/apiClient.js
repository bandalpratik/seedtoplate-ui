import { ApiError } from './ApiError';
import { ERROR_CODE } from './constants';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

function readAuthToken() {
  try {
    const raw = localStorage.getItem('seedtoplate.user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.token ?? null;
  } catch {
    return null;
  }
}

function buildUrl(path, params) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!params) return url;

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });

  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

/**
 * Unwraps the backend envelope documented in API_CONTRACTS.md:
 *   success -> { status: 'SUCCESS', data, message }
 *   failure -> { status: 'ERROR', error: { code, message, details } }
 * Returns the `data` payload, or throws an ApiError.
 */
function unwrap(body, httpStatus) {
  if (body && body.status === 'ERROR') {
    throw new ApiError({ ...body.error, httpStatus });
  }

  if (httpStatus >= 400) {
    throw new ApiError({
      code: ERROR_CODE.UNKNOWN_ERROR,
      message: `Request failed with status ${httpStatus}`,
      httpStatus,
    });
  }

  // Tolerate a bare payload in case an endpoint skips the envelope.
  return body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
}

export async function request(path, { method = 'GET', body, params, signal, headers } = {}) {
  if (USE_MOCKS) {
    const { mockRequest } = await import('../mocks/server');
    return mockRequest({ path, method, body, params });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  let response;
  try {
    const token = readAuthToken();
    response = await fetch(buildUrl(path, params), {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : null),
        ...(token ? { Authorization: `Bearer ${token}` } : null),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError({
      code: ERROR_CODE.NETWORK_ERROR,
      message: 'Network request failed',
      details: error?.message,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (response.ok) return text;
    throw new ApiError({
      code: ERROR_CODE.UNKNOWN_ERROR,
      message: `Request failed with status ${response.status}`,
      details: text?.slice(0, 200),
      httpStatus: response.status,
    });
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError({
      code: ERROR_CODE.UNKNOWN_ERROR,
      message: 'Malformed response from server',
      httpStatus: response.status,
    });
  }

  return unwrap(payload, response.status);
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export const apiConfig = { BASE_URL, USE_MOCKS };
