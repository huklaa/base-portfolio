// Fixed issuer URL: never forward user URLs, wallet addresses, cookies or credentials.
export async function onRequestGet(){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
  try{
    const upstream=await fetch('https://api.coinbase.com/v1/tokenized-stocks',{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!upstream.ok)return new Response(JSON.stringify({error:'Issuer registry unavailable',upstreamStatus:upstream.status}),{status:502,headers});
    const payload=await upstream.json();
    if(!Array.isArray(payload.tokens)||!payload.tokens.length)throw Error('Invalid issuer response');
    return new Response(JSON.stringify(payload),{headers:{...headers,'X-Data-Source':'api.coinbase.com/v1/tokenized-stocks'}});
  }catch{return new Response(JSON.stringify({error:'Issuer registry unavailable'}),{status:502,headers});}
  finally{clearTimeout(timer);}
}
