const BLOCKSCOUT = 'https://base.blockscout.com';
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const STABLES = new Set(['USDC','USDT','DAI','USDS','EURC','USD+','USDBC','USDbC','USDG','PYUSD','GHO','USDe']);

const $ = (id) => document.getElementById(id);
const state = { address:'', info:null, tokens:[], nfts:[], txs:[], recent:[], currentFilter:'All', totalValue:0, ethValue:0, stableValue:0, metrics:null };

function short(a, left=6, right=4){ if(!a) return '—'; return `${a.slice(0,left)}…${a.slice(-right)}`; }
function money(v){ const n=Number(v||0); if(!Number.isFinite(n)) return '$0.00'; if(n>=1_000_000) return `$${(n/1_000_000).toFixed(2)}M`; if(n>=10_000) return `$${n.toLocaleString(undefined,{maximumFractionDigits:0})}`; if(n>=1) return `$${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; return `$${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})}`; }
function num(v){ return Number(v||0).toLocaleString(); }
function dateText(v){ if(!v) return '—'; const d = typeof v === 'number' ? new Date(v*1000) : new Date(v); return d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function units(raw, decimals=18){ const s=String(raw||'0'); const d=Number(decimals||0); if(!/^\d+$/.test(s)) return Number(raw||0); if(d===0) return Number(s); const padded=s.padStart(d+1,'0'); const whole=padded.slice(0,-d); const frac=padded.slice(-d).replace(/0+$/,'').slice(0,12); return Number(`${whole}.${frac||0}`); }
function normalizeImage(url){ if(!url) return ''; if(url.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${url.slice(7)}`; return url; }
function setStatus(text, error=false){ $('status').textContent=text; $('status').classList.toggle('error',error); }

