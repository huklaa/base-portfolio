(function(root){
  async function readJSON(url,options={},parse=JSON.parse,timeoutMs=15000,fetchImpl=fetch){
    const controller=new AbortController();let timer;
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('API request timed out'));controller.abort();},timeoutMs);});
    const request=(async()=>{const response=await fetchImpl(url,{...options,signal:controller.signal});if(!response.ok)throw Error('API '+response.status);return parse(await response.text());})();
    try{return await Promise.race([request,deadline]);}finally{clearTimeout(timer);}
  }
  function transactionRows(payload){
    if(!payload||!Array.isArray(payload.result))throw Error('Transaction history unavailable: invalid explorer response');
    if(payload.status==='0'&&!(payload.result.length===0&&/no transactions/i.test(payload.message||'')))throw Error('Transaction history unavailable: explorer error');
    return payload.result;
  }
  root.BaseApi={readJSON,transactionRows};
  if(typeof module!=='undefined')module.exports={readJSON,transactionRows};
})(globalThis);
