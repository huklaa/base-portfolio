(function(){
  'use strict';
  const API='https://api.coinbase.com/v1/tokenized-stocks';
  const dashboard=document.getElementById('dashboard');
  if(!dashboard) return;
  const card=document.createElement('article');
  card.className='card section-card'; card.id='tokenizedStocksPanel';
  card.innerHTML='<div class="card-head"><div><div class="eyebrow">BASE REAL-WORLD ASSETS</div><h3>Tokenized stocks & DeFi exposure</h3></div><span class="badge" id="stocksCount">Read-only</span></div><p class="section-intro">Issuer-verified B20 token balances and indicative reference values. No wallet connection, trading or eligibility inference. DeFi protocol deposits and debt require separate verified position data; ordinary wallet balances are not proof of a lending position.</p><div id="stocksNotice" class="empty" role="status">Loading issuer token registry…</div><div id="stocksPositions" class="token-list"></div><div id="stocksDefiNotice" class="section-intro">DeFi position coverage: not indexed yet. Collateral, debt, lending APY and liquidation risk are excluded rather than estimated.</div><p class="section-intro"><a href="https://www.base.org/stocks" target="_blank" rel="noopener noreferrer">Verified Base stock assets ↗</a> · <a href="https://www.coinbase.com/tokenize" target="_blank" rel="noopener noreferrer">Issuer terms and eligibility ↗</a></p>';
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
    if(!registry){note.textContent=registryFailure||'Fetching verified token registry…';count.textContent='Registry pending';return;}
    const positions=(state.portfolio||[]).filter(t=>validAddress(t.address)).map(t=>({holding:t,token:registry.get(t.address.toLowerCase())})).filter(x=>x.token);
    count.textContent=positions.length+' B20 assets';
    if(!positions.length){ note.textContent='No verified Coinbase tokenized-stock wallet balances detected in the explorer response.'; return;}
    note.textContent='Issuer-matched balances only. Reference values are indicative, not executable trade quotes.';
    for(const {holding,token} of positions){
      if(myId!==renderId)return;
      const item=document.createElement('div');item.className='token-row';
      const left=document.createElement('div');left.className='token-name';
      const title=document.createElement('strong');title.textContent=String(token.symbol||holding.symbol||'Stock');
      const details=document.createElement('small');details.textContent=String(token.name||holding.name||'Verified token')+' · '+fmt(holding.amount)+' tokens';
      left.append(title,details);
      const right=document.createElement('div');right.className='token-value';
      const price=Number(token.nav_price)*Number(token.multiplier);const updated=Date.parse(token.nav_price_updated_at||'');
      const hours=Number.isFinite(updated)?(Date.now()-updated)/3600000:Infinity;
      const fresh=hours>=0&&hours<=24&&Number(token.multiplier)>0;
      if(Number.isFinite(price)&&price>0&&fresh){
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
    }catch(e){registryFailure='Issuer registry unavailable ('+String(e.message||'network error')+'). Stock classifications are hidden rather than guessed.';}
    render();
  }
  // The core explorer reveals its results by removing dashboard.hidden after analysis.
  new MutationObserver(()=>{if(!dashboard.classList.contains('hidden'))render();}).observe(dashboard,{attributes:true,attributeFilter:['class']});
  // Rerender after subsequent address changes even if dashboard is already visible.
  const analyzeBtn=document.getElementById('analyzeBtn');
  if(analyzeBtn) new MutationObserver(()=>{if(!analyzeBtn.disabled && !dashboard.classList.contains('hidden'))render();}).observe(analyzeBtn,{attributes:true,attributeFilter:['disabled']});
  loadRegistry();
})();