// Read-only, fixed-chain HyperSync adapter. Credentials never leave the server.
const ADDRESS=/^0x[0-9a-f]{40}$/i, HASH=/^0x[0-9a-f]{64}$/i;
function integer(v){
  if(typeof v==='number'&&!Number.isSafeInteger(v))throw Error('Unsafe integer');
  if(!/^(?:0x[0-9a-f]+|\d+)$/i.test(String(v)))throw Error('Invalid integer');
  return BigInt(v).toString();
}
function number(v){const n=Number(integer(v));if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid number');return n;}
export function normalize(payload,address,from,to){
  const next=number(payload.next_block),height=number(payload.archive_height);
  const end=to??height+1;
  if(next<=from||next>end||height+1<end||!Array.isArray(payload.data))throw Error('Invalid pagination');
  const blocks=new Map(),txs=[];
  for(const batch of payload.data){
    if(!Array.isArray(batch.blocks)||!Array.isArray(batch.transactions))throw Error('Invalid batch');
    for(const b of batch.blocks)blocks.set(number(b.number),number(b.timestamp));
    txs.push(...batch.transactions);
  }
  const result=txs.map(t=>{
    const block=number(t.block_number),timestamp=blocks.get(block),status=number(t.status);
    if(block<from||block>=next||!timestamp||status>1||!HASH.test(t.hash)||!ADDRESS.test(t.from)||
       (t.to!==null&&!ADDRESS.test(t.to))||!/^0x(?:[a-f0-9]{2})*$/i.test(t.input)||
       (t.from.toLowerCase()!==address&&t.to?.toLowerCase()!==address))throw Error('Invalid transaction');
    return {hash:t.hash,blockNumber:String(block),transactionIndex:String(number(t.transaction_index)),timeStamp:String(timestamp),
      from:t.from,to:t.to||'',input:t.input,value:integer(t.value),gasUsed:integer(t.gas_used),
      gasPrice:integer(t.effective_gas_price),isError:status===1?'0':'1',
      l1Fee:t.l1_fee==null?null:integer(t.l1_fee)};
  });
  if(result.length>12000)throw Error('Response too large');
  return {result,nextBlock:next,endBlock:end,complete:next===end,provider:'envio',gasScope:'L2 execution fee (excludes L1 data fee)'};
}
export async function onRequestGet({request,env}){
  const params=new URL(request.url).searchParams,address=(params.get('address')||'').toLowerCase();
  const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
  let from,to;
  try{
    if(!ADDRESS.test(address)||[...params.keys()].some(k=>!['address','from','to'].includes(k))||[...params.keys()].some(k=>params.getAll(k).length!==1))throw Error();
    from=number(params.get('from')??0);to=params.has('to')?number(params.get('to')):undefined;
    if(from>1e9||(to!==undefined&&(to<=from||to>1e9)))throw Error();
  }catch{return reply({error:'Invalid history query'},400);}
  if(!env.ENVIO_API_TOKEN)return reply({error:'Envio is not configured'},503);
  const controller=new AbortController();let timer;
  try{
    const work=(async()=>{
      const response=await fetch('https://base.hypersync.xyz/query',{method:'POST',redirect:'error',signal:controller.signal,
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.ENVIO_API_TOKEN},
        body:JSON.stringify({from_block:from,...(to===undefined?{}:{to_block:to}),transactions:[{from:[address]},{to:[address]}],max_num_transactions:1000,
          field_selection:{block:['number','timestamp'],transaction:['block_number','transaction_index','hash','from','to','input','value','gas_used','effective_gas_price','status','l1_fee']}})});
      if(!response.ok)return reply({error:'Envio request failed',upstreamStatus:response.status},response.status===429?429:502);
      const payload=await response.json();
      try{return reply(normalize(payload,address,from,to));}catch(e){return reply({error:'Invalid Envio history',reason:['Unsafe integer','Invalid integer','Invalid number','Invalid pagination','Invalid batch','Invalid transaction','Response too large'].includes(e.message)?e.message:'Invalid schema'},502);}
    })();
    return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Timeout'));},12000);})]);
  }catch{return reply({error:'Envio returned unavailable or invalid history'},502);}finally{clearTimeout(timer);}
}
