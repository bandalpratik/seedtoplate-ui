import { useEffect, useState } from 'react';

/**
 * Live countdown to a deadline. Reading the clock during render is impure, so
 * the current value lives in state and is refreshed on an interval.
 */
export function useCountdown(deadline, intervalMs = 30_000) {
  const [remaining, setRemaining] = useState(() =>
    deadline ? new Date(deadline).getTime() - Date.now() : null,
  );

  useEffect(() => {
    if (!deadline) return undefined;
    const tick = () => setRemaining(new Date(deadline).getTime() - Date.now());
    tick();
    const interval = setInterval(tick, intervalMs);
    return () => clearInterval(interval);
  }, [deadline, intervalMs]);

  return {
    remaining: deadline ? remaining : null,
    expired: Boolean(deadline) && remaining !== null && remaining <= 0,
  };
}
