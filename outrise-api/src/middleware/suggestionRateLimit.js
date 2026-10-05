// Separate from support reports so suggestions cannot consume the reporting allowance.
export const createSuggestionLimiter = ({
  max = 5,
  windowMs = 15 * 60 * 1000,
  now = Date.now,
} = {}) => {
  const buckets = new Map();
  let lastSweep = 0;
  return (req, res, next) => {
    const time = now();
    if (time - lastSweep >= windowMs) {
      for (const [key, bucket] of buckets)
        if (bucket.expiresAt <= time) {
          buckets.delete(key);
        }
      lastSweep = time;
    }
    const key = req.user.userId;
    let bucket = buckets.get(key);
    if (!bucket || bucket.expiresAt <= time) {
      bucket = { count: 0, expiresAt: time + windowMs };
      buckets.set(key, bucket);
    }
    if (bucket.count >= max) {
      res.set(
        "Retry-After",
        String(Math.ceil((bucket.expiresAt - time) / 1000)),
      );
      return res.status(429).json({
        message: "Please wait a few minutes before sending another suggestion.",
      });
    }
    bucket.count += 1;
    next();
  };
};

export const limitSuggestions = createSuggestionLimiter();
