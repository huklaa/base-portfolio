(function(){
'use strict';
const input=document.getElementById('addressInput'),button=document.getElementById('analyzeBtn'),status=document.getElementById('status');
if(!input||!button)return;
const addressRe=/^0x[0-9a-fA-F]{40}$/;
let resolving=false;
async function resolveName(name){
 const {createPublicClient,http}=await import('https://esm.sh/viem@2.38.6');
 const {base,mainnet}=await import('https://esm.sh/viem@2.38.6/chains');
 const options=name.endsWith('.base.eth')?[base,mainnet]:[mainnet];
 for(const chain of options){
  try{
   const client=createPublicClient({chain,transport:http()});
   const resolved=await client.getEnsAddress({name});
   if(addressRe.test(resolved||''))return resolved;
  }catch(error){console.warn('Name resolution failed on',chain.name,error);}
 }
 throw Error('Name has no resolvable EVM address on the supported networks.');
}
async function intercept(event){
 const raw=input.value.trim();
 if(!raw.toLowerCase().endsWith('.eth')||addressRe.test(raw)||resolving)return;
 event.preventDefault();event.stopImmediatePropagation();
 resolving=true;button.disabled=true;
 if(status)status.textContent='Resolving '+raw+'…';
 try{
  const resolved=await resolveName(raw.toLowerCase());
  input.value=resolved;
  if(status)status.textContent=raw+' → '+resolved;
 }catch(e){
  if(status)status.textContent='Could not resolve '+raw+'. Check the name and try a 0x address.';
  resolving=false;button.disabled=false;return;
 }
 resolving=false;button.disabled=false;button.click();
}
button.addEventListener('click',intercept,true);
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&input.value.trim().toLowerCase().endsWith('.eth'))intercept(event)},true);
const label=document.querySelector('label[for="addressInput"]');
if(label)label.textContent='Base address or ENS / Basename';
input.placeholder='0x… or yourname.base.eth';
})();