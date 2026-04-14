import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNow } from '../hooks/useNow';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a Date on first render', () => {
    const { result } = renderHook(() => useNow());
    expect(result.current).toBeInstanceOf(Date);
    expect(result.current.getTime()).toBe(new Date('2026-04-14T10:00:00Z').getTime());
  });

  it('refreshes on interval', () => {
    const { result } = renderHook(() => useNow(1000));
    const initial = result.current;
    act(() => {
      vi.setSystemTime(new Date('2026-04-14T10:00:05Z'));
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.getTime()).toBeGreaterThan(initial.getTime());
  });

  it('cleans up the interval on unmount', () => {
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useNow(1000));
    unmount();
    expect(clear).toHaveBeenCalled();
  });
});
