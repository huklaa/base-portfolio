(function(){
  const DAY=86400;
  function lower(v){return String(v||'').toLowerCase()}
  function legacyToTransfer(tx,meta){
    return {
      timestamp:tx.timeStamp?new Date(Number(tx.timeStamp)*1000).toISOString():null,
      from:{hash:lower(tx.from)},to:{hash:lower(tx.to)},
      total:{value:String(tx.value||'0'),decimals:Number(tx.tokenDecimal||18)},
      token:{address_hash:lower(tx.contractAddress),address:lower(tx.contractAddress),type:'ERC-20',decimals:Number(tx.tokenDecimal||18),symbol:meta.symbol,name:meta.name,exchange_rate:meta.symbol==='EURC'?0:1}
    };
  }
  async function fetchLegacyStable(address,sinceTs){
    const api=globalThis.BaseStablecoinFlow;if(!api?.VERIFIED_STABLES)return null;
    const items=[];let pages=0,complete=true;
    for(const [contract,meta] of api.VERIFIED_STABLES.entries()){
      let reached=false;
      for(let page=1;page<=3;page++){
        const q=new URLSearchParams({module:'account',action:'tokentx',address,contractaddress:contract,page:String(page),offset:'1000',sort:'desc'});
        const r=await fetch(`https://base.blockscout.com/api?${q}`,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`legacy token API ${r.status}`);
        const j=await r.json(),batch=Array.isArray(j?.result)?j.result:[];pages++;
        for(const tx of batch)items.push(legacyToTransfer(tx,meta));
        const oldest=batch.length?Math.min(...batch.map(x=>Number(x.timeStamp||0)).filter(Boolean)):0;
        if(!batch.length||batch.length<1000||(oldest&&oldest<=sinceTs)){reached=true;break}
      }
      if(!reached)complete=false;
    }
    items.coverage={pages,maxPages:12,sinceTs,oldestTimestamp:0,complete,source:'legacy-account-api-fallback'};
    return items;
  }
  function renderStableFallback(transfers,address){
    const api=globalThis.BaseStablecoinFlow,now=Math.floor(Date.now()/1000);
    if(!api?.summarize)return;
    const cur=api.summarize(transfers,address,now-30*DAY,now+1),prev=api.summarize(transfers,address,now-60*DAY,now-30*DAY);
    const money=v=>Number(v||0).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:Number(v)>=100?0:2});
    const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
    set('stableIn',money(cur.inUsd));set('stableOut',money(cur.outUsd));set('stableNet',`${cur.netUsd>=0?'+':''}${money(cur.netUsd)}`);set('stableCount',cur.count.toLocaleString());set('stableInCount',`${cur.inbound} inbound transfers`);set('stableOutCount',`${cur.outbound} outbound transfers`);
    const trend=prev.count?((cur.count-prev.count)/prev.count)*100:(cur.count?'new':0);set('stableCountTrend',trend==='new'?'new vs previous 30d':`${trend>=0?'+':''}${Math.round(trend)}% vs previous 30d`);
    const verified=[...api.VERIFIED_STABLES.entries()].map(([a,m])=>({address:a,...m}));api.last={transfers,current:cur,previous:prev,coverage:transfers.coverage,verifiedContracts:verified};
    const status=document.getElementById('stableFlowStatus');if(status)status.textContent=`Primary token-transfer endpoint was unavailable; recovered ${transfers.length} verified-stable records via Blockscout fallback (${transfers.coverage.pages} pages).`;
    globalThis.BaseEvidenceCoverage?.render?.();
  }
  async function recoverStable(){
    const status=document.getElementById('stableFlowStatus');const address=globalThis.state?.address||'';
    if(!status||!address||globalThis.BaseStablecoinFlow?.last||status.dataset.fallbackRunning==='1')return;
    if(!/unavailable|failed to fetch/i.test(status.textContent||''))return;
    status.dataset.fallbackRunning='1';
    try{const since=Math.floor(Date.now()/1000)-90*DAY,items=await fetchLegacyStable(address,since);if(items)renderStableFallback(items,address)}catch(e){status.textContent=`Stablecoin transfer view unavailable after fallback: ${e.message}`}
    finally{status.dataset.fallbackRunning='0'}
  }
  function dedupeTimeline(){
    const root=document.getElementById('timeline');if(!root)return;let seen=false;
    [...root.querySelectorAll('.timeline-item')].forEach(item=>{const title=item.querySelector('strong')?.textContent||'';if(!title.includes('First strict ERC-8021 attribution'))return;if(seen)item.remove();else seen=true});
  }
  function init(){
    const status=document.getElementById('stableFlowStatus');if(status)new MutationObserver(()=>recoverStable()).observe(status,{childList:true,subtree:true});
    const timeline=document.getElementById('timeline');if(timeline)new MutationObserver(()=>dedupeTimeline()).observe(timeline,{childList:true,subtree:true});
    setTimeout(()=>{recoverStable();dedupeTimeline()},1200);
  }
  globalThis.BaseProductionFixes={fetchLegacyStable,dedupeTimeline};if(typeof document!=='undefined')init();
})();
