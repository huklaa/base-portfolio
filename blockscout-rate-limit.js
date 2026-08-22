(() => {
  const nativeFetch = globalThis.fetch?.bind(globalThis);
  if (!nativeFetch || globalThis.__baseBlockscoutQueueInstalled) return;
  globalThis.__baseBlockscoutQueueInstalled = true;

  const HOST = 'base.blockscout.com';
  const MIN_GAP_MS = 450;
  const CACHE_MS = 20000;
  const cache = new Map();
  let queue = Promise.resolve();
  let lastStartedAt = 0;

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
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(15000, seconds * 1000);
    return Math.min(8000, 900 * Math.pow(2, attempt));
  }

  async function runSerialized(task) {
    const previous = queue;
    let release;
    queue = new Promise(resolve => { release = resolve; });
    await previous;
    try {
      const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastStartedAt));
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

      for (let attempt = 0; attempt < 5; attempt++) {
        let response;
        try {
          response = await nativeFetch(input, init);
        } catch (error) {
          if (attempt === 4) throw error;
          await sleep(900 * Math.pow(2, attempt));
          continue;
        }

        if (response.ok) {
          if (key) cache.set(key, { expires: Date.now() + CACHE_MS, response: response.clone() });
          return response;
        }

        if (![429, 502, 503, 504].includes(response.status) || attempt === 4) return response;
        await sleep(retryDelay(response, attempt));
        lastStartedAt = Date.now();
      }

      return nativeFetch(input, init);
    });
  }

  globalThis.fetch = blockscoutFetch;
})();
