/** Expiry only removes a server claim; it cannot grant or recalculate a promotion. */
export function promotionLeaseActive(expiresAt: string | undefined, now: number): boolean {
  const end = expiresAt ? Date.parse(expiresAt) : NaN;
  return Number.isFinite(now) && Number.isFinite(end) && now < end;
}

/** A retired response never becomes eligible again when a device clock moves back. */
export function promotionLeaseSnapshot(expiresAt: string | undefined, now: () => number): () => boolean {
  let retired = false;
  return () => {
    if (!promotionLeaseActive(expiresAt, now())) retired = true;
    return !retired;
  };
}

export function watchPromotionExpiry(expiresAt: string, notify: () => void, runtime: {
  now: () => number; setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (timer: unknown) => void;
  listen: (fn: () => void) => () => void;
}): () => void {
  let timer: unknown;
  const check = () => {
    runtime.clearTimer(timer);
    notify();
    if (promotionLeaseActive(expiresAt, runtime.now())) timer = runtime.setTimer(check, Math.min(1000, Math.max(1, Date.parse(expiresAt) - runtime.now())));
  };
  const unlisten = runtime.listen(check);
  check();
  return () => { runtime.clearTimer(timer); unlisten(); };
}
