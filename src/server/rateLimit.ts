type RateLimitOptions = {
  max: number;
  windowMs: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitState>();

function now() {
  return Date.now();
}

function cleanupExpiredBuckets(currentTime: number) {
  if (buckets.size < 1000) return;

  for (const [key, state] of buckets.entries()) {
    if (state.resetAt <= currentTime) {
      buckets.delete(key);
    }
  }
}

export function getRequestIp(req: any) {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp;
  }

  return req.socket?.remoteAddress || 'unknown';
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const currentTime = now();
  cleanupExpiredBuckets(currentTime);

  const existing = buckets.get(key);
  const state = !existing || existing.resetAt <= currentTime
    ? { count: 0, resetAt: currentTime + options.windowMs }
    : existing;

  state.count += 1;
  buckets.set(key, state);

  const remaining = Math.max(0, options.max - state.count);
  const retryAfterSeconds = Math.max(0, Math.ceil((state.resetAt - currentTime) / 1000));

  return {
    allowed: state.count <= options.max,
    limit: options.max,
    remaining,
    resetAt: state.resetAt,
    retryAfterSeconds,
  };
}

export function applyRateLimitHeaders(res: any, result: RateLimitResult) {
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSeconds));
  }
}
