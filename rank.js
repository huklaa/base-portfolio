(() => {
  const BLOCKSCOUT = 'https://base.blockscout.com';
  const INDEX_URL = './data/base-rank-index.json';
  const ADDRESS_RE_LOCAL = /^0x[a-fA-F0-9]{40}$/;

  const $ = id => document.getElementById(id);
  let lastRank = null;

  function installUI() {
    if ($('baseRankPanel')) return;
    const searchPanel = document.querySelector('.search-panel');
    if (!searchPanel) return;

    const style = document.createElement('style');
    style.textContent = `
      .rank-spotlight{margin:-34px 0 52px;padding:22px;position:relative;overflow:hidden;background:radial-gradient(circle at 100% 0,rgba(79,140,255,.20),transparent 44%),linear-gradient(180deg,rgba(17,26,42,.98),rgba(8,13,23,.98));border-color:#284a82}
      .rank-spotlight:after{content:'BASE';position:absolute;right:20px;top:18px;font-size:10px;letter-spacing:.18em;color:#5f86c9;font-weight:900}
      .rank-top{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}
      .rank-copy h3{font-size:24px;margin:2px 0 7px}.rank-copy p{margin:0;color:#8ea0b9;font-size:13px;line-height:1.5;max-width:720px}
      .rank-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:18px}
      .rank-button{border:1px solid #315a9b;border-radius:11px;padding:11px 15px;background:#0b1a30;color:#d8e7ff;font-size:13px;font-weight:900;cursor:pointer}
      .rank-button.primary-rank{border:0;background:linear-gradient(135deg,#276cff,#155eef);color:#fff;box-shadow:0 8px 28px rgba(21,94,239,.24)}
      .rank-button:hover{border-color:#5a8ee3;background:#10254a}.rank-button.primary-rank:hover{background:linear-gradient(135deg,#3578ff,#1b63f0)}
      .rank-button:disabled{opacity:.55;cursor:wait}.rank-share{border-color:#236b52;background:#09251d;color:#c7f9e7}.rank-share[hidden]{display:none}
      .rank-result{display:none;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.rank-result.visible{display:grid}
      .rank-stat{background:#080d16;border:1px solid #19243a;border-radius:14px;padding:14px}.rank-stat span{display:block;color:#8290a5;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.rank-stat strong{display:block;font-size:25px;margin-top:6px}.rank-stat small{display:block;color:#718096;font-size:10px;margin-top:4px;line-height:1.4}
      .rank-status{margin-top:12px;color:#718096;font-size:11px;line-height:1.45}.rank-status.error{color:#fda4af}
      @media(max-width:700px){.rank-top{display:block}.rank-result{grid-template-columns:1fr 1fr}.rank-spotlight{margin:-34px 0 42px}}
    `;
    document.head.appendChild(style);

    const panel = document.createElement('section');
    panel.id = 'baseRankPanel';
    panel.className = 'card rank-spotlight';
    panel.innerHTML = `
      <div class="rank-top">
        <div class="rank-copy">
          <div class="eyebrow">BASE GLOBAL RANK · BETA</div>
          <h3>See where this wallet ranks on Base</h3>
          <p>Compare the address above with the growing index of active Base wallets. The index expands automatically from public Base chain activity.</p>
        </div>
      </div>
      <div class="rank-actions">
        <button id="baseRankBtn" class="rank-button primary-rank" type="button">Check Base Global Rank</button>
        <button id="baseRankShare" class="rank-button rank-share" type="button" hidden>Share Rank on X</button>
      </div>
      <div id="baseRankResult" class="rank-result">
        <div class="rank-stat"><span>Base Rank</span><strong id="baseRankValue">—</strong><small>Among indexed active wallets</small></div>
        <div class="rank-stat"><span>Percentile</span><strong id="baseRankPercentile">—</strong><small id="baseRankPercentileSub">Growing Base index</small></div>
        <div class="rank-stat"><span>Rank Score</span><strong id="baseRankScore">—/100</strong><small>Public activity counters</small></div>
        <div class="rank-stat"><span>Index Size</span><strong id="baseRankSample">—</strong><small id="baseRankUpdated">Refresh pending</small></div>
      </div>
      <div id="baseRankStatus" class="rank-status">Enter a Base address above, then press “Check Base Global Rank”. Full-chain coverage is not claimed until the index reaches it.</div>
    `;
    searchPanel.insertAdjacentElement('afterend', panel);

    $('baseRankBtn').addEventListener('click', checkBaseRank);
    $('baseRankShare').addEventListener('click', shareBaseRank);
  }

  function rankScore(transactionsCount, tokenTransfersCount) {
    const tx = Math.max(0, Number(transactionsCount) || 0);
    const transfers = Math.max(0, Number(tokenTransfersCount) || 0);
    const txPart = Math.min(60, (Math.log10(tx + 1) / 4) * 60);
    const transferPart = Math.min(40, (Math.log10(transfers + 1) / 4) * 40);
    return Math.round(Math.min(100, txPart + transferPart));
  }

  function compact(value) { return Number(value || 0).toLocaleString(); }

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

  async function ensureAnalyzedAddress() {
    const input = $('addressInput');
    const address = input?.value?.trim() || '';
    if (!ADDRESS_RE_LOCAL.test(address)) throw new Error('Enter a valid Base / EVM address above first.');
    if (typeof state !== 'undefined' && state.address?.toLowerCase() === address.toLowerCase()) return address;
    if (typeof analyze === 'function') {
      await analyze();
      if (typeof state !== 'undefined' && state.address?.toLowerCase() === address.toLowerCase()) return address;
    }
    throw new Error('The wallet could not be analyzed yet. Try again in a moment.');
  }

  function shareBaseRank() {
    if (!lastRank || typeof state === 'undefined' || !state.address) return;
    const shareUrl = `${location.origin}${location.pathname}?address=${encodeURIComponent(state.address)}`;
    const pct = lastRank.topPct < 1 ? lastRank.topPct.toFixed(2) : lastRank.topPct.toFixed(1);
    const text = `My Base Global Rank is #${compact(lastRank.rank)} — Top ${pct}% of ${compact(lastRank.denominator)} indexed active wallets on Base. Check yours on Base Portfolio. #Base`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
  }

  async function checkBaseRank() {
    const button = $('baseRankBtn');
    const shareButton = $('baseRankShare');
    button.disabled = true;
    shareButton.hidden = true;
    lastRank = null;
    setRankStatus('Analyzing the address and comparing it with the indexed Base wallet universe…');

    try {
      const rawAddress = await ensureAnalyzedAddress();
      const address = rawAddress.toLowerCase();
      const [index, counters] = await Promise.all([
        getJSON(`${INDEX_URL}?v=${Date.now()}`),
        getJSON(`${BLOCKSCOUT}/api/v2/addresses/${encodeURIComponent(address)}/counters`)
      ]);

      const wallets = Array.isArray(index.wallets) ? index.wallets : [];
      $('baseRankResult').classList.add('visible');
      if (!wallets.length) {
        $('baseRankValue').textContent = 'Warming up';
        $('baseRankPercentile').textContent = '—';
        $('baseRankScore').textContent = '—/100';
        $('baseRankSample').textContent = '0';
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
      const pctText = topPct < 1 ? `${topPct.toFixed(2)}%` : `${topPct.toFixed(1)}%`;

      lastRank = { rank, denominator, topPct, score };
      $('baseRankValue').textContent = `#${compact(rank)}`;
      $('baseRankPercentile').textContent = `Top ${pctText}`;
      $('baseRankPercentileSub').textContent = `of ${compact(denominator)} indexed active wallets`;
      $('baseRankScore').textContent = `${score}/100`;
      $('baseRankSample').textContent = compact(wallets.length);
      $('baseRankUpdated').textContent = index.updatedAt ? `Updated ${new Date(index.updatedAt).toLocaleString()}` : 'Refresh pending';
      shareButton.hidden = false;
      setRankStatus(`This is a live rank inside the current indexed Base wallet universe. The index grows automatically; the displayed rank can change as coverage expands.`);
      panelScroll();
    } catch (error) {
      console.error(error);
      setRankStatus(error.message || 'Could not load Base Rank right now.', true);
    } finally {
      button.disabled = false;
    }
  }

  function panelScroll(){
    const panel=$('baseRankPanel');
    if(panel) panel.scrollIntoView({behavior:'smooth',block:'center'});
  }

  installUI();
})();
