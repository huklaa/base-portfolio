// Only this app's read-only Base queries are allowed. No arbitrary hosts or RPC writes.
const ADDRESS='0x[0-9a-fA-F]{40}';
const REST=new RegExp('^/api/v2/(?:addresses/'+ADDRESS+'(?:/(?:token-balances|nft|transactions|counters|token-transfers))?|proxy/account-abstraction/(?:accounts/'+ADDRESS+'|operations))$');
const QUERY_KEYS=new Set(['module','action','address','startblock','endblock','sort','page','offset','contractaddress','type','block_number','index','items_count','hash','sender','page_size','filter','token','token_contract_address_hash','token_id','value','fiat_value','id','inserted_at','transaction_index','batch_key','batch_block_hash','batch_transaction_hash','batch_log_index','batch_index']);
export function upstreamURL(path){
  if(typeof path!=='string'||path.length>3000||!path.startsWith('/api'))throw Error('Invalid path');
  const local=new URL(path,'https://base.blockscout.com');
  if(local.origin!=='https://base.blockscout.com'||local.hash)throw Error('Invalid origin');
  const isLegacy=local.pathname==='/api';
  if(!isLegacy&&!REST.test(local.pathname))throw Error('Unsupported route');
  for(const [key,value] of local.searchParams){if(!QUERY_KEYS.has(key)||value.length>300||local.searchParams.getAll(key).length!==1)throw Error('Invalid query');}
  if(isLegacy){
    if(local.searchParams.get('module')!=='account'||!['txlist','tokentx'].includes(local.searchParams.get('action'))||!new RegExp('^'+ADDRESS+'$').test(local.searchParams.get('address')||''))throw Error('Unsupported action');
    for(const key of ['page','offset','startblock','endblock']){const v=local.searchParams.get(key);if(v!==null&&!/^\d+$/.test(v))throw Error('Invalid number');}
    if(Number(local.searchParams.get('offset')||0)>10000||Number(local.searchParams.get('page')||1)>100)throw Error('Request exceeds cap');
  }
  return 'https://api.blockscout.com/8453'+local.pathname+local.search;
}
export async function onRequestGet({request,env}){
  const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
  const error=(status,message)=>Response.json({error:message},{status,headers});
  let url;try{url=upstreamURL(new URL(request.url).searchParams.get('path'));}catch{return error(400,'Unsupported explorer query');}
  if(!env.BLOCKSCOUT_API_KEY)return error(503,'Explorer provider is not configured');
  const controller=new AbortController();let timer;
  try{
    const operation=(async()=>{
      const response=await fetch(url,{headers:{Accept:'application/json',Authorization:'Bearer '+env.BLOCKSCOUT_API_KEY},signal:controller.signal,redirect:'error'});
      if(!response.ok)return error(response.status===429?429:502,'Explorer provider unavailable');
      const payload=await response.text();
      JSON.parse(payload); // Validate JSON without rounding large integer fields.
      return new Response(payload,{headers});
    })();
    return await Promise.race([operation,new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(error(504,'Explorer provider timed out'));},10000);})]);
  }catch{return error(502,'Explorer provider unavailable');}finally{clearTimeout(timer);}
}
