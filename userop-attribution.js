(function(){
  const OPS_ENDPOINT=`${typeof BLOCKSCOUT!=='undefined'?BLOCKSCOUT:'https://base.blockscout.com'}/api/v2/proxy/account-abstraction/operations`;
  function lower(v){return typeof v==='string'?v.toLowerCase():''}
  function pick(obj,...keys){for(const k of keys){const v=obj?.[k];if(v!==undefined&&v!==null)return v}return null}
  function senderOf(op){const v=pick(op,'sender','sender_address','senderAddress');return lower(typeof v==='string'?v:(v?.hash||v?.address_hash||v?.address||''))}
  function callDataOf(op){return String(pick(op,'call_data','callData','calldata','execute_call_data','executeCallData')||'')}
  function hashOf(op){return String(pick(op,'hash','user_operation_hash','userOperationHash')||'')}
  function timeOf(op){const v=pick(op,'timestamp','time','block_timestamp','blockTimestamp');if(typeof v==='number')return v;const p=Date.parse(v||'');return Number.isFinite(p)?Math.floor(p/1000):0}
  function txHashOf(op){const v=pick(op,'transaction_hash','transactionHash','tx_hash');return typeof v==='string'?v:(v?.hash||'')}

  function scanOperations(ops,address){
    const parser=globalThis.BaseBuilderAttribution?.parseAttribution;
    if(typeof parser!=='function')return {error:'ERC-8021 parser unavailable',total:0,count:0,share:0,rows:[],codes:[],schemas:[],first:null,last:null};
    const wanted=lower(address);const rows=[];const codeCounts=new Map();const schemaCounts=new Map();let total=0;
    for(const op of ops||[]){const sender=senderOf(op);if(wanted&&sender&&sender!==wanted)continue;total++;const parsed=parser(callDataOf(op));if(!parsed.valid)continue;const row={hash:hashOf(op),transactionHash:txHashOf(op),time:timeOf(op),schemaId:parsed.schemaId,supported:parsed.supported,codes:parsed.codes};rows.push(row);schemaCounts.set(parsed.schemaId,(schemaCounts.get(parsed.schemaId)||0)+1);parsed.codes.forEach(c=>codeCounts.set(c,(codeCounts.get(c)||0)+1))}
    rows.sort((a,b)=>a.time-b.time);
    return {total,count:rows.length,share:total?rows.length/total:0,rows,first:rows[0]||null,last:rows[rows.length-1]||null,codes:[...codeCounts.entries()].sort((a,b)=>b[1]-a[1]),schemas:[...schemaCounts.entries()].sort((a,b)=>b[1]-a[1])};
  }

  async function fetchOperations(address,maxPages=5){
    let params={sender:address,page_size:50},items=[];
    for(let page=0;page<maxPages;page++){
      const q=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')q.set(k,String(v))});
      const r=await fetch(`${OPS_ENDPOINT}?${q}`,{headers:{accept:'application/json'}});
      if(r.status===501)throw new Error('Account-abstraction indexer not enabled');
      if(!r.ok)throw new Error(`UserOperation API ${r.status}`);
      const j=await r.json();const batch=Array.isArray(j?.items)?j.items:[];items.push(...batch);
      const next=j?.next_page_params;if(!next)break;params={sender:address,...next};
    }
    return items;
  }

  function short(v){return v?`${v.slice(0,8)}…${v.slice(-6)}`:'—'}
  function date(sec){return sec?new Date(sec*1000).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'—'}
  function ensureUI(){
    if(document.getElementById('userOpAttribution'))return;
    const anchor=document.getElementById('smartAccountCoverage')||document.getElementById('builderAttribution')||document.querySelector('.fingerprint-card');if(!anchor)return;
    const el=document.createElement('article');el.id='userOpAttribution';el.className='card section-card';
    el.innerHTML=`<div class="card-head"><div><div class="eyebrow">USEROP BUILDER ATTRIBUTION</div><h3>ERC-8021 inside ERC-4337 callData</h3></div><span id="uoAttrBadge" class="badge">Checking…</span></div><p class="section-intro">Base wallets append dataSuffix to <code>userOp.callData</code>. This section reads indexed UserOperations for the analyzed sender and applies the same strict ERC-8021 parser used for normal transactions.</p><div class="attribution-grid"><div><span>Fetched UserOperations</span><strong id="uoTotal">—</strong><small>bounded paginated indexer fetch</small></div><div><span>Attributed UserOps</span><strong id="uoCount">—</strong><small id="uoShare">—</small></div><div><span>Unique builder codes</span><strong id="uoCodes">—</strong><small>schema 0 decoded</small></div><div><span>Latest attribution</span><strong id="uoLatest">—</strong><small id="uoLatestHash">—</small></div></div><div id="uoAttrNote" class="status" style="margin-top:14px">Waiting for an analyzed address.</div><div class="attribution-bottom"><div><div class="eyebrow">TOP USEROP CODES</div><div id="uoCodeList" class="attr-list"></div></div><div><div class="eyebrow">SCHEMAS IN USEROPS</div><div id="uoSchemaList" class="attr-list"></div></div></div>`;
    anchor.insertAdjacentElement('afterend',el);
  }
  function renderList(id,rows,prefix=''){const root=document.getElementById(id);if(!root)return;root.innerHTML='';if(!rows.length){root.innerHTML='<div class="delta-empty">None detected.</div>';return}rows.slice(0,10).forEach(([key,count])=>{const d=document.createElement('div');d.className='attr-row';d.innerHTML=`<code>${prefix}${String(key).replace(/[&<>"']/g,'')}</code><strong>${count}</strong>`;root.appendChild(d)})}
  async function analyze(address){ensureUI();const badge=document.getElementById('uoAttrBadge'),note=document.getElementById('uoAttrNote');try{badge.textContent='Reading indexer…';note.textContent='Fetching sender-filtered UserOperations from Blockscout…';const ops=await fetchOperations(address);const scan=scanOperations(ops,address);globalThis.BaseUserOpAttribution.last={status:'indexed',fetched:ops.length,scan};document.getElementById('uoTotal').textContent=ops.length.toLocaleString();document.getElementById('uoCount').textContent=scan.count.toLocaleString();document.getElementById('uoShare').textContent=`${(scan.share*100).toFixed(2)}% of fetched UserOps`;document.getElementById('uoCodes').textContent=scan.codes.length.toLocaleString();document.getElementById('uoLatest').textContent=date(scan.last?.time);document.getElementById('uoLatestHash').textContent=short(scan.last?.hash);renderList('uoCodeList',scan.codes);renderList('uoSchemaList',scan.schemas,'schema ');badge.textContent=scan.count?'ERC-8021 evidence':'No marker found';note.textContent=`Fetched ${ops.length.toLocaleString()} sender-filtered UserOperation record${ops.length===1?'':'s'}; results are bounded by the paginated client fetch, not lifetime accounting.`;return globalThis.BaseUserOpAttribution.last}catch(e){const last={status:'unavailable',error:String(e?.message||e),fetched:0,scan:null};globalThis.BaseUserOpAttribution.last=last;badge.textContent='Indexer unavailable';note.textContent=`UserOperation attribution unavailable: ${last.error}. No inference is made from normal transaction calldata.`;return last}}
  function init(){ensureUI();const status=document.getElementById('status');if(!status)return;new MutationObserver(()=>{if(typeof state!=='undefined'&&state.address&&document.getElementById('dashboard')&&!document.getElementById('dashboard').classList.contains('hidden'))analyze(state.address)}).observe(status,{childList:true,subtree:true})}
  globalThis.BaseUserOpAttribution={senderOf,callDataOf,scanOperations,fetchOperations,analyze,last:null};if(typeof document!=='undefined')init();
})();
