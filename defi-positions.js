(function(){
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
    if(!/^0x[a-fA-F0-9]{40}$/.test(address)||address===last)return;
    last=address;const ticket=++request;
    out.textContent='Loading Morpho positions…';
    const query='query ($address:String!){userByAddress(address:$address,chainId:8453){marketPositions{market{marketId collateralAsset{symbol} loanAsset{symbol}} state{collateral collateralUsd borrowAssets borrowAssetsUsd supplyAssets supplyAssetsUsd}} vaultPositions{vault{name} state{assets assetsUsd shares}} vaultV2Positions{vault{name} assets assetsUsd shares}}}';
    try{
      const response=await fetch('https://api.morpho.org/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables:{address}})});
      if(!response.ok)throw Error('API '+response.status);
      const data=await response.json();
      if(data.errors?.length)throw Error('API query unavailable');
      if(ticket!==request)return;
      const u=data.data?.userByAddress;
      const rows=[];
      const add=(type,asset,amount,value)=>{if(Number(amount)>0)rows.push({type,asset,amount:String(amount),value:Number(value)});};
      for(const p of u?.marketPositions||[]){
        add('Collateral',p.market?.collateralAsset?.symbol,p.state?.collateral,p.state?.collateralUsd);
        add('Borrowed',p.market?.loanAsset?.symbol,p.state?.borrowAssets,p.state?.borrowAssetsUsd);
        add('Supplied',p.market?.loanAsset?.symbol,p.state?.supplyAssets,p.state?.supplyAssetsUsd);
      }
      for(const p of u?.vaultPositions||[])add('Vault deposit',p.vault?.name,p.state?.assets,p.state?.assetsUsd);
      for(const p of u?.vaultV2Positions||[])add('Vault deposit',p.vault?.name,p.assets,p.assetsUsd);
      out.replaceChildren();
      if(!rows.length){out.textContent='No Morpho positions reported for this address. Other DeFi protocols are not checked.';return;}
      for(const p of rows.slice(0,30)){
        const el=document.createElement('div');el.className='token-row';
        const title=document.createElement('strong');title.textContent=p.type+' · '+(p.asset||'Unknown asset');
        const sub=document.createElement('small');sub.textContent=p.amount+(Number.isFinite(p.value)&&p.value>0?' · ≈ $'+p.value.toFixed(2):'');
        const wrap=document.createElement('div');wrap.className='token-name';wrap.append(title,sub);el.append(wrap);out.append(el);
      }
    }catch(e){if(ticket===request){out.textContent='Morpho position data unavailable. No balances have been inferred.';last='';}}
  }
  new MutationObserver(()=>{if(!dashboard.classList.contains('hidden'))load()}).observe(dashboard,{attributes:true,attributeFilter:['class']});
  document.getElementById('analyzeBtn')?.addEventListener('click',()=>{last='';setTimeout(load,2500)});
})();