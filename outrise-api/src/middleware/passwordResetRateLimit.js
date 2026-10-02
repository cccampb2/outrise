// IP limits protect the public endpoints. Per-account cooldowns and code guess
// limits are also persisted on User, so restarting this process cannot reset them.
export function createPasswordResetLimiter({ max = 5, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const buckets = new Map();
  let lastSweep = 0;
  return (req, res, next) => {
    const time = now();
    if (time - lastSweep >= windowMs) {
      for (const [ip, bucket] of buckets) {
        if (bucket.expiresAt <= time) buckets.delete(ip);
      }
      lastSweep = time;
    }
    const ip = req.ip;
    let bucket = buckets.get(ip);
    if (!bucket || bucket.expiresAt <= time) {
      bucket = { count: 0, expiresAt: time + windowMs };
      buckets.set(ip, bucket);
    }
    if (bucket.count >= max) {
      res.set("Retry-After", String(Math.ceil((bucket.expiresAt - time) / 1000)));
      return res.status(429).json({
        error: "TooManyRequests",
        message: "Too many password reset requests. Please wait a few minutes and try again.",
      });
    }
    bucket.count += 1;
    next();
  };
}

export const limitPasswordResetRequests = createPasswordResetLimiter();
export const limitPasswordResetAttempts = createPasswordResetLimiter({ max: 20 });
