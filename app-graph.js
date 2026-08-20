(function(){
  function ts(tx){ const n=Number(tx?.timeStamp||0); return Number.isFinite(n)?n:0; }
  function contract(tx){ const to=typeof tx?.to==='string'?tx.to:tx?.to?.hash; const input=String(tx?.input||''); return to&&input&&input!=='0x'?String(to).toLowerCase():''; }
  function fmtDate(sec){ return sec?new Date(sec*1000).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'—'; }
  function short(a){ return a?`${a.slice(0,8)}…${a.slice(-6)}`:'—'; }

  function buildGraph(txs){
    const map=new Map();
    for(const tx of txs||[]){
      const a=contract(tx); if(!a) continue;
      const t=ts(tx); const row=map.get(a)||{address:a,count:0,first:t,last:t};
      row.count++; if(t&&(!row.first||t<row.first)) row.first=t; if(t>row.last) row.last=t; map.set(a,row);
    }
    const nodes=[...map.values()].sort((a,b)=>b.count-a.count).slice(0,10);
    const total=[...map.values()].reduce((s,x)=>s+x.count,0);
    nodes.forEach(n=>{n.share=total?n.count/total:0;n.repeat=n.count>1;});
    return {nodes,total};
  }

  function recentLabels(){
    const labels=new Map();
    if(typeof state==='undefined') return labels;
    for(const tx of state.recent||[]){
      const a=typeof tx?.to==='string'?tx.to:tx?.to?.hash; if(!a) continue;
      const name=tx?.to?.name||tx?.to?.ens_domain_name||'';
      if(name) labels.set(String(a).toLowerCase(),name);
    }
    return labels;
  }

  async function enrich(nodes,labels){
    const unknown=nodes.filter(n=>!labels.has(n.address)).slice(0,8);
    await Promise.allSettled(unknown.map(async n=>{
      const r=await fetch(`https://base.blockscout.com/api/v2/addresses/${encodeURIComponent(n.address)}`,{headers:{accept:'application/json'}});
      if(!r.ok) return; const j=await r.json(); const name=j.name||j.metadata?.name||j.ens_domain_name||''; if(name) labels.set(n.address,name);
    }));
  }

  function ensureUI(){
    if(document.getElementById('baseAppGraph')) return;
    const anchor=document.getElementById('behaviorDelta')||document.querySelector('.fingerprint-card'); if(!anchor) return;
    const el=document.createElement('article'); el.id='baseAppGraph'; el.className='card section-card app-graph-card';
    el.innerHTML=`<div class="card-head"><div><div class="eyebrow">BASE APP GRAPH</div><h3>Which apps does this wallet actually return to?</h3></div><span class="badge">Top 10 relationships</span></div><p class="section-intro">A wallet-to-contract relationship view built from public Base interactions. Edge strength reflects interaction count; first/last dates show relationship history.</p><div class="app-graph-layout"><div class="app-graph-visual"><svg id="appGraphSvg" viewBox="0 0 900 500" role="img" aria-label="Base wallet app relationship graph"></svg></div><div id="appGraphTable" class="app-graph-table"></div></div>`;
    anchor.insertAdjacentElement('afterend',el);
    const style=document.createElement('style'); style.textContent=`.app-graph-card{background:radial-gradient(circle at 90% 10%,rgba(92,99,255,.12),transparent 35%),linear-gradient(180deg,rgba(17,26,42,.98),rgba(9,14,24,.98))}.app-graph-layout{display:grid;grid-template-columns:1.2fr .8fr;gap:22px;margin-top:20px}.app-graph-visual{min-height:360px;border:1px solid #19243a;border-radius:16px;background:#070d17;overflow:hidden}.app-graph-visual svg{width:100%;height:100%;min-height:360px}.app-edge{stroke:#335f9d;stroke-opacity:.58}.app-node{fill:#155eef;stroke:#9fc0ff;stroke-width:2}.wallet-node{fill:#f8fbff;stroke:#5f94ff;stroke-width:4}.graph-label{fill:#dce8ff;font:600 14px system-ui}.graph-sub{fill:#7187a8;font:500 11px system-ui}.app-graph-table{display:grid;gap:8px}.app-graph-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:11px 0;border-bottom:1px solid #182235}.app-graph-row strong{display:block;font-size:13px}.app-graph-row small{display:block;color:#718096;margin-top:3px}.app-graph-row a{color:#9bc0ff;text-decoration:none}.app-share{font-size:12px;font-weight:900;color:#cfe0ff;border:1px solid #29476f;background:#0a1830;border-radius:999px;padding:6px 8px;height:max-content}@media(max-width:850px){.app-graph-layout{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  function draw(graph,labels){
    const svg=document.getElementById('appGraphSvg'); const table=document.getElementById('appGraphTable'); if(!svg||!table) return;
    svg.innerHTML=''; table.innerHTML='';
    if(!graph.nodes.length){ table.innerHTML='<div class="empty">No contract relationships found.</div>'; return; }
    const NS='http://www.w3.org/2000/svg', cx=450, cy=250, rx=310, ry=175;
    const wallet=document.createElementNS(NS,'circle'); wallet.setAttribute('cx',cx);wallet.setAttribute('cy',cy);wallet.setAttribute('r',45);wallet.setAttribute('class','wallet-node');svg.appendChild(wallet);
    const wt=document.createElementNS(NS,'text');wt.setAttribute('x',cx);wt.setAttribute('y',cy+5);wt.setAttribute('text-anchor','middle');wt.setAttribute('class','graph-label');wt.textContent='WALLET';svg.appendChild(wt);
    graph.nodes.forEach((n,i)=>{
      const angle=(Math.PI*2*i/graph.nodes.length)-Math.PI/2, x=cx+Math.cos(angle)*rx, y=cy+Math.sin(angle)*ry;
      const line=document.createElementNS(NS,'line');line.setAttribute('x1',cx);line.setAttribute('y1',cy);line.setAttribute('x2',x);line.setAttribute('y2',y);line.setAttribute('class','app-edge');line.setAttribute('stroke-width',String(1+Math.min(10,n.count/3)));svg.appendChild(line);
      const circle=document.createElementNS(NS,'circle');circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r',String(16+Math.min(22,Math.log2(n.count+1)*5)));circle.setAttribute('class','app-node');svg.appendChild(circle);
      const label=document.createElementNS(NS,'text');label.setAttribute('x',x);label.setAttribute('y',y+42);label.setAttribute('text-anchor','middle');label.setAttribute('class','graph-label');label.textContent=(labels.get(n.address)||short(n.address)).slice(0,22);svg.appendChild(label);
      const sub=document.createElementNS(NS,'text');sub.setAttribute('x',x);sub.setAttribute('y',y+58);sub.setAttribute('text-anchor','middle');sub.setAttribute('class','graph-sub');sub.textContent=`${n.count} calls`;svg.appendChild(sub);
      const row=document.createElement('div');row.className='app-graph-row';row.innerHTML=`<div><strong>${(labels.get(n.address)||short(n.address)).replace(/[&<>"']/g,'')}</strong><small>${n.count} interactions · ${n.repeat?'repeat':'one-time'} · ${fmtDate(n.first)} → ${fmtDate(n.last)}</small><small><a href="https://base.blockscout.com/address/${encodeURIComponent(n.address)}" target="_blank" rel="noreferrer">${short(n.address)} ↗</a></small></div><div class="app-share">${Math.round(n.share*100)}%</div>`;table.appendChild(row);
    });
  }

  async function render(){ ensureUI(); if(typeof state==='undefined'||!Array.isArray(state.txs)) return; const graph=buildGraph(state.txs),labels=recentLabels(); draw(graph,labels); await enrich(graph.nodes,labels); draw(graph,labels); }
  function init(){ ensureUI(); const d=document.getElementById('dashboard'); if(!d)return; new MutationObserver(()=>{if(!d.classList.contains('hidden'))render();}).observe(d,{attributes:true,attributeFilter:['class']}); const s=document.getElementById('status'); if(s)new MutationObserver(()=>{if(!d.classList.contains('hidden'))render();}).observe(s,{childList:true,subtree:true}); if(!d.classList.contains('hidden'))render(); }
  globalThis.BaseAppGraph={buildGraph}; if(typeof document!=='undefined')init();
})();
