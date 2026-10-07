import { useEffect, useState } from 'react';

/**
 * Whole seconds left, from [from] down to 0, once [running] is true.
 *
 * `null` until it starts. It counts once: turning [running] off freezes the
 * number where it is, and turning it back on carries on from there.
 */
export function useCountdown(running: boolean, from: number): number | null {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!running) return;
    setLeft((now) => now ?? from);
    const timer = window.setInterval(() => {
      setLeft((now) => (now === null ? from : Math.max(0, now - 1)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, from]);

  return left;
}
