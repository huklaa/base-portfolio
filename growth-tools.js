(function(){
'use strict';
const RE=/^0x[a-fA-F0-9]{40}$/;
const EXAMPLE='0x39d9943779f5f26ad7b86f5e21eb7d50073308c2';
const search=document.querySelector('.search-panel');
if(!search)return;
const area=document.createElement('div');area.className='base-quickstart';
area.innerHTML='<p><strong>New to Base Portfolio?</strong> Try a public address, or paste your own. No wallet connection.</p><button type="button" class="secondary-action" id="tryExampleBase">Try example wallet ↗</button><button type="button" class="secondary-action" id="saveBaseWatch">☆ Save this address</button><button type="button" class="secondary-action" id="exportBaseCsv">Export indexed transactions (CSV)</button><div id="baseWatchList" class="recent-list" aria-label="Saved addresses"></div><p id="baseQuickStatus" role="status" aria-live="polite" class="section-intro"></p><p class="section-intro">Results are read-only snapshots from public explorer APIs. Activity is limited to the first 10,000 indexed transactions; counts may be incomplete for larger wallets. Saved addresses stay in this browser.</p>';
search.append(area);
const status=area.querySelector('#baseQuickStatus'),input=document.getElementById('addressInput');
const setStatus=x=>{status.textContent=x};
const key='basePortfolioWatchlistV1';
function read(){try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a.filter(x=>RE.test(x)).slice(0,30):[]}catch{return []}}
function write(a){try{localStorage.setItem(key,JSON.stringify(a))}catch{setStatus('Browser storage is not available.')}}
function show(){const root=area.querySelector('#baseWatchList');root.replaceChildren();const addresses=read();if(!addresses.length)return;const title=document.createElement('strong');title.textContent='Saved watchlist ('+addresses.length+'/30)';root.append(title);for(const a of addresses){const line=document.createElement('div');line.className='recent-head';const b=document.createElement('button');b.type='button';b.className='link-button';b.textContent=a.slice(0,10)+'…'+a.slice(-6);b.addEventListener('click',()=>{input.value=a;document.getElementById('analyzeBtn')?.click()});const rm=document.createElement('button');rm.type='button';rm.className='link-button';rm.textContent='Remove';rm.setAttribute('aria-label','Remove '+a);rm.addEventListener('click',()=>{write(read().filter(x=>x.toLowerCase()!==a.toLowerCase()));show()});line.append(b,rm);root.append(line)}}
area.querySelector('#tryExampleBase').addEventListener('click',()=>{input.value=EXAMPLE;setStatus('Showing an independent public Base address. Balances and activity are live, not mock data.');document.getElementById('analyzeBtn')?.click()});
area.querySelector('#saveBaseWatch').addEventListener('click',()=>{const a=input.value.trim();if(!RE.test(a)){setStatus('Enter a valid public 0x address before saving.');return}const list=read();write([a,...list.filter(x=>x.toLowerCase()!==a.toLowerCase())].slice(0,30));show();setStatus('Saved locally on this device.')});
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
area.querySelector('#exportBaseCsv').addEventListener('click',()=>{
 const st=typeof state!=='undefined'?state:null;
 if(!st||!RE.test(st.address)||!Array.isArray(st.txs)||!st.txs.length){setStatus('Analyze an address with indexed transactions before exporting.');return}
 const columns=['hash','timeStamp','from','to','value','gasUsed','gasPrice','isError'];
 const lines=[columns.join(','),...st.txs.map(tx=>columns.map(k=>csvCell(tx[k])).join(','))];
 const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='base-transactions-'+st.address.slice(2,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 setStatus('Exported up to '+st.txs.length+' indexed transactions. Not a tax report: verify all amounts and completeness.');
});
show();
})();