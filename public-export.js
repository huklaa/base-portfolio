(function(){
  const PROFILE_SCHEMA_URL='https://huklaa.github.io/base-portfolio/profile.schema.json';
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
  function builderExport(){
    const scan=globalThis.BaseBuilderAttribution?.last;
    if(!scan)return null;
    return {strictMarker:'0x80218021802180218021802180218021',attributedTransactions:scan.count,attributedShare:scan.share,firstDetected:scan.first,lastDetected:scan.last,decodedSchema0Codes:scan.codes.map(([code,count])=>({code,count})),detectedSchemas:scan.schemas.map(([schemaId,count])=>({schemaId,count})),parserSupport:'schema 0 decoded; other schema IDs detected but not guessed'};
  }
  function userOpAttributionExport(){
    const last=globalThis.BaseUserOpAttribution?.last;
    if(!last)return null;
    if(last.status!=='indexed')return {status:last.status,error:last.error||null,source:'Blockscout ERC-4337 UserOperation indexer'};
    const scan=last.scan||{};
    return {status:'indexed',fetchedUserOperations:Number(last.fetched||0),senderMatchedUserOperations:Number(scan.total||0),attributedUserOperations:Number(scan.count||0),attributedShare:Number(scan.share||0),firstDetected:scan.first||null,lastDetected:scan.last||null,decodedSchema0Codes:(scan.codes||[]).map(([code,count])=>({code,count})),detectedSchemas:(scan.schemas||[]).map(([schemaId,count])=>({schemaId,count})),source:'Blockscout sender-filtered ERC-4337 UserOperations; strict ERC-8021 parser applied to userOp.callData',scope:'bounded paginated fetch; not lifetime accounting'};
  }
  function stablecoinExport(){
    const last=globalThis.BaseStablecoinFlow?.last;
    if(!last) return null;
    const clean=s=>({transferCount:s.count,inboundTransfers:s.inbound,outboundTransfers:s.outbound,inboundUsd:s.inUsd,outboundUsd:s.outUsd,netFlowUsd:s.netUsd,topCounterparties:s.counterparties.slice(0,10).map(([address,count])=>({address,count})),stablecoinMixUsd:Object.fromEntries(s.symbols)});
    return {current30d:clean(last.current),previous30d:clean(last.previous),fetchedTransferRecords:last.transfers.length,verifiedContracts:last.verifiedContracts||[],scope:'fetched recent ERC-20 transfer history filtered by explicit Base stablecoin contract allowlist'};
  }
  function smartAccountExport(){
    const last=globalThis.BaseSmartAccount?.last;
    if(!last)return null;
    const a=last.account||{};
    return {status:last.status,erc4337Indexed:last.status==='indexed',walletFamily:a.isCoinbaseSmartWallet?'Coinbase Smart Wallet':'unclassified',recognizedCoinbaseSmartWallet:Boolean(a.isCoinbaseSmartWallet),factory:a.factory||null,factoryLabel:a.factoryLabel||null,entryPoint:a.entryPoint||null,entryPointLabel:a.entryPointLabel||null,indexedOperations:Number(a.operations||0),creationTransaction:a.creationTx||null,source:'Blockscout account-abstraction indexer, best effort'};
  }
  function buildExport(){
    if(typeof state==='undefined'||!state.address) return null;
    return {
      $schema:PROFILE_SCHEMA_URL,
      schema:'base-portfolio-public-profile',
      version:'1.4.0',
      generatedAt:new Date().toISOString(),
      chain:{name:'Base',chainId:8453,explorer:'https://base.blockscout.com'},
      address:state.address,
      portfolio:{totalValueUsd:Number(state.totalValue||0),stablecoinValueUsd:Number(state.stableValue||0),fungibleAssetCount:(state.portfolio||[]).length,nftCount:(state.nfts||[]).length},
      activity:state.metrics?{transactions:state.metrics.txCount,activeDays:state.metrics.activeDays,uniqueContracts:state.metrics.contracts,gasSpentEth:state.metrics.gasEth,activityScore:state.metrics.score,activityLevel:state.metrics.level,firstActivityTimestamp:state.metrics.first?.timeStamp||null,latestActivityTimestamp:state.metrics.latest?.timeStamp||null}:null,
      economicFingerprint:sanitizeFingerprint(state.fingerprint),
      builderAttribution:builderExport(),
      userOpBuilderAttribution:userOpAttributionExport(),
      behaviorDelta:deltaExport(state.txs),
      stablecoinFlow:stablecoinExport(),
      smartAccount:smartAccountExport(),
      methodology:{activityScore:'local heuristic',economicFingerprint:'local explainable heuristic',builderAttribution:'exact ERC-8021 16-byte marker validation with schema-0 decoding on normal transaction calldata',userOpBuilderAttribution:'same strict ERC-8021 parser applied to sender-filtered ERC-4337 userOp.callData',behaviorDelta:'latest 30 days compared with previous 30 days',stablecoinFlow:'recent Blockscout ERC-20 transfer records filtered by explicit verified Base stablecoin contract addresses; token symbols alone are not trusted',smartAccount:'best-effort Blockscout account-abstraction indexer evidence; recognized Coinbase Smart Wallet factories are explicit allowlisted addresses'},
      limits:{transactionHistoryCap:10000,source:'Base Blockscout public APIs',erc8021Parsing:'schema 0 decoded; unsupported schema IDs detected without speculative decoding',userOpHistory:'bounded paginated sender-filtered UserOperation fetch; absence of a marker in fetched data is not proof of lifetime absence',stablecoinHistory:'limited to fetched paginated transfer records and explicit contract allowlist; not complete lifetime accounting',smartAccountCoverage:'absence of an indexer record is inconclusive and contract code alone is not treated as Base Account proof'},
      safety:{readOnly:true,walletConnection:false,signatures:false,approvals:false,transactions:false},
      attribution:{project:'Base Portfolio Explorer',creatorX:'@1kipcak',creatorGitHub:'huklaa'}
    };
  }
  function ensureUI(){
    if(document.getElementById('developerExport')) return;
    const share=document.querySelector('.share-section'); if(!share) return;
    const el=document.createElement('article');el.id='developerExport';el.className='card section-card developer-export';
    el.innerHTML=`<div class="card-head"><div><div class="eyebrow">FOR BUILDERS & AGENTS</div><h3>Machine-readable Base profile</h3></div><span class="badge">JSON v1.4</span></div><p class="section-intro">Export the same public analytics in a compact JSON document for experiments, agents, demos, or reproducible analysis. The export links to a formal JSON Schema and contains no private wallet data.</p><div class="export-actions"><button id="downloadProfileJson" class="primary">Download JSON profile</button><button id="copyProfileUrl" class="secondary-btn">Copy shareable profile URL</button><button id="copyProfileJson" class="secondary-btn">Copy JSON</button><a class="secondary-btn" href="./profile.schema.json" target="_blank" rel="noreferrer">Open JSON Schema ↗</a></div><pre id="exportPreview" class="export-preview">Analyze a Base address to generate a profile.</pre>`;
    share.insertAdjacentElement('afterend',el);
    const style=document.createElement('style');style.textContent=`.developer-export{background:radial-gradient(circle at 0 0,rgba(21,94,239,.12),transparent 34%),linear-gradient(180deg,rgba(17,26,42,.98),rgba(9,14,24,.98))}.export-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.secondary-btn{display:inline-flex;align-items:center;text-decoration:none;border:1px solid #29476f;border-radius:13px;padding:13px 16px;background:#0a1830;color:#cfe0ff;font-weight:800;cursor:pointer}.export-preview{margin:16px 0 0;max-height:280px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#060b13;border:1px solid #19243a;border-radius:14px;padding:14px;color:#9fb5d2;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}`;
    document.head.appendChild(style);
    document.getElementById('downloadProfileJson').addEventListener('click',downloadJson);
    document.getElementById('copyProfileUrl').addEventListener('click',copyUrl);
    document.getElementById('copyProfileJson').addEventListener('click',copyJson);
  }
  function render(){ ensureUI(); const data=buildExport(); const pre=document.getElementById('exportPreview'); if(pre) pre.textContent=data?JSON.stringify(data,null,2):'Analyze a Base address to generate a profile.'; }
  function downloadJson(){ const data=buildExport(); if(!data)return; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`base-profile-${state.address.slice(2,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  async function copyJson(){ const data=buildExport(); if(!data)return; try{await navigator.clipboard.writeText(JSON.stringify(data,null,2)); const b=document.getElementById('copyProfileJson');b.textContent='Copied';setTimeout(()=>b.textContent='Copy JSON',1500);}catch{} }
  async function copyUrl(){ if(typeof state==='undefined'||!state.address)return; const url=`${location.origin}${location.pathname}?address=${encodeURIComponent(state.address)}`; try{await navigator.clipboard.writeText(url);const b=document.getElementById('copyProfileUrl');b.textContent='Copied';setTimeout(()=>b.textContent='Copy shareable profile URL',1500);}catch{} }
  function init(){ ensureUI(); const d=document.getElementById('dashboard');if(!d)return;new MutationObserver(()=>{if(!d.classList.contains('hidden'))render();}).observe(d,{attributes:true,attributeFilter:['class']});const s=document.getElementById('status');if(s)new MutationObserver(()=>{if(!d.classList.contains('hidden'))render();}).observe(s,{childList:true,subtree:true});['stableFlowStatus','builderAttribution','aaNote','uoAttrNote'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(()=>{if(!d.classList.contains('hidden'))render();}).observe(el,{childList:true,subtree:true})});if(!d.classList.contains('hidden'))render(); }
  globalThis.BasePublicExport={PROFILE_SCHEMA_URL,buildExport}; if(typeof document!=='undefined')init();
})();
