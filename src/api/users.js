import { api } from '../lib/apiClient';

export function findOrCreateUser({ phoneNumber, fullName }) {
  return api.post('/users/identify', { phone: phoneNumber, fullName });
}

export function identifyUser({ phoneNumber, fullName }) {
  return findOrCreateUser({ phoneNumber, fullName });
}
