(function(){
  const DAY = 86400;

  function txTimestamp(tx){
    const raw = tx?.timeStamp ?? tx?.timestamp;
    if(raw == null) return 0;
    if(typeof raw === 'number') return raw > 1e12 ? Math.floor(raw/1000) : Math.floor(raw);
    if(/^\d+$/.test(String(raw))) {
      const n = Number(raw);
      return n > 1e12 ? Math.floor(n/1000) : Math.floor(n);
    }
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? Math.floor(parsed/1000) : 0;
  }

  function contractAddress(tx){
    const to = typeof tx?.to === 'string' ? tx.to : tx?.to?.hash;
    const input = String(tx?.input || '');
    if(!to || !input || input === '0x') return '';
    return String(to).toLowerCase();
  }

  function gasWei(tx){
    try { return BigInt(tx?.gasUsed || 0) * BigInt(tx?.gasPrice || 0); }
    catch { return 0n; }
  }

  function summarizeWindow(txs, start, end){
    const rows = txs.filter(tx => {
      const ts = txTimestamp(tx);
      return ts >= start && ts < end;
    });
    const activeDays = new Set();
    const contracts = new Set();
    let contractCalls = 0;
    let gas = 0n;
    for(const tx of rows){
      const ts = txTimestamp(tx);
      if(ts) activeDays.add(new Date(ts*1000).toISOString().slice(0,10));
      const contract = contractAddress(tx);
      if(contract){ contracts.add(contract); contractCalls++; }
      gas += gasWei(tx);
    }
    return { rows, txCount:rows.length, activeDays:activeDays.size, contracts, uniqueContracts:contracts.size, contractCalls, gasEth:Number(gas)/1e18 };
  }

  function pctChange(current, previous){
    if(previous === 0) return current === 0 ? 0 : null;
    return ((current-previous)/previous)*100;
  }

  function buildDelta(txs, nowSec=Math.floor(Date.now()/1000)){
    const currentStart = nowSec - 30*DAY;
    const previousStart = nowSec - 60*DAY;
    const current = summarizeWindow(txs, currentStart, nowSec + 1);
    const previous = summarizeWindow(txs, previousStart, currentStart);
    const beforeCurrent = new Set();
    for(const tx of txs){
      if(txTimestamp(tx) >= currentStart) continue;
      const c = contractAddress(tx);
      if(c) beforeCurrent.add(c);
    }
    const newApps = [...current.contracts].filter(c => !beforeCurrent.has(c));
    const revisitedApps = [...current.contracts].filter(c => beforeCurrent.has(c));
    const txTrend = pctChange(current.txCount, previous.txCount);
    const dayTrend = pctChange(current.activeDays, previous.activeDays);
    const contractTrend = pctChange(current.uniqueContracts, previous.uniqueContracts);
    const gasTrend = pctChange(current.gasEth, previous.gasEth);
    return { current, previous, newApps, revisitedApps, txTrend, dayTrend, contractTrend, gasTrend, currentStart, previousStart, nowSec };
  }

  function trendText(value){
    if(value === null) return 'new';
    if(!Number.isFinite(value) || Math.abs(value) < 0.5) return 'flat';
    return `${value > 0 ? '+' : ''}${Math.round(value)}%`;
  }

  function buildSummary(d){
    if(!d.current.txCount && !d.previous.txCount) return 'No indexed activity was found in either 30-day window.';
    const parts=[];
    if(d.txTrend === null) parts.push(`Activity restarted with ${d.current.txCount} transaction${d.current.txCount===1?'':'s'} after a quiet previous window.`);
    else if(d.txTrend > 20) parts.push(`Transaction activity accelerated ${Math.round(d.txTrend)}% versus the previous 30 days.`);
    else if(d.txTrend < -20) parts.push(`Transaction activity cooled ${Math.abs(Math.round(d.txTrend))}% versus the previous 30 days.`);
    else parts.push('Transaction activity stayed broadly stable versus the previous 30 days.');

    if(d.newApps.length) parts.push(`The wallet discovered ${d.newApps.length} new contract destination${d.newApps.length===1?'':'s'}.`);
    if(d.revisitedApps.length) parts.push(`It returned to ${d.revisitedApps.length} previously used destination${d.revisitedApps.length===1?'':'s'}.`);
    if(d.current.activeDays > d.previous.activeDays) parts.push(`Activity spread across ${d.current.activeDays-d.previous.activeDays} more active day${d.current.activeDays-d.previous.activeDays===1?'':'s'}.`);
    else if(d.current.activeDays < d.previous.activeDays) parts.push(`Activity was concentrated into ${d.previous.activeDays-d.current.activeDays} fewer active day${d.previous.activeDays-d.current.activeDays===1?'':'s'}.`);
    return parts.join(' ');
  }

  function ensureUI(){
    if(document.getElementById('behaviorDelta')) return;
    const fingerprint = document.querySelector('.fingerprint-card');
    if(!fingerprint) return;
    const section = document.createElement('article');
    section.id='behaviorDelta';
    section.className='card section-card behavior-delta-card';
    section.innerHTML=`
      <div class="card-head">
        <div><div class="eyebrow">WALLET BEHAVIOR DELTA</div><h3>What changed in the last 30 days?</h3></div>
        <span class="badge">30d vs previous 30d</span>
      </div>
      <p class="section-intro">A time-aware comparison of public Base activity. This describes behavior change; it is not an eligibility, reward, reputation, credit or risk score.</p>
      <div id="deltaSummary" class="delta-summary">Waiting for wallet data…</div>
      <div class="delta-grid">
        <div class="delta-stat"><span>Transactions</span><strong id="deltaTx">—</strong><small id="deltaTxTrend">—</small></div>
        <div class="delta-stat"><span>Active days</span><strong id="deltaDays">—</strong><small id="deltaDaysTrend">—</small></div>
        <div class="delta-stat"><span>Apps / contracts</span><strong id="deltaApps">—</strong><small id="deltaAppsTrend">—</small></div>
        <div class="delta-stat"><span>Gas spent</span><strong id="deltaGas">—</strong><small id="deltaGasTrend">—</small></div>
        <div class="delta-stat"><span>New apps discovered</span><strong id="deltaNewApps">—</strong><small>Not seen before this 30d window</small></div>
        <div class="delta-stat"><span>Apps revisited</span><strong id="deltaRevisited">—</strong><small>Used now and earlier in Base history</small></div>
      </div>
      <div class="delta-apps">
        <div><div class="eyebrow">NEW RELATIONSHIPS</div><div id="deltaNewList" class="delta-chip-list"></div></div>
        <div><div class="eyebrow">RETURNING RELATIONSHIPS</div><div id="deltaReturnList" class="delta-chip-list"></div></div>
      </div>`;
    fingerprint.insertAdjacentElement('afterend',section);

    const style=document.createElement('style');
    style.textContent=`
      .behavior-delta-card{background:radial-gradient(circle at 12% 0,rgba(79,140,255,.13),transparent 34%),linear-gradient(180deg,rgba(17,26,42,.98),rgba(9,14,24,.98))}
      .delta-summary{margin-top:18px;padding:15px 16px;border:1px solid #24416b;border-radius:14px;background:#09172b;color:#c7d8f3;line-height:1.55;font-size:14px}
      .delta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
      .delta-stat{background:#080d16;border:1px solid #19243a;border-radius:14px;padding:14px}
      .delta-stat span{display:block;color:#9facbf;font-size:12px}.delta-stat strong{display:block;font-size:24px;margin:7px 0 4px}.delta-stat small{color:#718096;font-size:11px}
      .delta-trend-up{color:#4ade80!important}.delta-trend-down{color:#fb7185!important}.delta-trend-flat{color:#94a3b8!important}
      .delta-apps{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;padding-top:18px;border-top:1px solid #18243a}
      .delta-chip-list{display:flex;flex-wrap:wrap;gap:7px}.delta-chip{font:600 11px ui-monospace,monospace;text-decoration:none;color:#bcd3ff;border:1px solid #29476f;background:#0a1830;border-radius:999px;padding:7px 9px}
      .delta-empty{color:#738196;font-size:12px}
      @media(max-width:850px){.delta-grid{grid-template-columns:repeat(2,1fr)}.delta-apps{grid-template-columns:1fr}}
      @media(max-width:560px){.delta-grid{grid-template-columns:1fr 1fr}.delta-stat strong{font-size:21px}}
    `;
    document.head.appendChild(style);
  }

  function setTrend(id,value){
    const el=document.getElementById(id);
    if(!el) return;
    el.textContent=`vs previous 30d: ${trendText(value)}`;
    el.className=value===null||value>0.5?'delta-trend-up':value<-0.5?'delta-trend-down':'delta-trend-flat';
  }

  function renderList(id,items){
    const root=document.getElementById(id);
    if(!root) return;
    root.innerHTML='';
    if(!items.length){ root.innerHTML='<span class="delta-empty">None detected in this window.</span>'; return; }
    items.slice(0,8).forEach(address=>{
      const a=document.createElement('a');
      a.className='delta-chip';
      a.href=`https://base.blockscout.com/address/${encodeURIComponent(address)}`;
      a.target='_blank'; a.rel='noreferrer';
      a.textContent=`${address.slice(0,8)}…${address.slice(-6)}`;
      root.appendChild(a);
    });
  }

  function render(){
    ensureUI();
    if(typeof state === 'undefined' || !Array.isArray(state.txs)) return;
    const d=buildDelta(state.txs);
    const byId=id=>document.getElementById(id);
    if(!byId('behaviorDelta')) return;
    byId('deltaSummary').textContent=buildSummary(d);
    byId('deltaTx').textContent=d.current.txCount.toLocaleString();
    byId('deltaDays').textContent=d.current.activeDays.toLocaleString();
    byId('deltaApps').textContent=d.current.uniqueContracts.toLocaleString();
    byId('deltaGas').textContent=`${d.current.gasEth.toFixed(d.current.gasEth<0.01?5:3)} ETH`;
    byId('deltaNewApps').textContent=d.newApps.length.toLocaleString();
    byId('deltaRevisited').textContent=d.revisitedApps.length.toLocaleString();
    setTrend('deltaTxTrend',d.txTrend); setTrend('deltaDaysTrend',d.dayTrend); setTrend('deltaAppsTrend',d.contractTrend); setTrend('deltaGasTrend',d.gasTrend);
    renderList('deltaNewList',d.newApps); renderList('deltaReturnList',d.revisitedApps);
  }

  function init(){
    ensureUI();
    const dashboard=document.getElementById('dashboard');
    if(!dashboard) return;
    const observer=new MutationObserver(()=>{ if(!dashboard.classList.contains('hidden')) render(); });
    observer.observe(dashboard,{attributes:true,attributeFilter:['class']});
    const status=document.getElementById('status');
    if(status) new MutationObserver(()=>{ if(!dashboard.classList.contains('hidden')) render(); }).observe(status,{childList:true,subtree:true});
    if(!dashboard.classList.contains('hidden')) render();
  }

  globalThis.BaseBehaviorDelta={buildDelta,summarizeWindow,txTimestamp,contractAddress};
  if(typeof document!=='undefined') init();
})();
