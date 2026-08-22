(function(){
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
  function isoFromSec(v){const n=num(v);return n?new Date(n*1000).toISOString():null}
  function buildCoverage(){
    if(typeof state==='undefined'||!state.address)return null;
    const txs=Array.isArray(state.txs)?state.txs:[];
    const stable=globalThis.BaseStablecoinFlow?.last;
    const aa=globalThis.BaseSmartAccount?.last;
    const uo=globalThis.BaseUserOpAttribution?.last;
    const builder=globalThis.BaseBuilderAttribution?.last;
    const txCap=10000;
    const normalTxCount=txs.length;
    const oldest=txs.reduce((m,t)=>{const x=num(t?.timeStamp);return x&&(!m||x<m)?x:m},0);
    const newest=txs.reduce((m,t)=>Math.max(m,num(t?.timeStamp)),0);
    const stableCoverage=stable?.coverage||null;
    return {
      normalTransactions:{fetched:normalTxCount,configuredCap:txCap,capReached:normalTxCount>=txCap,oldestIndexed:isoFromSec(oldest),latestIndexed:isoFromSec(newest)},
      builderAttribution:{normalTransactionsScanned:builder?normalTxCount:0,strictAttributedTransactions:num(builder?.count),parserAvailable:Boolean(globalThis.BaseBuilderAttribution?.parseAttribution)},
      stablecoinTransfers:{
        fetched:num(stable?.transfers?.length),
        allowlistedContracts:num(stable?.verifiedContracts?.length),
        available:Boolean(stable),
        pagesFetched:num(stableCoverage?.pagesFetched),
        oldestTimestamp:stableCoverage?.oldestTimestamp||null,
        targetTimestamp:stableCoverage?.targetTimestamp||null,
        reachedTarget:Boolean(stableCoverage?.reachedTarget),
        reachedEnd:Boolean(stableCoverage?.reachedEnd),
        hitPageCap:Boolean(stableCoverage?.hitPageCap),
        completeForRequestedWindow:stableCoverage?Boolean(stableCoverage.completeForRequestedWindow):false
      },
      accountAbstraction:{status:aa?.status||'not-loaded',indexedOperations:num(aa?.account?.operations)},
      userOperations:{status:uo?.status||'not-loaded',fetched:num(uo?.fetched),strictAttributedUserOps:num(uo?.scan?.count)},
      caveat:'Coverage describes fetched public indexer evidence, not complete lifetime activity.'
    };
  }
  function ensureUI(){
    if(document.getElementById('evidenceCoverage'))return;
    const anchor=document.getElementById('userOpAttribution')||document.getElementById('smartAccountCoverage')||document.querySelector('.fingerprint-card');if(!anchor)return;
    const el=document.createElement('article');el.id='evidenceCoverage';el.className='card section-card';
    el.innerHTML=`<div class="card-head"><div><div class="eyebrow">EVIDENCE & COVERAGE</div><h3>How much public data backs this profile?</h3></div><span class="badge">Transparent scope</span></div><p class="section-intro">This is a data-coverage panel, not a wallet score. It shows exactly how much indexed evidence the current analysis fetched and where the limits are.</p><div class="fingerprint-stats" style="margin-top:18px"><div><span>Normal transactions</span><strong id="covTx">—</strong><small id="covTxNote">—</small></div><div><span>Stablecoin transfers</span><strong id="covStable">—</strong><small id="covStableNote">—</small></div><div><span>UserOperations</span><strong id="covUserOps">—</strong><small id="covUserOpsNote">—</small></div><div><span>AA indexer</span><strong id="covAA">—</strong><small id="covAANote">—</small></div></div><div id="coverageNote" class="status" style="margin-top:14px">Waiting for an analyzed address.</div>`;
    anchor.insertAdjacentElement('afterend',el);
  }
  function render(){
    ensureUI();const c=buildCoverage();if(!c)return;
    document.getElementById('covTx').textContent=c.normalTransactions.fetched.toLocaleString();
    document.getElementById('covTxNote').textContent=c.normalTransactions.capReached?`Configured ${c.normalTransactions.configuredCap.toLocaleString()} cap reached`:`Below ${c.normalTransactions.configuredCap.toLocaleString()} configured cap`;
    document.getElementById('covStable').textContent=c.stablecoinTransfers.fetched.toLocaleString();
    const stableNote=document.getElementById('covStableNote');
    if(!c.stablecoinTransfers.available)stableNote.textContent='Stablecoin module not loaded';
    else if(c.stablecoinTransfers.completeForRequestedWindow)stableNote.textContent=`90d coverage complete · ${c.stablecoinTransfers.pagesFetched} pages · ${c.stablecoinTransfers.allowlistedContracts} allowlisted contracts`;
    else if(c.stablecoinTransfers.hitPageCap)stableNote.textContent=`Partial 90d coverage · page cap reached after ${c.stablecoinTransfers.pagesFetched} pages`;
    else stableNote.textContent=`Coverage incomplete or still loading · ${c.stablecoinTransfers.pagesFetched} pages fetched`;
    document.getElementById('covUserOps').textContent=c.userOperations.fetched.toLocaleString();
    document.getElementById('covUserOpsNote').textContent=c.userOperations.status;
    document.getElementById('covAA').textContent=c.accountAbstraction.status;
    document.getElementById('covAANote').textContent=c.accountAbstraction.indexedOperations?`${c.accountAbstraction.indexedOperations.toLocaleString()} indexed operations reported`:'No operation count reported';
    const oldest=c.normalTransactions.oldestIndexed?new Date(c.normalTransactions.oldestIndexed).toLocaleDateString(): '—';
    const latest=c.normalTransactions.latestIndexed?new Date(c.normalTransactions.latestIndexed).toLocaleDateString(): '—';
    const stableScope=c.stablecoinTransfers.completeForRequestedWindow?'Stablecoin payment-pattern window is fully covered by fetched indexer history.':c.stablecoinTransfers.available?'Stablecoin payment-pattern results may be partial; see coverage status above.':'Stablecoin coverage is unavailable.';
    document.getElementById('coverageNote').textContent=`Normal-transaction evidence spans ${oldest} → ${latest}. ${stableScope} ${c.caveat}`;
    globalThis.BaseEvidenceCoverage.last=c;
  }
  function init(){ensureUI();const status=document.getElementById('status');if(status)new MutationObserver(()=>setTimeout(render,0)).observe(status,{childList:true,subtree:true});['stableFlowStatus','paymentPatternStatus','aaNote','uoAttrNote'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(()=>render()).observe(el,{childList:true,subtree:true})});}
  globalThis.BaseEvidenceCoverage={buildCoverage,render,last:null};if(typeof document!=='undefined')init();
})();

