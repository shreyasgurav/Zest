import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { rateLimit } from '@/infrastructure/redis/rateLimit';
import redis from '@/infrastructure/redis/redis';

describe('rateLimit — fixed window', () => {
  const key = 'test:user:1';

  beforeAll(async () => {
    // ioredis connects lazily; ensure it's reachable.
    await redis.ping();
  });

  beforeEach(async () => {
    await redis.del(`ratelimit:${key}`);
  });

  afterAll(async () => {
    await redis.del(`ratelimit:${key}`);
    await redis.quit();
  });

  it('allows requests up to the limit then blocks', async () => {
    const limit = 5;
    const results = [];
    for (let i = 0; i < 7; i++) {
      results.push(await rateLimit(key, limit, 60));
    }

    const allowed = results.filter((r) => r.success).length;
    const blocked = results.filter((r) => !r.success).length;

    expect(allowed).toBe(limit);
    expect(blocked).toBe(2);
    expect(results[limit - 1].remaining).toBe(0);
    expect(results[limit].success).toBe(false);
  });

  it('sets a positive reset window', async () => {
    const r = await rateLimit(key, 3, 30);
    expect(r.resetSeconds).toBeGreaterThan(0);
    expect(r.resetSeconds).toBeLessThanOrEqual(30);
  });
});
