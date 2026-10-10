(function(root){
  'use strict';
  function createGate(nativeFetch,{origin='https://base-portfolio.xyz',gapMs=250,timeoutMs=12000,cacheMs=120000,configured=async()=>false}={}){
    const cache=new Map();let queue=Promise.resolve(),lastStarted=0;
    const abortError=()=>new DOMException('Request aborted','AbortError');
    function wait(ms,signal){return new Promise((resolve,reject)=>{if(signal?.aborted)return reject(abortError());const finish=()=>{signal?.removeEventListener('abort',abort);resolve();};const timer=setTimeout(finish,ms);const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(abortError());};signal?.addEventListener('abort',abort,{once:true});});}
    async function gatedFetch(input,init={}){
      let url;try{url=new URL(typeof input==='string'?input:input.url,origin);}catch{return nativeFetch(input,init);}
      if(url.hostname!=='base.blockscout.com'||(init.method||input?.method||'GET').toUpperCase()!=='GET')return nativeFetch(input,init);
      const signal=init.signal||input?.signal;if(signal?.aborted)throw abortError();
      const key=url.href,hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.response.clone();
      const previous=queue;let release;queue=new Promise(r=>{release=r;});
      await previous;
      try{
        if(signal?.aborted)throw abortError();
        const hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.response.clone();
        await wait(Math.max(0,gapMs-(Date.now()-lastStarted)),signal);
        const useProxy=await configured();if(signal?.aborted)throw abortError();
        const target=useProxy?new URL('/api/explorer?path='+encodeURIComponent(url.pathname+url.search),origin).href:url.href;
        lastStarted=Date.now();
        const controller=new AbortController();let timer,abort;
        const deadline=new Promise((_,reject)=>{
          timer=setTimeout(()=>{reject(Error('Explorer request timed out'));controller.abort();},timeoutMs);
          abort=()=>{reject(abortError());controller.abort();};signal?.addEventListener('abort',abort,{once:true});
          if(signal?.aborted)abort();
        });
        try{
          const request=(async()=>{
            const response=await nativeFetch(target,{...init,signal:controller.signal});
            // Buffer the body inside the deadline: a stalled body must release the queue too.
            const bytes=await response.arrayBuffer();
            return new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers});
          })();
          const response=await Promise.race([request,deadline]);
          // Never retry 403/challenges, authentication errors, cancellations or rate limits.
          if(response.ok&&response.headers.get('content-type')?.includes('application/json')){
            cache.set(key,{expires:Date.now()+cacheMs,response:response.clone()});
            if(cache.size>100)cache.delete(cache.keys().next().value);
          }
          return response;
        }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
      }finally{release();}
    }
    return {fetch:gatedFetch,cache};
  }
  if(typeof module!=='undefined')module.exports={createGate};
  if(typeof window==='undefined'||!root.fetch||root.__baseBlockscoutQueueInstalled)return;
  root.__baseBlockscoutQueueInstalled=true;
  const nativeFetch=root.fetch.bind(root);let configuration;
  async function configured(){
    if(!configuration)configuration=(async()=>{
      if(location.hostname.endsWith('github.io'))return false;
      const controller=new AbortController();let timer;
      try{return await Promise.race([
        nativeFetch('/api/explorer-config',{signal:controller.signal}).then(async r=>r.ok&&(await r.json()).configured===true),
        new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(false);},2500);})
      ]);}catch{return false;}finally{clearTimeout(timer);}
    })();
    return configuration;
  }
  const gate=createGate(nativeFetch,{origin:location.origin,configured});
  root.BaseBlockscoutGate=gate;root.fetch=gate.fetch;
})(globalThis);
