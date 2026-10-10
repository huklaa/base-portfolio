(function(){
'use strict';
const dashboard=document.getElementById('dashboard');
if(!dashboard)return;
const card=document.createElement('article');card.className='card section-card';card.id='baseActivityCharts';
card.innerHTML='<div class="card-head"><div><div class="eyebrow">WALLET HISTORY</div><h3>Monthly activity & gas trends</h3></div><span class="badge">Indexed transactions</span></div><p class="section-intro">These charts summarize the explorer’s first 10,000 indexed transactions, not historical wallet value. For high-volume addresses the timeline may be incomplete.</p><div class="base-chart-grid"><div><strong>Transactions by month</strong><canvas id="baseTxChart" height="230" role="img" aria-label="Transactions per month bar chart"></canvas></div><div><strong>Estimated ETH gas by month</strong><canvas id="baseGasChart" height="230" role="img" aria-label="Gas spent per month bar chart"></canvas></div></div><p id="baseChartStatus" class="section-intro" role="status">Analyze a wallet to view activity.</p>';
const target=dashboard.querySelector('.metric-grid');if(target)target.after(card);else dashboard.append(card);
const style=document.createElement('style');style.textContent='.base-chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:14px}.base-chart-grid canvas{width:100%;max-width:100%;display:block;margin-top:8px}@media(max-width:750px){.base-chart-grid{grid-template-columns:1fr}}';document.head.append(style);
const status=card.querySelector('#baseChartStatus');let rendered='';
function paint(canvas,values,labels,unit){
 const scale=window.devicePixelRatio||1,box=canvas.getBoundingClientRect(),width=Math.max(280,box.width||360),height=230;
 canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
 const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.clearRect(0,0,width,height);
 const left=48,right=12,top=22,bottom=35,plot=width-left-right,avail=height-top-bottom;
 const max=Math.max(1,...values);ctx.font='12px system-ui';ctx.fillStyle='#a7bde0';
 for(let i=0;i<=4;i++){const y=top+avail*i/4;ctx.strokeStyle='#26344b';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();ctx.fillText((max*(4-i)/4).toFixed(unit==='ETH'?4:0),3,y+4);}
 const barWidth=plot/Math.max(1,values.length);
 values.forEach((v,i)=>{const barHeight=v/max*avail;ctx.fillStyle='#377cff';ctx.fillRect(left+i*barWidth+2,top+avail-barHeight,Math.max(1,barWidth-4),barHeight);});
 const step=Math.max(1,Math.ceil(labels.length/6));
 labels.forEach((label,i)=>{if(i%step)return;ctx.fillStyle='#b4c5df';ctx.fillText(label.slice(2),left+i*barWidth, height-10)});
}
function render(){
 if(typeof state==='undefined'||!state.address||!Array.isArray(state.txs))return;
 const key=state.address.toLowerCase()+':'+state.txs.length+':'+(state.txs.at(-1)?.hash||'');
 if(key===rendered)return;rendered=key;
 const monthly=new Map();
 for(const tx of state.txs){
  const stamp=Number(tx.timeStamp);if(!Number.isFinite(stamp)||stamp<=0)continue;
  const month=new Date(stamp*1000).toISOString().slice(0,7);
  const item=monthly.get(month)||{count:0,gas:0};item.count++;
  const used=Number(tx.gasUsed),price=Number(tx.gasPrice);
  if(Number.isFinite(used)&&Number.isFinite(price)&&used>=0&&price>=0)item.gas+=(used*price)/1e18;
  monthly.set(month,item);
 }
 const months=[...monthly.keys()].sort().slice(-18);
 if(!months.length){status.textContent='No indexed transaction timestamps available.';return;}
 paint(card.querySelector('#baseTxChart'),months.map(x=>monthly.get(x).count),months,'tx');
 paint(card.querySelector('#baseGasChart'),months.map(x=>monthly.get(x).gas),months,'ETH');
 status.textContent='Showing '+months.length+' months present in the indexed history. Not an estimate of total lifetime activity.';
}
new MutationObserver(()=>{if(!dashboard.classList.contains('hidden'))render()}).observe(dashboard,{attributes:true,attributeFilter:['class']});
document.getElementById('analyzeBtn')?.addEventListener('click',()=>{rendered='';setTimeout(render,1800)});
})();