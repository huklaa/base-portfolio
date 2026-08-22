(() => {
  const nativeFetch = globalThis.fetch?.bind(globalThis);
  if (!nativeFetch || globalThis.__baseBlockscoutQueueInstalled) return;
  globalThis.__baseBlockscoutQueueInstalled = true;

  const HOST = 'base.blockscout.com';
  const MIN_GAP_MS = 850;
  const CACHE_MS = 120000;
  const MAX_ATTEMPTS = 8;
  const cache = new Map();
  let queue = Promise.resolve();
  let lastStartedAt = 0;
  let cooldownUntil = 0;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function isBlockscout(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      return new URL(raw, location.href).hostname === HOST;
    } catch {
      return false;
    }
  }

  function retryDelay(response, attempt) {
    const header = response?.headers?.get?.('retry-after');
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(60000, seconds * 1000);
    if (response?.status === 429) return Math.min(30000, 3000 * Math.pow(2, attempt));
    return Math.min(12000, 1000 * Math.pow(2, attempt));
  }

  function announceWaiting(delay) {
    try {
      window.dispatchEvent(new CustomEvent('base-blockscout-wait', { detail: { delay, until: Date.now() + delay } }));
    } catch {}
  }

  async function runSerialized(task) {
    const previous = queue;
    let release;
    queue = new Promise(resolve => { release = resolve; });
    await previous;
    try {
      const waitForGap = Math.max(0, MIN_GAP_MS - (Date.now() - lastStartedAt));
      const waitForCooldown = Math.max(0, cooldownUntil - Date.now());
      const wait = Math.max(waitForGap, waitForCooldown);
      if (wait) await sleep(wait);
      lastStartedAt = Date.now();
      return await task();
    } finally {
      release();
    }
  }

  async function blockscoutFetch(input, init = {}) {
    if (!isBlockscout(input)) return nativeFetch(input, init);

    const method = String(init?.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : input.url;
    const key = method === 'GET' ? url : null;
    const hit = key && cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.response.clone();

    return runSerialized(async () => {
      const secondHit = key && cache.get(key);
      if (secondHit && secondHit.expires > Date.now()) return secondHit.response.clone();

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const waitForCooldown = Math.max(0, cooldownUntil - Date.now());
        if (waitForCooldown) await sleep(waitForCooldown);

        let response;
        try {
          response = await nativeFetch(input, init);
        } catch (error) {
          if (attempt === MAX_ATTEMPTS - 1) throw error;
          const delay = Math.min(12000, 1000 * Math.pow(2, attempt));
          announceWaiting(delay);
          await sleep(delay);
          continue;
        }

        if (response.ok) {
          if (key) cache.set(key, { expires: Date.now() + CACHE_MS, response: response.clone() });
          return response;
        }

        if (![429, 502, 503, 504].includes(response.status) || attempt === MAX_ATTEMPTS - 1) return response;

        const delay = retryDelay(response, attempt);
        if (response.status === 429) cooldownUntil = Math.max(cooldownUntil, Date.now() + delay);
        announceWaiting(delay);
        await sleep(delay);
        lastStartedAt = Date.now();
      }

      return nativeFetch(input, init);
    });
  }

  globalThis.BaseBlockscoutGate = {
    cache,
    get cooldownUntil() { return cooldownUntil; },
    get queued() { return queue; }
  };
  globalThis.fetch = blockscoutFetch;
})();
