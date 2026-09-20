import { useCallback, useEffect, useMemo, useState } from 'react';
import { findOrCreateUser } from '../../api/users';
import { ROLE } from '../../lib/constants';
import { AuthContext } from './useAuth';

const STORAGE_KEY = 'seedtoplate.user';
const REQUIRE_LIVE_TOKEN = import.meta.env.VITE_USE_MOCKS !== 'true';

function normalizeUser(user) {
  if (!user) return null;

  const normalized = {
    ...user,
    id: user.id ?? user.userId ?? null,
    fullName: user.fullName ?? user.name ?? '',
    role: user.role ?? (user.isAdmin ? ROLE.ADMIN : ROLE.CUSTOMER),
    isAdmin: user.isAdmin ?? user.role === ROLE.ADMIN,
  };

  if (!normalized.id) return null;
  if (REQUIRE_LIVE_TOKEN && !normalized.token) return null;
  return normalized;
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * v1 identity is phone-number-only (no OTP). Every consumer goes through this
 * context, so swapping in OTP/JWT later touches only this file and api/users.js.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const signIn = useCallback(async ({ phoneNumber, fullName }) => {
    const identified = await findOrCreateUser({ phoneNumber, fullName });
    const normalized = normalizeUser(identified);

    setUser(normalized);
    return normalized;
  }, []);

  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({
      user,
      userId: user?.id ?? null,
      isAuthenticated: Boolean(user),
      isAdmin: user?.isAdmin ?? user?.role === ROLE.ADMIN,
      signIn,
      signOut,
    }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
