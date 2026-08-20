(function(){
  function short(a){ return a?`${a.slice(0,8)}…${a.slice(-6)}`:'—'; }
  function sanitizeFingerprint(f){
    if(!f) return null;
    return {
      archetype:f.archetype,
      contractCalls:f.contractCalls,
      repeatRate:Number(f.repeatRate||0),
      topAppConcentration:Number(f.concentration||0),
      builderCodeSignals:Number(f.builderSignals||0),
      lifetimeDays:Number(f.lifetimeDays||0),
      cadenceActiveDaysPerMonth:Number(f.cadence||0),
      uniqueContracts:Number(f.uniqueContracts||0),
      dimensions:{...(f.dimensions||{})},
      insights:[...(f.insights||[])],
      topContracts:(f.topContracts||[]).map(([address,count])=>({address,count}))
    };
  }
  function deltaExport(txs){
    const api=globalThis.BaseBehaviorDelta;
    if(!api?.buildDelta) return null;
    const d=api.buildDelta(txs||[]);
    return {
      current30d:{transactions:d.current.txCount,activeDays:d.current.activeDays,uniqueContracts:d.current.uniqueContracts,contractCalls:d.current.contractCalls,gasEth:d.current.gasEth},
      previous30d:{transactions:d.previous.txCount,activeDays:d.previous.activeDays,uniqueContracts:d.previous.uniqueContracts,contractCalls:d.previous.contractCalls,gasEth:d.previous.gasEth},
      changePct:{transactions:d.txTrend,activeDays:d.dayTrend,uniqueContracts:d.contractTrend,gasEth:d.gasTrend},
      newContractDestinations:d.newApps,
      revisitedContractDestinations:d.revisitedApps
    };
  }
  function buildExport(){
    if(typeof state==='undefined'||!state.address) return null;
    return {
      schema:'base-portfolio-public-profile',
      version:'1.0.0',
      generatedAt:new Date().toISOString(),
      chain:{name:'Base',chainId:8453,explorer:'https://base.blockscout.com'},
      address:state.address,
      portfolio:{totalValueUsd:Number(state.totalValue||0),stablecoinValueUsd:Number(state.stableValue||0),fungibleAssetCount:(state.portfolio||[]).length,nftCount:(state.nfts||[]).length},
      activity:state.metrics?{transactions:state.metrics.txCount,activeDays:state.metrics.activeDays,uniqueContracts:state.metrics.contracts,gasSpentEth:state.metrics.gasEth,activityScore:state.metrics.score,activityLevel:state.metrics.level,firstActivityTimestamp:state.metrics.first?.timeStamp||null,latestActivityTimestamp:state.metrics.latest?.timeStamp||null}:null,
      economicFingerprint:sanitizeFingerprint(state.fingerprint),
      behaviorDelta:deltaExport(state.txs),
      methodology:{activityScore:'local heuristic',economicFingerprint:'local explainable heuristic',behaviorDelta:'latest 30 days compared with previous 30 days'},
      limits:{transactionHistoryCap:10000,source:'Base Blockscout public APIs',erc8021Detection:'best-effort sentinel detection'},
      safety:{readOnly:true,walletConnection:false,signatures:false,approvals:false,transactions:false},
      attribution:{project:'Base Portfolio Explorer',creatorX:'@1kipcak',creatorGitHub:'huklaa'}
    };
  }
  function ensureUI(){
    if(document.getElementById('developerExport')) return;
    const share=document.querySelector('.share-section'); if(!share) return;
    const el=document.createElement('article');el.id='developerExport';el.className='card section-card developer-export';
    el.innerHTML=`<div class="card-head"><div><div class="eyebrow">FOR BUILDERS & AGENTS</div><h3>Machine-readable Base profile</h3></div><span class="badge">JSON v1.0</span></div><p class="section-intro">Export the same public analytics in a compact JSON document for experiments, agents, demos, or reproducible analysis. No private wallet data is included.</p><div class="export-actions"><button id="downloadProfileJson" class="primary">Download JSON profile</button><button id="copyProfileUrl" class="secondary-btn">Copy shareable profile URL</button><button id="copyProfileJson" class="secondary-btn">Copy JSON</button></div><pre id="exportPreview" class="export-preview">Analyze a Base address to generate a profile.</pre>`;
    share.insertAdjacentElement('afterend',el);
    const style=document.createElement('style');style.textContent=`.developer-export{background:radial-gradient(circle at 0 0,rgba(21,94,239,.12),transparent 34%),linear-gradient(180deg,rgba(17,26,42,.98),rgba(9,14,24,.98))}.export-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.secondary-btn{border:1px solid #29476f;border-radius:13px;padding:13px 16px;background:#0a1830;color:#cfe0ff;font-weight:800;cursor:pointer}.export-preview{margin:16px 0 0;max-height:280px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#060b13;border:1px solid #19243a;border-radius:14px;padding:14px;color:#9fb5d2;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}`;
    document.head.appendChild(style);
    document.getElementById('downloadProfileJson').addEventListener('click',downloadJson);
    document.getElementById('copyProfileUrl').addEventListener('click',copyUrl);
    document.getElementById('copyProfileJson').addEventListener('click',copyJson);
  }
  function render(){ ensureUI(); const data=buildExport(); const pre=document.getElementById('exportPreview'); if(pre) pre.textContent=data?JSON.stringify(data,null,2):'Analyze a Base address to generate a profile.'; }
  function downloadJson(){ const data=buildExport(); if(!data)return; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`base-profile-${state.address.slice(2,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  async function copyJson(){ const data=buildExport(); if(!data)return; try{await navigator.clipboard.writeText(JSON.stringify(data,null,2)); const b=document.getElementById('copyProfileJson');b.textContent='Copied';setTimeout(()=>b.textContent='Copy JSON',1500);}catch{} }
  async function copyUrl(){ if(typeof state==='undefined'||!state.address)return; const url=`${location.origin}${location.pathname}?address=${encodeURIComponent(state.address)}`; try{await navigator.clipboard.writeText(url);const b=document.getElementById('copyProfileUrl');b.textContent='Copied';setTimeout(()=>b.textContent='Copy shareable profile URL',1500);}catch{} }
  function init(){ ensureUI(); const d=document.getElementById('dashboard');if(!d)return;new MutationObserver(()=>{if(!d.classList.contains('hidden'))render();}).observe(d,{attributes:true,attributeFilter:['class']});const s=document.getElementById('status');if(s)new MutationObserver(()=>{if(!d.classList.contains('hidden'))render();}).observe(s,{childList:true,subtree:true});if(!d.classList.contains('hidden'))render(); }
  globalThis.BasePublicExport={buildExport}; if(typeof document!=='undefined')init();
})();
