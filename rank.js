(() => {
  const BLOCKSCOUT = 'https://base.blockscout.com';
  const INDEX_URL = './data/base-rank-index.json';

  const $ = id => document.getElementById(id);

  function installUI() {
    if ($('baseRankBtn')) return;
    const grid = document.querySelector('.metric-grid');
    if (!grid) return;

    const style = document.createElement('style');
    style.textContent = `
      .rank-card{position:relative;overflow:hidden;background:radial-gradient(circle at 100% 0,rgba(79,140,255,.18),transparent 48%),linear-gradient(180deg,rgba(17,26,42,.97),rgba(10,15,25,.97))}
      .rank-card:after{content:'BASE';position:absolute;right:14px;top:12px;font-size:10px;letter-spacing:.18em;color:#5f86c9;font-weight:900}
      .rank-card .rank-main{display:flex;align-items:end;justify-content:space-between;gap:10px;margin:8px 0 5px}
      .rank-card .rank-main strong{margin:0}
      .rank-card .rank-score{font-size:12px;color:#8fb6ff;font-weight:900}
      .rank-card .rank-percentile{display:block;min-height:30px;color:#718096;font-size:11px;line-height:1.35}
      .rank-card .rank-actions{display:flex;align-items:center;gap:9px;margin-top:12px}
      .rank-card .rank-button{border:1px solid #315a9b;border-radius:10px;padding:9px 12px;background:#0b1a30;color:#d8e7ff;font-size:12px;font-weight:900;cursor:pointer}
      .rank-card .rank-button:hover{border-color:#5a8ee3;background:#10254a}
      .rank-card .rank-button:disabled{opacity:.55;cursor:wait}
      .rank-card .rank-sample{font-size:10px;color:#6f7e93}
      .rank-status{grid-column:1/-1;margin:0;padding:0 4px;color:#718096;font-size:11px;line-height:1.45}
      .rank-status.error{color:#fda4af}
    `;
    document.head.appendChild(style);

    const card = document.createElement('article');
    card.className = 'metric card rank-card';
    card.innerHTML = `
      <span>Base Rank</span>
      <div class="rank-main"><strong id="baseRankValue">—</strong><span id="baseRankScore" class="rank-score">—/100</span></div>
      <small id="baseRankPercentile" class="rank-percentile">Compare this wallet with indexed active Base wallets.</small>
      <div class="rank-actions"><button id="baseRankBtn" class="rank-button" type="button">Check Base Rank</button><span id="baseRankSample" class="rank-sample">index loading</span></div>
      <small id="baseRankUpdated" class="rank-sample">Public Base data</small>
    `;
    grid.appendChild(card);

    const status = document.createElement('div');
    status.id = 'baseRankStatus';
    status.className = 'rank-status';
    status.textContent = 'Rank is based on a growing sample of active Base EOAs discovered from public chain activity — not a claim that every Base address is indexed yet.';
    grid.after(status);

    $('baseRankBtn').addEventListener('click', checkBaseRank);
  }

  function rankScore(transactionsCount, tokenTransfersCount) {
    const tx = Math.max(0, Number(transactionsCount) || 0);
    const transfers = Math.max(0, Number(tokenTransfersCount) || 0);
    const txPart = Math.min(60, (Math.log10(tx + 1) / 4) * 60);
    const transferPart = Math.min(40, (Math.log10(transfers + 1) / 4) * 40);
    return Math.round(Math.min(100, txPart + transferPart));
  }

  function compact(value) {
    const n = Number(value || 0);
    return n.toLocaleString();
  }

  async function getJSON(url) {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  }

  function setRankStatus(text, error = false) {
    const el = $('baseRankStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('error', error);
  }

  async function checkBaseRank() {
    if (typeof state === 'undefined' || !state.address) {
      setRankStatus('Analyze a Base address first.', true);
      return;
    }

    const button = $('baseRankBtn');
    button.disabled = true;
    setRankStatus('Comparing this wallet with the indexed Base sample…');

    try {
      const address = state.address.toLowerCase();
      const [index, counters] = await Promise.all([
        getJSON(`${INDEX_URL}?v=${Date.now()}`),
        getJSON(`${BLOCKSCOUT}/api/v2/addresses/${encodeURIComponent(address)}/counters`)
      ]);

      const wallets = Array.isArray(index.wallets) ? index.wallets : [];
      if (!wallets.length) {
        $('baseRankValue').textContent = 'Warming up';
        $('baseRankPercentile').textContent = 'The public Base rank index has not populated yet.';
        $('baseRankScore').textContent = '—/100';
        setRankStatus('The scheduled indexer is building the first active-wallet sample. Try again after the next refresh.');
        return;
      }

      const score = rankScore(counters.transactions_count, counters.token_transfers_count);
      const txCount = Number(counters.transactions_count || 0);
      const better = wallets.filter(wallet => Number(wallet.score || 0) > score).length;
      const sameHigherTx = wallets.filter(wallet => Number(wallet.score || 0) === score && Number(wallet.transactionsCount || 0) > txCount).length;
      const rank = better + sameHigherTx + 1;
      const inIndex = wallets.some(wallet => wallet.address === address);
      const denominator = wallets.length + (inIndex ? 0 : 1);
      const topPct = Math.max(0.01, (rank / denominator) * 100);

      $('baseRankValue').textContent = `#${compact(rank)}`;
      $('baseRankPercentile').textContent = `Top ${topPct < 1 ? topPct.toFixed(2) : topPct.toFixed(1)}% of ${compact(denominator)} indexed active wallets`;
      $('baseRankScore').textContent = `${score}/100`;
      $('baseRankSample').textContent = `${compact(wallets.length)} indexed`;
      $('baseRankUpdated').textContent = index.updatedAt ? `Updated ${new Date(index.updatedAt).toLocaleString()}` : 'Refresh pending';
      setRankStatus(`Base Rank uses public activity counters and the current active-wallet index. Base Blockscout reports ${index.chainTotalAddresses ? compact(index.chainTotalAddresses) : 'many'} total chain addresses; full-chain coverage is intentionally not claimed until the index reaches it.`);
    } catch (error) {
      console.error(error);
      setRankStatus('Could not load the Base rank index right now. Try again in a moment.', true);
    } finally {
      button.disabled = false;
    }
  }

  installUI();
})();
