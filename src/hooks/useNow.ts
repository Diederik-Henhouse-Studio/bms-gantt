import { useEffect, useState } from 'react';

/**
 * Returns a `Date` that refreshes at the given interval (ms, default 60s).
 * Used by the "now" indicator so the line ticks without requiring a store update.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
