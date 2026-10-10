(function(){
  'use strict';
  const QUERY='query ($address:String!){userByAddress(address:$address,chainId:8453){marketPositions{market{marketId collateralAsset{address symbol decimals} loanAsset{address symbol decimals}} state{collateral collateralUsd borrowAssets borrowAssetsUsd supplyAssets supplyAssetsUsd}} vaultPositions{vault{address name asset{address symbol decimals}} state{assets assetsUsd shares}} vaultV2Positions{vault{address name asset{address symbol decimals}} assets assetsUsd shares}}}';
  function parseResponse(text){
    return JSON.parse(text.replace(/"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,token=>{
      if(/^-?\d+$/.test(token)&&!Number.isSafeInteger(Number(token)))return JSON.stringify(token);
      return token;
    }));
  }
  function units(raw, decimals){
    if((typeof raw==='number'&&!Number.isSafeInteger(raw))||!/^\d+$/.test(String(raw))||!Number.isInteger(decimals)||decimals<0||decimals>36)throw Error('Invalid asset amount or decimals');
    const s=BigInt(raw).toString().padStart(decimals+1,'0');
    return decimals?(s.slice(0,-decimals)+'.'+s.slice(-decimals)).replace(/\.?0+$/,''):s;
  }
  function normalize(payload, registry=new Map()){
    if(!payload||payload.errors?.length||!payload.data||!Object.hasOwn(payload.data,'userByAddress'))throw Error('Incomplete GraphQL response');
    const u=payload.data.userByAddress;if(u===null)return [];
    if(!u||!['marketPositions','vaultPositions','vaultV2Positions'].every(k=>Array.isArray(u[k])))throw Error('Incomplete positions');
    const rows=[];
    function add(type,asset,raw,value,label){
      if(raw==null)throw Error('Position amount unavailable');
      if((typeof raw==='number'&&!Number.isSafeInteger(raw))||!/^\d+$/.test(String(raw)))throw Error('Invalid asset amount');
      if(BigInt(raw)===0n)return;
      const amount=units(raw,asset?.decimals);
      if(!/^0x[0-9a-f]{40}$/i.test(asset?.address||''))throw Error('Invalid asset contract');
      const token=registry.get(asset.address.toLowerCase());
      const usd=value!==null&&value!==undefined&&typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
      rows.push({type,asset:label?label+' · '+(token?.symbol||asset.symbol):token?.symbol||asset.symbol,displayAmount:amount,value:usd,verified:!!token});
    }
    for(const p of u.marketPositions){
      if(!p.state)throw Error('Market state unavailable');
      add('Collateral',p.market?.collateralAsset,p.state.collateral,p.state.collateralUsd);
      add('Borrowed',p.market?.loanAsset,p.state.borrowAssets,p.state.borrowAssetsUsd);
      add('Supplied',p.market?.loanAsset,p.state.supplyAssets,p.state.supplyAssetsUsd);
    }
    for(const p of u.vaultPositions){if(!p.state)throw Error('Vault state unavailable');add('Vault deposit',p.vault?.asset,p.state.assets,p.state.assetsUsd,p.vault?.name);}
    for(const p of u.vaultV2Positions)add('Vault deposit',p.vault?.asset,p.assets,p.assetsUsd,p.vault?.name);
    return rows;
  }
  if(typeof module!=='undefined')module.exports={QUERY,units,normalize,parseResponse};
  if(typeof document==='undefined')return;
  const dashboard=document.getElementById('dashboard');
  if(!dashboard)return;
  const section=document.createElement('article');
  section.className='card section-card';
  section.innerHTML='<div class="card-head"><div><div class="eyebrow">BASE DEFI</div><h3>Verified Morpho positions</h3></div><span class="badge">Read-only</span></div><p class="section-intro">Collateral, borrowing and deposits indexed by Morpho on Base. Other protocols are not included.</p><div id="morphoPositions" class="token-list" role="status">Analyze a wallet to load positions.</div>';
  const stock=document.getElementById('tokenizedStocksPanel');
  if(stock)stock.after(section);else dashboard.appendChild(section);
  const out=section.querySelector('#morphoPositions');
  let last='', request=0;
  async function load(){
    const address=typeof state==='undefined'?'':state.address;
    if((typeof state!=='undefined'&&state.loading)||!/^0x[a-fA-F0-9]{40}$/.test(address)||address===last)return;
    last=address;const ticket=++request;
    out.textContent='Loading Morpho positions…';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch('https://api.morpho.org/graphql',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({query:QUERY,variables:{address}})});
      if(!response.ok)throw Error('API '+response.status);
      const data=parseResponse(await response.text());
      if(data.errors?.length)throw Error('API query unavailable');
      if(ticket!==request)return;
      const rows=normalize(data,globalThis.BaseStockContracts||new Map());
      out.replaceChildren();
      if(!rows.length){out.textContent='No Morpho positions reported for this address. Other DeFi protocols are not checked.';return;}
      for(const p of rows){
        const el=document.createElement('div');el.className='token-row';
        const title=document.createElement('strong');title.textContent=p.type+' · '+(p.asset||'Unknown asset')+(p.verified?' · Tokenized stock contract match':'');
        const sub=document.createElement('small');sub.textContent=p.displayAmount+(p.value!==null?' · ≈ $'+p.value.toFixed(2):' · USD value unavailable');
        const wrap=document.createElement('div');wrap.className='token-name';wrap.append(title,sub);el.append(wrap);out.append(el);
      }
    }catch(e){if(ticket===request){out.textContent='Morpho position data unavailable. No balances have been inferred.';last='';}}finally{clearTimeout(timer)}
  }
  new MutationObserver(()=>{if(!dashboard.classList.contains('hidden'))load()}).observe(dashboard,{attributes:true,attributeFilter:['class']});
  window.addEventListener('base-analysis-complete',()=>{last='';load()});
})();