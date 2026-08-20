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
    return {
      normalTransactions:{fetched:normalTxCount,configuredCap:txCap,capReached:normalTxCount>=txCap,oldestIndexed:isoFromSec(oldest),latestIndexed:isoFromSec(newest)},
      builderAttribution:{normalTransactionsScanned:builder?normalTxCount:0,strictAttributedTransactions:num(builder?.count),parserAvailable:Boolean(globalThis.BaseBuilderAttribution?.parseAttribution)},
      stablecoinTransfers:{fetched:num(stable?.transfers?.length),allowlistedContracts:num(stable?.verifiedContracts?.length),available:Boolean(stable)},
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
    document.getElementById('covStableNote').textContent=c.stablecoinTransfers.available?`${c.stablecoinTransfers.allowlistedContracts} allowlisted token contracts`:'Stablecoin module not loaded';
    document.getElementById('covUserOps').textContent=c.userOperations.fetched.toLocaleString();
    document.getElementById('covUserOpsNote').textContent=c.userOperations.status;
    document.getElementById('covAA').textContent=c.accountAbstraction.status;
    document.getElementById('covAANote').textContent=c.accountAbstraction.indexedOperations?`${c.accountAbstraction.indexedOperations.toLocaleString()} indexed operations reported`:'No operation count reported';
    const oldest=c.normalTransactions.oldestIndexed?new Date(c.normalTransactions.oldestIndexed).toLocaleDateString(): '—';
    const latest=c.normalTransactions.latestIndexed?new Date(c.normalTransactions.latestIndexed).toLocaleDateString(): '—';
    document.getElementById('coverageNote').textContent=`Normal-transaction evidence spans ${oldest} → ${latest}. ${c.caveat}`;
    globalThis.BaseEvidenceCoverage.last=c;
  }
  function init(){ensureUI();const status=document.getElementById('status');if(status)new MutationObserver(()=>setTimeout(render,0)).observe(status,{childList:true,subtree:true});['stableFlowStatus','aaNote','uoAttrNote'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(()=>render()).observe(el,{childList:true,subtree:true})});}
  globalThis.BaseEvidenceCoverage={buildCoverage,render,last:null};if(typeof document!=='undefined')init();
})();
