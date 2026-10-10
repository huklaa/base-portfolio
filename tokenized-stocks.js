(function(){
  'use strict';
  const API='https://api.coinbase.com/v1/tokenized-stocks';
  const FALLBACK=[["NVDAc","78ee7ce2fE4908108C"],["METAc","8bC8786B856E61707C"],["AAPLc","C2e324d24d7eEcd1fb"],["GOOGLc","2D0BA3164cc74f58B7"],["AMZNc","d9192b6B456483C2E8"],["MSFTc","Ab99cFa739E253872B"],["MSTRc","4884b426556b92883d"],["SNDKc","397293Cb8cda9a10c5"],["SPCXc","7b9fcbd005511aCBd5"],["TSLAc","1e800a7f5189430cD0"]];
  const fallbackRegistry=()=>new Map(FALLBACK.map(([symbol,suffix])=>{const contract_address='0xb200000000000000000000'+suffix;return [contract_address.toLowerCase(),{symbol,name:symbol,contract_address}]}));
  const dashboard=document.getElementById('dashboard');
  if(!dashboard) return;
  const card=document.createElement('article');
  card.className='card section-card'; card.id='tokenizedStocksPanel';
  card.innerHTML='<div class="card-head"><div><div class="eyebrow">BASE REAL-WORLD ASSETS</div><h3>Tokenized stocks & DeFi exposure</h3></div><span class="badge" id="stocksCount">Read-only</span></div><p class="section-intro">Issuer-verified B20 token balances and indicative reference values. No wallet connection, trading or eligibility inference. DeFi protocol deposits and debt require separate verified position data; ordinary wallet balances are not proof of a lending position.</p><div id="stocksNotice" class="empty" role="status">Loading issuer token registry…</div><div id="stocksPositions" class="token-list"></div><div id="stocksDefiNotice" class="section-intro">Morpho positions are shown separately below. Other DeFi protocols, lending APY and liquidation risk are not covered.</div><p class="section-intro"><a href="https://www.base.org/stocks" target="_blank" rel="noopener noreferrer">Verified Base stock assets ↗</a> · <a href="https://www.coinbase.com/tokenize" target="_blank" rel="noopener noreferrer">Issuer terms and eligibility ↗</a></p>';
  const allocation=dashboard.querySelector('.two-col');
  if(allocation) allocation.insertAdjacentElement('afterend',card);
  else dashboard.appendChild(card);
  const note=card.querySelector('#stocksNotice');
  const root=card.querySelector('#stocksPositions');
  const count=card.querySelector('#stocksCount');
  let registry=null, registryFailure='', renderId=0;
  const validAddress=a=>/^0x[0-9a-fA-F]{40}$/.test(String(a||''));
  const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:6});
  function render(){
    if(typeof state==='undefined'||!state.address) return;
    const myId=++renderId;
    root.replaceChildren();
    if(!registry){note.textContent=registryFailure||'Fetching verified token registry…';count.textContent=registryFailure?'Registry unavailable':'Registry pending';return;}
    const positions=(state.portfolio||[]).filter(t=>validAddress(t.address)).map(t=>({holding:t,token:registry.get(t.address.toLowerCase())})).filter(x=>x.token);
    count.textContent=positions.length+' B20 assets';
    if(!positions.length){ note.textContent='No verified Coinbase tokenized-stock wallet balances detected in the explorer response.'; return;}
    note.textContent=registryFailure?'Matched against a dated Base contract list. Live price and issuance status unavailable.':'Issuer-matched balances only. Reference values are indicative, not executable trade quotes.';
    for(const {holding,token} of positions){
      if(myId!==renderId)return;
      const item=document.createElement('div');item.className='token-row';
      const left=document.createElement('div');left.className='token-name';
      const title=document.createElement('strong');title.textContent=String(token.symbol||holding.symbol||'Stock');
      const details=document.createElement('small');details.textContent=String(token.name||holding.name||'Verified token')+' · '+fmt(holding.amount)+' tokens';
      left.append(title,details);
      const right=document.createElement('div');right.className='token-value';
      const price=Number(token.nav_price);const updated=Date.parse(token.nav_price_updated_at||'');
      const hours=Number.isFinite(updated)?(Date.now()-updated)/3600000:Infinity;
      const fresh=hours>=0&&hours<=24&&token.nav_price!=null;
      if(!registryFailure&&Number.isFinite(price)&&price>0&&fresh){
        const value=document.createElement('strong');value.textContent='≈ $'+fmt(holding.amount*price);
        const caption=document.createElement('small');caption.textContent='Indicative feed NAV · '+new Date(updated).toLocaleString();
        right.append(value,caption);
      }else{
        right.textContent='Value unavailable';
        const explanation=document.createElement('small');explanation.textContent='NAV missing or older than 24h';right.appendChild(explanation);
      }
      const link=document.createElement('a');link.href='https://base.blockscout.com/token/'+holding.address;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Contract ↗';link.className='text-link';
      item.append(left,right,link);root.appendChild(item);
    }
  }
  async function loadRegistry(){
    try{
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);
      let response;
      try{response=await fetch(API,{signal:controller.signal,headers:{Accept:'application/json'}});}
      finally{clearTimeout(timer);}
      if(!response.ok)throw new Error('HTTP '+response.status);
      const payload=await response.json();
      if(!Array.isArray(payload.tokens))throw new Error('Unexpected registry format');
      registry=new Map(payload.tokens.filter(t=>validAddress(t.contract_address)).map(t=>[t.contract_address.toLowerCase(),t]));
      registryFailure='';
    }catch(e){registryFailure='Issuer registry unavailable ('+String(e.message||'network error')+'). Using a dated Base contract snapshot; no live prices.';registry=fallbackRegistry();}
    render();
  }
  // The core explorer reveals its results by removing dashboard.hidden after analysis.
  new MutationObserver(()=>{if(!dashboard.classList.contains('hidden'))render();}).observe(dashboard,{attributes:true,attributeFilter:['class']});
  // Rerender after subsequent address changes even if dashboard is already visible.
  const analyzeBtn=document.getElementById('analyzeBtn');
  if(analyzeBtn) new MutationObserver(()=>{if(!analyzeBtn.disabled && !dashboard.classList.contains('hidden'))render();}).observe(analyzeBtn,{attributes:true,attributeFilter:['disabled']});
  loadRegistry();
})();