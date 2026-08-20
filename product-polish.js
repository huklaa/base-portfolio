(function(){
  const STORAGE_KEY='basePortfolioRecentAddresses';
  const MAX_RECENT=5;
  const ADDRESS_RE=/^0x[a-fA-F0-9]{40}$/;

  function readRecent(storage=globalThis.localStorage){
    try{
      const raw=JSON.parse(storage.getItem(STORAGE_KEY)||'[]');
      return Array.isArray(raw)?raw.filter(x=>ADDRESS_RE.test(String(x))).slice(0,MAX_RECENT):[];
    }catch{return []}
  }
  function saveRecent(address,storage=globalThis.localStorage){
    if(!ADDRESS_RE.test(String(address)))return readRecent(storage);
    const next=[address,...readRecent(storage).filter(x=>x.toLowerCase()!==String(address).toLowerCase())].slice(0,MAX_RECENT);
    try{storage.setItem(STORAGE_KEY,JSON.stringify(next))}catch{}
    return next;
  }
  function shortAddress(a){return `${a.slice(0,8)}…${a.slice(-6)}`}
  function ensureRecentUI(){
    const panel=document.querySelector('.search-panel');
    if(!panel||document.getElementById('recentAnalyses'))return;
    const wrap=document.createElement('div');wrap.id='recentAnalyses';wrap.className='recent-analyses';wrap.setAttribute('aria-label','Recently analyzed addresses');
    wrap.innerHTML='<div class="recent-head"><span>Recent analyses</span><button id="clearRecentAnalyses" class="link-button" type="button">Clear</button></div><div id="recentAnalysisList" class="recent-list"></div>';
    panel.appendChild(wrap);
    document.getElementById('clearRecentAnalyses')?.addEventListener('click',()=>{try{localStorage.removeItem(STORAGE_KEY)}catch{}renderRecent()});
  }
  function renderRecent(){
    ensureRecentUI();const root=document.getElementById('recentAnalysisList');if(!root)return;
    const rows=readRecent();root.innerHTML='';
    document.getElementById('recentAnalyses')?.classList.toggle('hidden',rows.length===0);
    rows.forEach(address=>{const b=document.createElement('button');b.type='button';b.className='recent-address';b.textContent=shortAddress(address);b.title=address;b.addEventListener('click',()=>{const input=document.getElementById('addressInput');if(input){input.value=address;input.focus()}document.getElementById('analyzeBtn')?.click()});root.appendChild(b)});
  }
  function clarifyEmptyStates(){
    const apiIssue=globalThis.BaseApiResilience?.last;
    const map={
      tokenBreakdown:'No fungible token balances were found in the fetched public indexer data.',
      recentActivity:'No recent Base transactions were found in the fetched public indexer data.',
      nftGrid:'No Base NFTs were found in the fetched public indexer data.',
      appRelationships:'No contract relationships were found in the fetched public indexer data.'
    };
    Object.entries(map).forEach(([id,text])=>{
      const root=document.getElementById(id);if(!root)return;
      const empty=root.querySelector('.empty');if(!empty)return;
      empty.textContent=apiIssue?`${text} Explorer availability is currently partial; see the status message above.`:text;
    });
  }
  function setBusyFromStatus(){
    const status=document.getElementById('status'),button=document.getElementById('analyzeBtn'),input=document.getElementById('addressInput');if(!status||!button)return;
    const busy=/Reading public Base data/i.test(status.textContent||'');
    button.setAttribute('aria-busy',String(busy));
    input?.setAttribute('aria-busy',String(busy));
  }
  function focusSharedProfile(){
    const params=new URLSearchParams(location.search);if(!params.has('address'))return;
    const target=document.querySelector('.fingerprint-card')||document.getElementById('dashboard');if(!target)return;
    target.setAttribute('tabindex','-1');
    setTimeout(()=>{target.scrollIntoView({behavior:'smooth',block:'start'});target.focus({preventScroll:true})},120);
  }
  function onStatusChange(){
    setBusyFromStatus();
    const status=document.getElementById('status');
    if(/Loaded public Base data for/i.test(status?.textContent||'')&&typeof state!=='undefined'&&ADDRESS_RE.test(state.address||'')){
      saveRecent(state.address);renderRecent();clarifyEmptyStates();focusSharedProfile();
    }
  }
  function init(){
    ensureRecentUI();renderRecent();
    const status=document.getElementById('status');if(status)new MutationObserver(onStatusChange).observe(status,{childList:true,subtree:true});
    const dashboard=document.getElementById('dashboard');if(dashboard)new MutationObserver(()=>{if(!dashboard.classList.contains('hidden'))clarifyEmptyStates()}).observe(dashboard,{attributes:true,attributeFilter:['class']});
  }
  globalThis.BaseProductPolish={STORAGE_KEY,MAX_RECENT,readRecent,saveRecent};
  if(typeof document!=='undefined')init();
})();
