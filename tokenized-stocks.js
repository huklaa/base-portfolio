(function(){
  'use strict';
  const API=typeof location!=='undefined'&&location.hostname.endsWith('github.io')?'https://api.coinbase.com/v1/tokenized-stocks':'/api/tokenized-stocks';
  const FALLBACK=[["NVDAc","78ee7ce2fE4908108C"],["METAc","8bC8786B856E61707C"],["AAPLc","C2e324d24d7eEcd1fb"],["GOOGLc","2D0BA3164cc74f58B7"],["AMZNc","d9192b6B456483C2E8"],["MSFTc","Ab99cFa739E253872B"],["MSTRc","4884b426556b92883d"],["SNDKc","397293Cb8cda9a10c5"],["SPCXc","7b9fcbd005511aCBd5"],["TSLAc","1e800a7f5189430cD0"]];
  const fallbackRegistry=()=>new Map(FALLBACK.map(([symbol,suffix])=>{const contract_address='0xb200000000000000000000'+suffix;return [contract_address.toLowerCase(),{symbol,name:symbol,contract_address}]}));
  // Source: https://www.base.org/stocks, checked 2026-10-10.
  function validatedRegistry(payload){
    if(!Array.isArray(payload?.tokens)||!payload.tokens.length)throw Error('Empty issuer registry');
    const result=fallbackRegistry(), symbols=new Map([...result.values()].map(t=>[t.symbol,t.contract_address.toLowerCase()]));
    for(const token of payload.tokens){
      const address=token?.contract_address?.toLowerCase();
      if(!/^0x[0-9a-f]{40}$/.test(address||'')||typeof token.symbol!=='string'||!Number.isInteger(token.decimals)||token.decimals<0||token.decimals>36)throw Error('Invalid issuer asset');
      if(symbols.has(token.symbol)&&symbols.get(token.symbol)!==address)throw Error('Issuer contract mismatch');
      const known=result.get(address);if(known&&known.symbol!==token.symbol)throw Error('Issuer symbol mismatch');
      result.set(address,token);
    }
    return result;
  }
  function nav(token,now=Date.now()){
    const price=token.nav_price,stamp=Date.parse(token.nav_price_updated_at||'');
    if(typeof price!=='number'||!Number.isFinite(price)||price<=0||!Number.isFinite(stamp)||stamp>now||now-stamp>86400000||token.is_live!==true||token.redeem_paused!==false)return null;
    return {price,stamp};
  }
  function holdings(tokens,registry){
    if(!Array.isArray(tokens))throw Error('Wallet token data unavailable');
    return tokens.flatMap(item=>{
      const token=registry.get(String(item.token?.address_hash||'').toLowerCase());if(!token)return [];
      const decimals=token.decimals??8; // Official B20 assets use 8 decimals.
      if((typeof item.value==='number'&&!Number.isSafeInteger(item.value))||!/^\d+$/.test(String(item.value))||Number(item.token.decimals)!==decimals)throw Error('Stock balance or decimals mismatch');
      const raw=BigInt(item.value);if(raw===0n)return [];
      const padded=raw.toString().padStart(decimals+1,'0');
      const amount=decimals?padded.slice(0,-decimals)+'.'+padded.slice(-decimals):padded;
      return [{token,holding:{address:token.contract_address,amount}}];
    });
  }
  if(typeof module!=='undefined')module.exports={fallbackRegistry,validatedRegistry,nav,holdings};
  if(typeof document==='undefined')return;
  globalThis.BaseStockContracts=fallbackRegistry();
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
  const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:6});
  function render(){
    if(typeof state==='undefined'||!state.address) return;
    const myId=++renderId;
    root.replaceChildren();
    if(!registry){note.textContent=registryFailure||'Fetching verified token registry…';count.textContent=registryFailure?'Registry unavailable':'Registry pending';return;}
    let positions;
    try{if(state.tokenDataAvailable===false)throw Error('Wallet token API unavailable');positions=holdings(state.tokens,registry);}catch(e){note.textContent=e.message+'. No balances inferred.';count.textContent='Data unavailable';return;}
    count.textContent=positions.length+' B20 assets';
    if(!positions.length){ note.textContent='No verified Coinbase tokenized-stock wallet balances detected in the explorer response.'+(registryFailure?' Registry coverage is limited to the 2026-10-10 Base snapshot.':''); return;}
    note.textContent=registryFailure?'Matched against a dated Base contract list. Live price and issuance status unavailable.':'Issuer-matched balances only. Reference values are indicative, not executable trade quotes.';
    for(const {holding,token} of positions){
      if(myId!==renderId)return;
      const item=document.createElement('div');item.className='token-row';
      const left=document.createElement('div');left.className='token-name';
      const title=document.createElement('strong');title.textContent=String(token.symbol||holding.symbol||'Stock');
      const details=document.createElement('small');details.textContent=String(token.name||holding.name||'Verified token')+' · '+holding.amount+' tokens';
      left.append(title,details);
      const right=document.createElement('div');right.className='token-value';
      const quote=registryFailure?null:nav(token);
      if(quote){
        const value=document.createElement('strong');value.textContent='≈ $'+fmt(Number(holding.amount)*quote.price);
        const caption=document.createElement('small');caption.textContent='Indicative feed NAV · '+new Date(quote.stamp).toLocaleString();
        right.append(value,caption);
      }else{
        right.textContent='Value unavailable';
        const explanation=document.createElement('small');explanation.textContent='NAV missing, stale or issuance status unavailable';right.appendChild(explanation);
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
      registry=validatedRegistry(payload);
      registryFailure='';
      globalThis.BaseStockContracts=registry;
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