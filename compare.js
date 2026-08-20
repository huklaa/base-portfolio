(function(){
  const BLOCKSCOUT='https://base.blockscout.com';
  const ADDRESS_RE=/^0x[a-fA-F0-9]{40}$/;
  function summarizeTxs(txs){
    const rows=Array.isArray(txs)?txs:[];const days=new Set(),contracts=new Set();
    for(const tx of rows){
      if(tx?.timeStamp)days.add(new Date(Number(tx.timeStamp)*1000).toISOString().slice(0,10));
      if(tx?.to&&tx?.input&&tx.input!=='0x')contracts.add(String(tx.to).toLowerCase());
    }
    return {transactions:rows.length,activeDays:days.size,contracts:contracts.size,firstSeen:rows[0]?.timeStamp?Number(rows[0].timeStamp):0};
  }
  async function fetchSummary(address){
    const url=`${BLOCKSCOUT}/api?module=account&action=txlist&address=${encodeURIComponent(address)}&startblock=0&endblock=99999999&sort=asc&page=1&offset=10000`;
    const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`Explorer ${r.status}`);
    const j=await r.json();return summarizeTxs(Array.isArray(j.result)?j.result:[]);
  }
  function short(a){return `${a.slice(0,8)}…${a.slice(-6)}`}
  function ensureUI(){
    const search=document.querySelector('.search-panel');if(!search||document.getElementById('comparePanel'))return;
    const section=document.createElement('section');section.id='comparePanel';section.className='compare-panel card';section.setAttribute('aria-labelledby','compareTitle');
    section.innerHTML='<div class="card-head"><div><div class="eyebrow">COMPARE</div><h3 id="compareTitle">Compare two Base addresses</h3></div><span class="badge">Read-only</span></div><p class="section-intro">Compare indexed activity side by side. This is descriptive public-chain data, not a score, credit, risk, reward or eligibility signal.</p><div class="compare-inputs"><label>Address A<input id="compareA" autocomplete="off" spellcheck="false" placeholder="0x…"></label><label>Address B<input id="compareB" autocomplete="off" spellcheck="false" placeholder="0x…"></label><button id="compareBtn" class="primary" type="button">Compare</button></div><div id="compareStatus" class="status" role="status" aria-live="polite">Enter two public Base addresses.</div><div id="compareResults" class="compare-results hidden"></div>';
    search.insertAdjacentElement('afterend',section);
    document.getElementById('compareBtn')?.addEventListener('click',compare);
  }
  function metric(label,a,b,format=v=>String(v)){
    return `<div class="compare-row"><span>${label}</span><strong>${format(a)}</strong><strong>${format(b)}</strong></div>`;
  }
  async function compare(){
    const a=document.getElementById('compareA')?.value.trim()||'',b=document.getElementById('compareB')?.value.trim()||'',status=document.getElementById('compareStatus'),root=document.getElementById('compareResults'),btn=document.getElementById('compareBtn');
    if(!ADDRESS_RE.test(a)||!ADDRESS_RE.test(b)){status.textContent='Enter two valid 0x addresses.';status.classList.add('error');return}
    status.classList.remove('error');status.textContent='Reading indexed Base activity for both addresses…';btn.disabled=true;btn.setAttribute('aria-busy','true');
    try{
      const [sa,sb]=await Promise.all([fetchSummary(a),fetchSummary(b)]);
      root.innerHTML=`<div class="compare-head"><span>Metric</span><strong title="${a}">${short(a)}</strong><strong title="${b}">${short(b)}</strong></div>${metric('Transactions',sa.transactions,sb.transactions,v=>v>=10000?'10,000+':v.toLocaleString())}${metric('Active days',sa.activeDays,sb.activeDays,v=>v.toLocaleString())}${metric('Contract destinations',sa.contracts,sb.contracts,v=>v.toLocaleString())}${metric('First indexed activity',sa.firstSeen,sb.firstSeen,v=>v?new Date(v*1000).toLocaleDateString():'—')}`;
      root.classList.remove('hidden');status.textContent='Comparison loaded from public Base explorer data.';
    }catch(e){root.classList.add('hidden');status.textContent=`Comparison unavailable: ${e.message||'explorer error'}`;status.classList.add('error')}
    finally{btn.disabled=false;btn.setAttribute('aria-busy','false')}
  }
  function init(){ensureUI()}
  globalThis.BaseCompare={summarizeTxs,fetchSummary};
  if(typeof document!=='undefined')init();
})();
