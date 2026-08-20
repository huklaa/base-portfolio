(function(){
  const FILTERS=['All','Transfer','Swap','NFT','Contract interaction'];

  function matchesFilter(tx,filter){
    if(!filter||filter==='All') return true;
    const type=typeof classifyTx==='function'?classifyTx(tx):'';
    if(filter==='Transfer') return type==='Transfer';
    if(filter==='Swap') return type==='Swap';
    if(filter==='NFT') return String(type).toLowerCase().includes('nft');
    if(filter==='Contract interaction') return type==='Contract interaction'||type==='Approval';
    return false;
  }

  function renderFiltered(filter){
    if(typeof state==='undefined'||!Array.isArray(state.recent)) return;
    const root=document.getElementById('recentActivity');
    if(!root) return;
    root.innerHTML='';
    const rows=state.recent.filter(tx=>matchesFilter(tx,filter));
    if(!rows.length){
      root.innerHTML=`<div class="empty">No recent transactions matching "${escapeHtml(filter)}".</div>`;
      return;
    }
    for(const tx of rows){
      const type=classifyTx(tx);
      const target=tx.to?.name||tx.to?.ens_domain_name||short(tx.to?.hash||'');
      const method=tx.method||target||'Transaction';
      const row=document.createElement('div');
      row.className='activity-row';
      row.innerHTML=`<div class="activity-type">${escapeHtml(type)}</div><div class="activity-method">${escapeHtml(method)}${target&&target!==method?` · ${escapeHtml(target)}`:''}</div><div class="activity-date">${escapeHtml(dateTimeText(tx.timestamp))}</div><a class="tx-link" href="${BLOCKSCOUT}/tx/${encodeURIComponent(tx.hash)}" target="_blank" rel="noreferrer">View TX ↗</a>`;
      root.appendChild(row);
    }
  }

  function ensureStyles(){
    if(document.getElementById('activityFilterStyles')) return;
    const style=document.createElement('style');
    style.id='activityFilterStyles';
    style.textContent='.activity-filters{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.filter-btn{background:#080d16;border:1px solid #1f2d44;border-radius:999px;color:#94a3b8;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s ease}.filter-btn:hover{border-color:#3b82f6;color:#f6f8fb}.filter-btn.active{background:#155eef;border-color:#276cff;color:#fff}';
    document.head.appendChild(style);
  }

  function init(){
    ensureStyles();
    const root=document.getElementById('activityFilters');
    if(!root) return;
    let current='All';
    root.addEventListener('click',event=>{
      const button=event.target.closest('.filter-btn');
      if(!button) return;
      current=button.dataset.filter||'All';
      root.querySelectorAll('.filter-btn').forEach(x=>x.classList.toggle('active',x===button));
      renderFiltered(current);
    });
    const status=document.getElementById('status');
    if(status){
      new MutationObserver(()=>{
        if(current!=='All'&&document.getElementById('dashboard')&&!document.getElementById('dashboard').classList.contains('hidden')) renderFiltered(current);
      }).observe(status,{childList:true,subtree:true});
    }
  }

  globalThis.BaseActivityFilter={FILTERS,matchesFilter,renderFiltered};
  if(typeof document!=='undefined') init();
})();
