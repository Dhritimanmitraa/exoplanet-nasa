import { useEffect, useRef, useState } from 'react';

export function useIdle(timeoutMs: number = 60_000) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const reset = () => {
      setIsIdle(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setIsIdle(true), timeoutMs);
    };
    reset();
    const events = ['mousemove', 'keydown', 'wheel', 'touchstart', 'pointerdown'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true } as any));
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs]);

  return { isIdle, reset: () => setIsIdle(false) };
}