(function(){
  function classify(status){
    if(status===429)return {kind:'rate-limit',message:'Base explorer is busy; background panels will keep retrying automatically.'};
    if(status===408||status===504)return {kind:'timeout',message:'Base explorer timed out; background panels will retry automatically.'};
    if(status>=500)return {kind:'outage',message:'Base explorer is temporarily unavailable.'};
    return null;
  }
  function cloneResponse(response){return response&&typeof response.clone==='function'?response.clone():response}
  function createDedupedFetch(fetchImpl,ttlMs=1500){
    const cache=new Map();
    return async function(input,init){
      const url=typeof input==='string'?input:String(input?.url||'');
      const method=String(init?.method||input?.method||'GET').toUpperCase();
      const isBlockscout=url.startsWith('https://base.blockscout.com/');
      if(!isBlockscout||method!=='GET')return fetchImpl(input,init);
      const key=`${method} ${url}`;
      const existing=cache.get(key);
      if(existing&&(existing.pending||Date.now()<existing.expires))return cloneResponse(await existing.promise);
      const entry={pending:true,expires:Infinity,promise:null};
      entry.promise=Promise.resolve().then(()=>fetchImpl(input,init));
      cache.set(key,entry);
      try{
        const response=await entry.promise;
        entry.pending=false;
        if(response&&response.ok){
          entry.expires=Date.now()+ttlMs;
          setTimeout(()=>{if(cache.get(key)===entry)cache.delete(key)},ttlMs+25);
        }else cache.delete(key);
        return cloneResponse(response);
      }catch(error){cache.delete(key);throw error;}
    };
  }
  globalThis.BaseApiResilience={classify,createDedupedFetch,last:null};
})();
