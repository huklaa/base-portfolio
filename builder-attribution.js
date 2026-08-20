(function(){
  const ERC8021_SUFFIX='80218021802180218021802180218021';

  function cleanHex(input){
    const hex=String(input||'').replace(/^0x/i,'').toLowerCase();
    return /^[0-9a-f]*$/.test(hex)&&hex.length%2===0?hex:'';
  }
  function hexToText(hex){
    if(!hex) return '';
    const bytes=new Uint8Array(hex.match(/.{2}/g).map(x=>parseInt(x,16)));
    try{return new TextDecoder().decode(bytes)}catch{return ''}
  }
  function parseAttribution(input){
    const hex=cleanHex(input);
    const markerChars=ERC8021_SUFFIX.length;
    if(!hex||hex.length<markerChars+2) return {valid:false,reason:'too_short'};
    if(!hex.endsWith(ERC8021_SUFFIX)) return {valid:false,reason:'marker_missing'};
    const markerStart=hex.length-markerChars;
    if(markerStart<2) return {valid:false,reason:'schema_missing'};
    const schemaId=parseInt(hex.slice(markerStart-2,markerStart),16);
    const result={valid:true,schemaId,supported:schemaId===0,codes:[],rawSuffix:`0x${hex.slice(Math.max(0,markerStart-4))}`};
    if(schemaId!==0) return result;
    if(markerStart<4) return {valid:false,reason:'length_missing',schemaId};
    const codesLength=parseInt(hex.slice(markerStart-4,markerStart-2),16);
    const codesChars=codesLength*2;
    const codesStart=markerStart-4-codesChars;
    if(codesStart<0) return {valid:false,reason:'length_out_of_bounds',schemaId};
    const codesHex=hex.slice(codesStart,markerStart-4);
    const text=hexToText(codesHex);
    if(codesLength&&text.length===0) return {valid:false,reason:'decode_failed',schemaId};
    const codes=text.split(',').map(x=>x.trim()).filter(Boolean);
    return {...result,codesLength,codes,text,dataStartByte:codesStart/2};
  }

  function scanTransactions(txs){
    const rows=[];const codeCounts=new Map();const schemaCounts=new Map();
    for(const tx of txs||[]){
      const parsed=parseAttribution(tx?.input||'');
      if(!parsed.valid) continue;
      const time=Number(tx?.timeStamp||0);
      rows.push({hash:tx?.hash||'',time,schemaId:parsed.schemaId,supported:parsed.supported,codes:parsed.codes});
      schemaCounts.set(parsed.schemaId,(schemaCounts.get(parsed.schemaId)||0)+1);
      parsed.codes.forEach(code=>codeCounts.set(code,(codeCounts.get(code)||0)+1));
    }
    rows.sort((a,b)=>a.time-b.time);
    const total=(txs||[]).length;
    return {count:rows.length,share:total?rows.length/total:0,rows,first:rows[0]||null,last:rows[rows.length-1]||null,codes:[...codeCounts.entries()].sort((a,b)=>b[1]-a[1]),schemas:[...schemaCounts.entries()].sort((a,b)=>b[1]-a[1])};
  }

  function fallbackArchetype(f){
    if(!f) return 'Base Newcomer';
    const activeDays=state?.metrics?.activeDays||0,txs=state?.txs||[];
    if(f.uniqueContracts>=45&&f.repeatRate<0.72)return 'Protocol Explorer';
    if(f.contractCalls>=40&&f.repeatRate>=0.75&&f.concentration>=0.35)return 'App Loyalist';
    if(activeDays>=75&&f.uniqueContracts>=20)return 'Base Power User';
    if(f.valueTransfers>f.contractCalls&&txs.length>=20)return 'Value Mover';
    if(txs.length>=25)return 'Active Onchain User';
    return 'Base Newcomer';
  }

  function reconcileFingerprint(scan){
    if(typeof state==='undefined'||!state.fingerprint)return;
    const f=state.fingerprint;
    f.builderSignals=scan.count;
    if(f.dimensions) f.dimensions['Base attribution']=Math.round(Math.max(0,Math.min(100,scan.count?35+Math.log10(scan.count+1)*35:0)));
    f.insights=(f.insights||[]).filter(x=>!String(x).includes('ERC-8021')&&!String(x).includes('Builder Code'));
    if(scan.count) f.insights.push(`${scan.count.toLocaleString()} indexed transaction${scan.count===1?'':'s'} contain the exact 16-byte ERC-8021 marker; ${scan.codes.length.toLocaleString()} unique schema-0 builder code${scan.codes.length===1?'':'s'} decoded.`);
    else f.insights.push('No transaction with the exact 16-byte ERC-8021 attribution marker was found in the indexed normal-transaction history.');
    if(scan.count>=3&&f.uniqueContracts>=10) f.archetype='Attributed Builder Explorer';
    else if(f.archetype==='Attributed Builder Explorer') f.archetype=fallbackArchetype(f);
    try{if(typeof renderFingerprint==='function')renderFingerprint();if(typeof drawShareCard==='function')drawShareCard()}catch{}
  }

  function fmtDate(sec){return sec?new Date(sec*1000).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'—'}
  function shortHash(h){return h?`${h.slice(0,8)}…${h.slice(-6)}`:'—'}
  function ensureUI(){
    if(document.getElementById('builderAttribution'))return;
    const anchor=document.getElementById('stablecoinFlow')||document.getElementById('baseAppGraph')||document.getElementById('behaviorDelta')||document.querySelector('.fingerprint-card');if(!anchor)return;
    const el=document.createElement('article');el.id='builderAttribution';el.className='card section-card attribution-card';
    el.innerHTML=`<div class="card-head"><div><div class="eyebrow">BUILDER ATTRIBUTION FOOTPRINT</div><h3>Strict ERC-8021 signals in this wallet</h3></div><span class="badge">Exact 16-byte marker</span></div><p class="section-intro">Canonical marker validation plus schema-0 Builder Code decoding from public transaction calldata. Unsupported schema IDs are detected but not guessed.</p><div class="attribution-grid"><div><span>Attributed transactions</span><strong id="attrCount">—</strong><small id="attrShare">—</small></div><div><span>Unique builder codes</span><strong id="attrCodes">—</strong><small>Decoded schema 0 only</small></div><div><span>First detected</span><strong id="attrFirst">—</strong><small id="attrFirstTx">—</small></div><div><span>Latest detected</span><strong id="attrLast">—</strong><small id="attrLastTx">—</small></div></div><div class="attribution-bottom"><div><div class="eyebrow">TOP DECODED CODES</div><div id="attrCodeList" class="attr-list"></div></div><div><div class="eyebrow">SCHEMA IDs DETECTED</div><div id="attrSchemaList" class="attr-list"></div></div></div>`;
    anchor.insertAdjacentElement('afterend',el);
    const style=document.createElement('style');style.textContent=`.attribution-card{background:radial-gradient(circle at 85% 0,rgba(139,92,246,.11),transparent 34%),linear-gradient(180deg,rgba(17,26,42,.98),rgba(9,14,24,.98))}.attribution-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.attribution-grid>div{background:#080d16;border:1px solid #19243a;border-radius:14px;padding:14px}.attribution-grid span{display:block;color:#9facbf;font-size:12px}.attribution-grid strong{display:block;font-size:21px;margin:7px 0}.attribution-grid small{color:#718096;font-size:11px}.attribution-bottom{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:20px;padding-top:18px;border-top:1px solid #18243a}.attr-list{display:grid;gap:7px}.attr-row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #182235;color:#aebbd0;font-size:12px}.attr-row code{color:#c9b8ff}@media(max-width:850px){.attribution-grid{grid-template-columns:repeat(2,1fr)}.attribution-bottom{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }
  function renderList(id,rows,label){const root=document.getElementById(id);if(!root)return;root.innerHTML='';if(!rows.length){root.innerHTML='<div class="delta-empty">None detected.</div>';return}rows.slice(0,10).forEach(([key,count])=>{const d=document.createElement('div');d.className='attr-row';d.innerHTML=`<code>${label==='schema'?`schema ${key}`:String(key).replace(/[&<>"']/g,'')}</code><strong>${count}</strong>`;root.appendChild(d)})}
  function fixTimeline(scan){
    const root=document.getElementById('timeline');if(!root)return;
    [...root.querySelectorAll('.timeline-item')].forEach(item=>{const title=item.querySelector('strong')?.textContent||'';if(title.includes('Builder Code attribution'))item.remove()});
    if(!scan.first)return;
    const latest=[...root.querySelectorAll('.timeline-item')].find(x=>(x.querySelector('strong')?.textContent||'').includes('Latest indexed activity'));
    const d=document.createElement('div');d.className='timeline-item';d.innerHTML=`<strong>First strict ERC-8021 attribution</strong><small>${fmtDate(scan.first.time)} · ${shortHash(scan.first.hash)}</small>`;
    if(latest)root.insertBefore(d,latest);else root.appendChild(d);
  }
  function render(){
    ensureUI();if(typeof state==='undefined'||!Array.isArray(state.txs))return;
    const scan=scanTransactions(state.txs);globalThis.BaseBuilderAttribution.last=scan;reconcileFingerprint(scan);
    document.getElementById('attrCount').textContent=scan.count.toLocaleString();document.getElementById('attrShare').textContent=`${(scan.share*100).toFixed(2)}% of indexed normal transactions`;document.getElementById('attrCodes').textContent=scan.codes.length.toLocaleString();document.getElementById('attrFirst').textContent=fmtDate(scan.first?.time);document.getElementById('attrFirstTx').textContent=shortHash(scan.first?.hash);document.getElementById('attrLast').textContent=fmtDate(scan.last?.time);document.getElementById('attrLastTx').textContent=shortHash(scan.last?.hash);renderList('attrCodeList',scan.codes,'code');renderList('attrSchemaList',scan.schemas,'schema');fixTimeline(scan);
  }
  function init(){ensureUI();const d=document.getElementById('dashboard');if(!d)return;new MutationObserver(()=>{if(!d.classList.contains('hidden'))render()}).observe(d,{attributes:true,attributeFilter:['class']});const s=document.getElementById('status');if(s)new MutationObserver(()=>{if(!d.classList.contains('hidden'))render()}).observe(s,{childList:true,subtree:true});if(!d.classList.contains('hidden'))render()}
  globalThis.BaseBuilderAttribution={ERC8021_SUFFIX,parseAttribution,scanTransactions,last:null};if(typeof document!=='undefined')init();
})();