async function getJSON(url){
  const r=await fetch(url,{headers:{accept:'application/json'}});
  if(!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

async function loadAddress(address){
  const encoded=encodeURIComponent(address);
  const urls={
    info:`${BLOCKSCOUT}/api/v2/addresses/${encoded}`,
    tokens:`${BLOCKSCOUT}/api/v2/addresses/${encoded}/token-balances`,
    nfts:`${BLOCKSCOUT}/api/v2/addresses/${encoded}/nft`,
    recent:`${BLOCKSCOUT}/api/v2/addresses/${encoded}/transactions`,
    txs:`${BLOCKSCOUT}/api?module=account&action=txlist&address=${encoded}&startblock=0&endblock=99999999&sort=asc&page=1&offset=10000`
  };
  const [info,tokens,nfts,recent,txs]=await Promise.allSettled(Object.values(urls).map(getJSON));
  const val = (x,fallback) => x.status==='fulfilled' ? x.value : fallback;
  state.info=val(info,{});
  state.tokens=val(tokens,[]);
  const nftPayload=val(nfts,{items:[]}); state.nfts=nftPayload.items||[];
  const recentPayload=val(recent,{items:[]}); state.recent=(recentPayload.items||[]).slice(0,20);
  const txPayload=val(txs,{result:[]}); state.txs=Array.isArray(txPayload.result)?txPayload.result:[];
  if(info.status==='rejected' && txs.status==='rejected') throw new Error('Base explorer data could not be loaded. Try again in a moment.');
}

function buildPortfolio(){
  const info=state.info||{};
  const ethBalance=units(info.coin_balance||0,18);
  const ethPrice=Number(info.exchange_rate||0);
  state.ethValue=ethBalance*ethPrice;
  const rows=[];
  if(ethBalance>0 || state.ethValue>0){ rows.push({symbol:'ETH',name:'Ether',amount:ethBalance,usd:state.ethValue,icon:'',type:'native'}); }
  for(const item of state.tokens){
    const t=item.token||{};
    if(t.type && t.type!=='ERC-20') continue;
    const amount=units(item.value||0,t.decimals||0);
    if(!(amount>0)) continue;
    const rate=Number(t.exchange_rate||0);
    rows.push({symbol:t.symbol||'TOKEN',name:t.name||'Token',amount,usd:rate>0?amount*rate:0,icon:t.icon_url||'',address:t.address_hash,type:t.type||'ERC-20'});
  }
  rows.sort((a,b)=>b.usd-a.usd || b.amount-a.amount);
  state.portfolio=rows;
  state.totalValue=rows.reduce((s,x)=>s+(x.usd||0),0);
  state.stableValue=rows.filter(x=>STABLES.has(x.symbol)).reduce((s,x)=>s+(x.usd||0),0);
}

function buildMetrics(){
  const txs=state.txs;
  const activeSet=new Set(); const contracts=new Set(); let gasWei=0n;
  for(const tx of txs){
    if(tx.timeStamp) activeSet.add(new Date(Number(tx.timeStamp)*1000).toISOString().slice(0,10));
    if(tx.to && tx.input && tx.input!=='0x') contracts.add(String(tx.to).toLowerCase());
    try{ gasWei += BigInt(tx.gasUsed||0)*BigInt(tx.gasPrice||0); }catch{}
  }
  const gasEth=Number(gasWei)/1e18;
  const first=txs[0]||null; const latest=txs[txs.length-1]||null;
  const diversity=(state.portfolio||[]).length;
  const txScore=Math.min(35, Math.log10(txs.length+1)*11);
  const dayScore=Math.min(25, Math.log10(activeSet.size+1)*12);
  const contractScore=Math.min(20, Math.log10(contracts.size+1)*9);
  const assetScore=Math.min(10, diversity*1.5);
  const nftScore=Math.min(10, state.nfts.length?4+Math.log10(state.nfts.length+1)*4:0);
  const score=Math.round(Math.min(100,txScore+dayScore+contractScore+assetScore+nftScore));
  const level=score>=75?'Power User':score>=50?'Explorer':score>=25?'Active':'New';
  state.metrics={txCount:txs.length,activeDays:activeSet.size,contracts:contracts.size,gasEth,gasUsd:gasEth*Number(state.info?.exchange_rate||0),first,latest,score,level};
}

function renderMetrics(){
  const m=state.metrics;
  $('portfolioValue').textContent=money(state.totalValue);
  $('portfolioSub').textContent=`${state.portfolio.length} fungible assets with available balances`;
  $('activityScore').textContent=`${m.score}/100`;
  $('activityLevel').textContent=`${m.level} · independent heuristic, not a Base score`;
  $('txCount').textContent=m.txCount>=10000?'10,000+':num(m.txCount);
  $('activeDays').textContent=num(m.activeDays);
  $('firstSeen').textContent=`First activity ${m.first?dateText(Number(m.first.timeStamp)):'—'}`;
  $('contractsUsed').textContent=num(m.contracts);
  $('gasSpent').textContent=`${m.gasEth.toFixed(m.gasEth<0.01?5:3)} ETH`;
  $('gasUsd').textContent=m.gasUsd?`≈ ${money(m.gasUsd)} at current ETH price`:'Historical ETH amount';
}

function renderTokens(){
  const rows=state.portfolio||[];
  $('tokenCount').textContent=`${rows.length} assets`;
  const root=$('tokenBreakdown'); root.innerHTML='';
  if(!rows.length){ root.innerHTML='<div class="empty">No fungible token balances found.</div>'; return; }
  for(const t of rows.slice(0,25)){
    const pct=state.totalValue>0?(t.usd/state.totalValue)*100:0;
    const row=document.createElement('div'); row.className='token-row';
    const icon=t.icon?`<img class="token-icon" src="${escapeHtml(t.icon)}" alt="" loading="lazy" onerror="this.style.display='none'">`:`<div class="token-icon token-icon-fallback">${escapeHtml((t.symbol||'?').slice(0,1))}</div>`;
    row.innerHTML=`<div class="token-main">${icon}<div class="token-name"><strong>${escapeHtml(t.symbol)}</strong><small>${escapeHtml(t.name)} · ${t.amount.toLocaleString(undefined,{maximumFractionDigits:6})}</small></div></div><div class="token-bar-wrap"><div class="token-bar" style="width:${Math.max(2,Math.min(100,pct))}%"></div><span>${pct.toFixed(1)}%</span></div><div class="token-value">${t.usd?money(t.usd):'<span class="muted">unpriced</span>'}</div>`;
    root.appendChild(row);
  }
  renderAllocation();
}

function renderAllocation(){
  const cost=Number($('costBasis').value||0); const target=Math.max(0,Math.min(100,Number($('targetStable').value||0)));
  const share=state.totalValue>0?(state.stableValue/state.totalValue)*100:0;
  $('stableShare').textContent=`${share.toFixed(1)}%`;
  const diff=share-target; $('targetDiff').textContent=`${diff>=0?'+':''}${diff.toFixed(1)} pp`;
  if(cost>0){ const pnl=state.totalValue-cost; const el=$('pnlValue'); el.textContent=`${pnl>=0?'+':''}${money(pnl)} (${((pnl/cost)*100).toFixed(1)}%)`; el.className=pnl>=0?'positive':'negative'; } else { $('pnlValue').textContent='Add cost basis'; $('pnlValue').className=''; }
}

function classifyTx(tx){
  const method=String(tx.method||'').toLowerCase();
  if(method.includes('swap')||method.includes('exactinput')||method.includes('exactoutput')) return 'Swap';
  if(method.includes('mint')) return 'NFT mint';
  if(method.includes('approve')||method.includes('permit')) return 'Approval';
  if(method.includes('transfer')) return 'Transfer';
  if(tx.to?.is_contract) return 'Contract';
  return 'Transfer';
}

function matchesFilter(tx, filter){
  if(!filter || filter === 'All') return true;
  const type = classifyTx(tx);
  if(filter === 'Transfer') return type === 'Transfer';
  if(filter === 'Swap') return type === 'Swap';
  if(filter === 'NFT') return type === 'NFT mint' || type.includes('NFT');
  if(filter === 'Contract Interaction') return type === 'Contract' || type === 'Contract Interaction' || Boolean(tx.to?.is_contract);
  return false;
}

function renderRecent(){
  const root=$('recentActivity'); root.innerHTML='';
  if(!state.recent.length){ root.innerHTML='<div class="empty">No recent transactions returned by the explorer.</div>'; return; }
  const filtered = state.recent.filter(tx => matchesFilter(tx, state.currentFilter));
  if(!filtered.length){ root.innerHTML=`<div class="empty">No recent transactions matching "${escapeHtml(state.currentFilter)}".</div>`; return; }
  for(const tx of filtered){
    const type=classifyTx(tx); const target=tx.to?.name||tx.to?.ens_domain_name||short(tx.to?.hash||''); const method=tx.method||target||'Transaction';
    const row=document.createElement('div'); row.className='activity-row';
    row.innerHTML=`<div class="activity-type">${escapeHtml(type)}</div><div class="activity-method">${escapeHtml(method)}${target&&target!==method?` · ${escapeHtml(target)}`:''}</div><div class="activity-date">${escapeHtml(dateText(tx.timestamp))}</div><a class="tx-link" href="${BLOCKSCOUT}/tx/${encodeURIComponent(tx.hash)}" target="_blank" rel="noreferrer">${short(tx.hash,5,4)} ↗</a>`;
    root.appendChild(row);
  }
}

function renderTimeline(){
  const txs=state.txs; const root=$('timeline'); root.innerHTML='';
  if(!txs.length){ root.innerHTML='<div class="empty">No timeline data found.</div>'; return; }
  const first=txs[0]; const firstContract=txs.find(t=>t.input&&t.input!=='0x'&&t.to); const latest=txs[txs.length-1];
  const milestones=[
    {title:'First Base transaction',date:Number(first.timeStamp),sub:short(first.hash)},
    firstContract?{title:'First contract interaction',date:Number(firstContract.timeStamp),sub:short(firstContract.to)}:null,
    state.nfts.length?{title:'NFT collector',date:null,sub:`${state.nfts.length}${state.nfts.length>=50?'+':''} NFTs currently indexed`}:null,
    {title:'Latest indexed activity',date:Number(latest.timeStamp),sub:short(latest.hash)}
  ].filter(Boolean);
  milestones.forEach(m=>{const d=document.createElement('div');d.className='timeline-item';d.innerHTML=`<strong>${escapeHtml(m.title)}</strong><small>${m.date?dateText(m.date):escapeHtml(m.sub)}${m.date?` · ${escapeHtml(m.sub)}`:''}</small>`;root.appendChild(d);});
}

function renderNFTs(){
  const root=$('nftGrid'); root.innerHTML=''; $('nftCount').textContent=`${state.nfts.length}${state.nfts.length>=50?'+':''} NFTs`;
  if(!state.nfts.length){ root.innerHTML='<div class="empty" style="grid-column:1/-1">No NFTs currently returned for this address.</div>'; return; }
  for(const n of state.nfts.slice(0,24)){
    const token=n.token||{}; const meta=n.metadata||n.token_instance?.metadata||{}; const img=normalizeImage(n.image_url||meta.image_url||meta.image||'');
    const title=meta.name||`${token.symbol||token.name||'NFT'} #${n.id||n.token_id||''}`;
    const c=document.createElement('div'); c.className='nft-card';
    c.innerHTML=`${img?`<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">`:'<div style="aspect-ratio:1;display:grid;place-items:center;background:#111827;color:#6f86a8">NFT</div>'}<div class="nft-meta"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(token.name||token.symbol||short(token.address_hash||''))}</small></div>`;
    root.appendChild(c);
  }
}

function drawShareCard(){
  const c=$('shareCanvas'),ctx=c.getContext('2d'); const m=state.metrics||{score:0,activeDays:0,txCount:0,contracts:0};
  const g=ctx.createLinearGradient(0,0,c.width,c.height); g.addColorStop(0,'#071126');g.addColorStop(.55,'#0b2c72');g.addColorStop(1,'#155eef');ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
  ctx.globalAlpha=.11;ctx.strokeStyle='#ffffff';ctx.lineWidth=2;for(let i=-300;i<1400;i+=180){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+500,630);ctx.stroke()}ctx.globalAlpha=1;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(1015,140,90,0,Math.PI*2);ctx.fill();ctx.fillStyle='#155eef';ctx.font='900 110px system-ui';ctx.textAlign='center';ctx.fillText('—',1015,177);ctx.textAlign='left';
  ctx.fillStyle='#8fb6ff';ctx.font='800 24px system-ui';ctx.fillText('BASE EXPLORER CARD',72,88);
  ctx.fillStyle='#fff';ctx.font='900 62px system-ui';ctx.fillText('My Base Journey',72,165);
  ctx.fillStyle='#bcd3ff';ctx.font='500 24px ui-monospace, monospace';ctx.fillText(short(state.address,10,8),72,213);
  const stats=[['ACTIVITY SCORE',`${m.score}/100`],['TRANSACTIONS',m.txCount>=10000?'10,000+':num(m.txCount)],['ACTIVE DAYS',num(m.activeDays)],['CONTRACTS USED',num(m.contracts)]];
  stats.forEach((s,i)=>{const x=72+(i%2)*330,y=300+Math.floor(i/2)*125;ctx.fillStyle='#87afff';ctx.font='700 17px system-ui';ctx.fillText(s[0],x,y);ctx.fillStyle='#fff';ctx.font='900 42px system-ui';ctx.fillText(s[1],x,y+51)});
  ctx.fillStyle='#dce8ff';ctx.font='600 20px system-ui';ctx.fillText(`First seen: ${m.first?dateText(Number(m.first.timeStamp)):'—'}  •  Portfolio: ${money(state.totalValue)}`,72,565);
  ctx.fillStyle='rgba(255,255,255,.65)';ctx.font='600 17px system-ui';ctx.textAlign='right';ctx.fillText('built by @1kipcak  •  github.com/huklaa',1128,595);ctx.textAlign='left';
}

function downloadCard(){ drawShareCard(); const a=document.createElement('a');a.href=$('shareCanvas').toDataURL('image/png');a.download=`base-card-${state.address.slice(2,8)}.png`;a.click(); }

async function analyze(){
  const address=$('addressInput').value.trim();
  if(!ADDRESS_RE.test(address)){ setStatus('Enter a valid 0x address (40 hexadecimal characters).',true); return; }
  $('analyzeBtn').disabled=true; setStatus('Reading public Base data…');
  try{
    state.address=address; await loadAddress(address); buildPortfolio(); buildMetrics();
    $('explorerAddress').href=`${BLOCKSCOUT}/address/${address}`;
    renderMetrics();renderTokens();renderRecent();renderTimeline();renderNFTs();drawShareCard();
    $('dashboard').classList.remove('hidden');
    history.replaceState(null,'',`${location.pathname}?address=${encodeURIComponent(address)}`);
    const partial = state.txs.length>=10000?' Activity metrics are capped at the explorer’s first 10,000 indexed transactions.':'';
    setStatus(`Loaded public Base data for ${short(address)}.${partial}`);
    $('dashboard').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){ console.error(e); setStatus(e.message||'Could not load Base data.',true); }
  finally{$('analyzeBtn').disabled=false;}
}

$('analyzeBtn').addEventListener('click',analyze);
$('addressInput').addEventListener('keydown',e=>{if(e.key==='Enter') analyze();});
$('costBasis').addEventListener('input',renderAllocation);$('targetStable').addEventListener('input',renderAllocation);
$('downloadCard').addEventListener('click',downloadCard);

const activityFilters = $('activityFilters');
if(activityFilters){
  activityFilters.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if(!btn) return;
    const filter = btn.dataset.filter;
    if(!filter) return;
    state.currentFilter = filter;
    activityFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderRecent();
  });
}

const initial=new URLSearchParams(location.search).get('address');
if(initial&&ADDRESS_RE.test(initial)){$('addressInput').value=initial;analyze();}
