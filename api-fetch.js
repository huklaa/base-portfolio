(function(root){
  async function readJSON(url,options={},parse=JSON.parse,timeoutMs=15000,fetchImpl=fetch){
    const controller=new AbortController();let timer;
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('API request timed out'));controller.abort();},timeoutMs);});
    const request=(async()=>{const response=await fetchImpl(url,{...options,signal:controller.signal});if(!response.ok)throw Error('API '+response.status);return parse(await response.text());})();
    try{return await Promise.race([request,deadline]);}finally{clearTimeout(timer);}
  }
  root.BaseApi={readJSON};
  if(typeof module!=='undefined')module.exports={readJSON};
})(globalThis);
