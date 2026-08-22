(() => {
  const BLOCKSCOUT = 'https://base.blockscout.com';
  const INDEX_URL = './data/base-rank-index.json';

  const $ = id => document.getElementById(id);

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
        setRankStatus('The scheduled indexer is building the first active-wallet sample. Try again after the next refresh.');
        return;
      }

      const score = rankScore(counters.transactions_count, counters.token_transfers_count);
      const better = wallets.filter(wallet => Number(wallet.score || 0) > score).length;
      const sameHigherTx = wallets.filter(wallet => Number(wallet.score || 0) === score && Number(wallet.transactionsCount || 0) > Number(counters.transactions_count || 0)).length;
      const rank = better + sameHigherTx + 1;
      const inIndex = wallets.some(wallet => wallet.address === address);
      const denominator = wallets.length + (inIndex ? 0 : 1);
      const topPct = Math.max(0.01, (rank / denominator) * 100);

      $('baseRankValue').textContent = `#${compact(rank)}`;
      $('baseRankPercentile').textContent = `Top ${topPct < 1 ? topPct.toFixed(2) : topPct.toFixed(1)}% of ${compact(denominator)} indexed active wallets`;
      $('baseRankScore').textContent = `${score}/100`;
      $('baseRankSample').textContent = `${compact(wallets.length)} indexed`;
      $('baseRankUpdated').textContent = index.updatedAt ? `Updated ${new Date(index.updatedAt).toLocaleString()}` : 'Refresh pending';
      setRankStatus(`Base Rank compares public activity counters against the current indexed active-wallet sample. Base itself reports ${index.chainTotalAddresses ? compact(index.chainTotalAddresses) : 'many'} total addresses; the rank does not claim full-chain coverage yet.`);
    } catch (error) {
      console.error(error);
      setRankStatus('Could not load the Base rank index right now. Try again in a moment.', true);
    } finally {
      button.disabled = false;
    }
  }

  const button = $('baseRankBtn');
  if (button) button.addEventListener('click', checkBaseRank);
})();
