(function(root){
  async function readJSON(url,options={},parse=JSON.parse,timeoutMs=15000,fetchImpl=fetch){
    const controller=new AbortController();let timer;
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('API request timed out'));controller.abort();},timeoutMs);});
    const request=(async()=>{const response=await fetchImpl(url,{...options,signal:controller.signal});if(!response.ok){let detail='';if(String(url).startsWith('/api/history?')){try{const d=JSON.parse(await response.text());detail=': '+[d.error,d.reason,d.stage,d.upstreamStatus].filter(v=>typeof v==='string'||typeof v==='number').join(' / ').slice(0,200);}catch{}}throw Error('API '+response.status+detail);}return parse(await response.text());})();
    try{return await Promise.race([request,deadline]);}finally{clearTimeout(timer);}
  }
  function transactionRows(payload){
    if(!payload||!Array.isArray(payload.result))throw Error('Transaction history unavailable: invalid explorer response');
    if(payload.status==='0'&&!(payload.result.length===0&&/no transactions/i.test(payload.message||'')))throw Error('Transaction history unavailable: explorer error');
    return payload.result;
  }
  async function history(address,fetchImpl=fetch){
    if(!/^0x[0-9a-f]{40}$/i.test(address))throw Error('Invalid address');
    const config=await readJSON('/api/explorer-config',{},JSON.parse,5000,fetchImpl);
    if(config.historyProvider!=='envio'){
      return readJSON('https://base.blockscout.com/api?module=account&action=txlist&address='+address+'&startblock=0&endblock=99999999&sort=asc&page=1&offset=10000',{},JSON.parse,45000,fetchImpl);
    }
    const rows=[],seen=new Set();let from=0,end;const started=Date.now();
    for(let page=0;page<80;page++){
      if(Date.now()-started>90000)throw Error('History scan timed out; totals unavailable');
      const data=await readJSON('/api/history?address='+address+'&from='+from+(end===undefined?'':'&to='+end),{},JSON.parse,15000,fetchImpl);
      if(!Array.isArray(data.result)||!Number.isSafeInteger(data.nextBlock)||data.nextBlock<=from||
         !Number.isSafeInteger(data.endBlock)||data.nextBlock>data.endBlock||(end!==undefined&&data.endBlock!==end)||
         data.complete!==(data.nextBlock===data.endBlock))throw Error('Invalid history pagination');
      end=data.endBlock;from=data.nextBlock;
      for(const tx of data.result){if(seen.has(tx.hash))throw Error('Duplicate history transaction');seen.add(tx.hash);rows.push(tx);}
      if(rows.length>10000)throw Error('History exceeds 10,000 transactions; totals unavailable');
      if(data.complete)return {status:'1',result:rows.sort((a,b)=>Number(a.blockNumber)-Number(b.blockNumber)||Number(a.transactionIndex)-Number(b.transactionIndex)),provider:'envio',endBlock:end};
    }
    throw Error('History scan incomplete; totals unavailable');
  }
  root.BaseApi={readJSON,transactionRows,history};
  if(typeof module!=='undefined')module.exports={readJSON,transactionRows,history};
})(globalThis);
