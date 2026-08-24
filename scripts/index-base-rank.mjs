import fs from 'node:fs/promises';
import path from 'node:path';

const API = 'https://base.blockscout.com/api/v2';
const OUT = path.resolve('data/base-rank-index.json');
const MAX_WALLETS = 10000;
const NEW_WALLETS_PER_RUN = 220;
const TX_PAGES = 12;
const PAGE_SIZE = 50;
const CONCURRENCY = 6;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getJSON(url, tries = 5) {
  let lastError;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'base-portfolio-rank-indexer/1.0'
        }
      });

      if (!response.ok) {
        const error = new Error(`${response.status} ${response.statusText}`);
        error.status = response.status;
        error.retryAfter = Number(response.headers.get('retry-after') || 0);
        throw error;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      const status = Number(error.status || 0);
      const retryable = !status || status === 429 || status >= 500;
      if (!retryable || attempt >= tries) break;

      const retryAfterMs = Number(error.retryAfter || 0) * 1000;
      const backoffMs = Math.min(8000, 750 * 2 ** (attempt - 1));
      const delayMs = Math.max(retryAfterMs, backoffMs);
      console.warn(`Blockscout request failed (${error.message}); retrying in ${delayMs}ms (${attempt}/${tries}).`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

function rankScore(transactionsCount, tokenTransfersCount) {
  const tx = Math.max(0, Number(transactionsCount) || 0);
  const transfers = Math.max(0, Number(tokenTransfersCount) || 0);
  const txPart = Math.min(60, (Math.log10(tx + 1) / 4) * 60);
  const transferPart = Math.min(40, (Math.log10(transfers + 1) / 4) * 40);
  return Math.round(Math.min(100, txPart + transferPart));
}

function normalizeAddress(value) {
  const address = String(value || '').toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(address) ? address : null;
}

function addCandidate(map, party, blockNumber) {
  if (!party || party.is_contract === true) return;
  const address = normalizeAddress(party.hash || party.address_hash || party);
  if (!address) return;
  const previous = map.get(address);
  map.set(address, Math.max(Number(previous || 0), Number(blockNumber || 0)));
}

async function discoverActiveAddresses() {
  const found = new Map();
  let next = null;

  for (let page = 0; page < TX_PAGES; page++) {
    const url = new URL(`${API}/transactions`);
    if (next) Object.entries(next).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    else url.searchParams.set('items_count', String(PAGE_SIZE));

    const payload = await getJSON(url.toString());
    const items = Array.isArray(payload.items) ? payload.items : [];
    for (const tx of items) {
      addCandidate(found, tx.from, tx.block_number);
      addCandidate(found, tx.to, tx.block_number);
    }
    next = payload.next_page_params || null;
    if (!next || !items.length) break;
  }

  return [...found.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([address, lastSeenBlock]) => ({ address, lastSeenBlock }));
}

async function scoreAddress(candidate) {
  const counters = await getJSON(`${API}/addresses/${candidate.address}/counters`);
  const transactionsCount = Number(counters.transactions_count || 0);
  const tokenTransfersCount = Number(counters.token_transfers_count || 0);
  return {
    address: candidate.address,
    score: rankScore(transactionsCount, tokenTransfersCount),
    transactionsCount,
    tokenTransfersCount,
    lastSeenBlock: candidate.lastSeenBlock || 0,
    indexedAt: new Date().toISOString()
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = await worker(items[index]);
      } catch (error) {
        console.warn(`Skipping ${items[index].address}: ${error.message}`);
      }
      await sleep(120);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results.filter(Boolean);
}

async function readExisting() {
  try {
    return JSON.parse(await fs.readFile(OUT, 'utf8'));
  } catch {
    return { version: 1, chainId: 8453, wallets: [] };
  }
}

const existing = await readExisting();
const byAddress = new Map((existing.wallets || []).map(wallet => [wallet.address.toLowerCase(), wallet]));

let discovered;
try {
  discovered = await discoverActiveAddresses();
} catch (error) {
  try {
    await fs.access(OUT);
  } catch {
    throw new Error(`Blockscout discovery failed and there is no existing rank index to preserve: ${error.message}`);
  }

  console.warn(`Could not refresh active Base wallets: ${error.message}`);
  console.warn('Keeping the existing Base rank index unchanged; a later scheduled run can refresh it.');
  process.exit(0);
}

const freshCandidates = discovered.filter(item => !byAddress.has(item.address)).slice(0, NEW_WALLETS_PER_RUN);
const scored = await mapLimit(freshCandidates, CONCURRENCY, scoreAddress);

for (const wallet of scored) byAddress.set(wallet.address, wallet);
for (const item of discovered) {
  const existingWallet = byAddress.get(item.address);
  if (existingWallet) existingWallet.lastSeenBlock = Math.max(existingWallet.lastSeenBlock || 0, item.lastSeenBlock || 0);
}

const wallets = [...byAddress.values()]
  .sort((a, b) => (b.lastSeenBlock || 0) - (a.lastSeenBlock || 0) || b.score - a.score)
  .slice(0, MAX_WALLETS)
  .sort((a, b) => b.score - a.score || b.transactionsCount - a.transactionsCount || a.address.localeCompare(b.address));

let chainTotalAddresses = existing.chainTotalAddresses || null;
try {
  const stats = await getJSON(`${API}/stats`);
  chainTotalAddresses = Number(stats.total_addresses || 0) || chainTotalAddresses;
} catch (error) {
  console.warn(`Could not refresh chain stats: ${error.message}`);
}

const output = {
  version: 1,
  chainId: 8453,
  updatedAt: new Date().toISOString(),
  chainTotalAddresses,
  methodology: 'Active Base EOAs discovered from recent public Base transactions and scored from public Blockscout address counters.',
  scoreFormula: '60% log-scaled transaction count + 40% log-scaled token-transfer count; capped at 100.',
  sampleSize: wallets.length,
  wallets
};

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Indexed ${scored.length} new wallets; sample now ${wallets.length}.`);
