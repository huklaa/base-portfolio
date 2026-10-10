(function(){
'use strict';
const addressRe=/^0x[0-9a-fA-F]{40}$/;
const registry='0xb94704422c2a1e396835a571837aa5ae53285a95';
const zero='0x0000000000000000000000000000000000000000';
// Registry address: https://github.com/base/basenames#contract-addresses
async function resolveWithClients(name,{baseClient,mainnetClient,namehash,normalize}){
 name=normalize(name);
 let resolved;
 if(name.endsWith('.base.eth')){
  const node=namehash(name);
  const resolver=await baseClient.readContract({address:registry,abi:[{type:'function',name:'resolver',stateMutability:'view',inputs:[{name:'node',type:'bytes32'}],outputs:[{type:'address'}]}],functionName:'resolver',args:[node]});
  if(!addressRe.test(resolver||'')||resolver.toLowerCase()===zero)throw Error('No resolver set for this Basename.');
  resolved=await baseClient.readContract({address:resolver,abi:[{type:'function',name:'addr',stateMutability:'view',inputs:[{name:'node',type:'bytes32'}],outputs:[{type:'address'}]}],functionName:'addr',args:[node]});
 }else{
  resolved=await mainnetClient.getEnsAddress({name});
 }
 if(!addressRe.test(resolved||'')||resolved.toLowerCase()===zero)throw Error('No address record found.');
 return resolved;
}
async function resolveName(name){
 const [{createPublicClient,http,fallback,namehash},{base,mainnet},{normalize}]=await Promise.all([
  import('https://esm.sh/viem@2.38.6'),import('https://esm.sh/viem@2.38.6/chains'),import('https://esm.sh/viem@2.38.6/ens')
 ]);
 const transport=urls=>fallback(urls.map(url=>http(url,{timeout:8000,retryCount:0})),{retryCount:0});
 return resolveWithClients(name,{
  baseClient:createPublicClient({chain:base,transport:transport(['https://mainnet.base.org','https://base-rpc.publicnode.com'])}),
  mainnetClient:createPublicClient({chain:mainnet,transport:transport(['https://ethereum-rpc.publicnode.com','https://eth.merkle.io'])}),namehash,normalize
 });
}
globalThis.BaseNameSearch={resolveWithClients};
if(typeof document==='undefined')return;
const input=document.getElementById('addressInput'),button=document.getElementById('analyzeBtn'),status=document.getElementById('status');
if(!input||!button)return;
let resolving=false;
async function intercept(event){
 const raw=input.value.trim();
 if(resolving){event.preventDefault();event.stopImmediatePropagation();return;}
 if(!raw.toLowerCase().endsWith('.eth')||addressRe.test(raw))return;
 event.preventDefault();event.stopImmediatePropagation();
 resolving=true;button.disabled=true;input.disabled=true;
 if(status)status.textContent='Resolving '+raw+'…';
 let timer, resolved;
 try{
  resolved=await Promise.race([resolveName(raw),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Name lookup timed out.')),25000);})]);
  input.value=resolved;
 }catch(e){if(status)status.textContent='Could not resolve '+raw+'. '+(e.message||'Try a 0x address.');}
 finally{clearTimeout(timer);resolving=false;button.disabled=false;input.disabled=false;}
 if(resolved)button.click();
}
button.addEventListener('click',intercept,true);
input.addEventListener('keydown',event=>{if(event.key==='Enter')intercept(event)},true);
const label=document.querySelector('label[for="addressInput"]');
if(label)label.textContent='Base address or ENS / Basename';
input.placeholder='0x… or yourname.base.eth';
})();
