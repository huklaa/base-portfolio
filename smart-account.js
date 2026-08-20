(function(){
  const AA_ACCOUNT_ENDPOINT=(address)=>`${BLOCKSCOUT}/api/v2/proxy/account-abstraction/accounts/${encodeURIComponent(address)}`;
  const BASE_ACCOUNT_FACTORIES=new Map([
    ['0xba5ed110efdba3d005bfc882d75358acbbb85842','Coinbase Smart Wallet Factory v1.1'],
    ['0x0ba5ed0c6aa8c49038f819e587e2633c4a9f428a','Coinbase Smart Wallet Factory v1.0']
  ]);
  const ENTRYPOINTS=new Map([
    ['0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789','ERC-4337 EntryPoint v0.6'],
    ['0x0000000071727de22e5e9d8baf0edac6f37da032','ERC-4337 EntryPoint v0.7']
  ]);

  function lower(v){return typeof v==='string'?v.toLowerCase():'';}
  function first(...values){return values.find(v=>v!==undefined&&v!==null&&v!=='')??null;}
  function normalizeAccount(payload,address){
    const p=payload?.account||payload?.item||payload?.data||payload||{};
    const factory=lower(first(p.factory,p.factory_address,p.factoryAddress,p.factory?.address_hash,p.factory?.hash));
    const entryPoint=lower(first(p.entry_point,p.entryPoint,p.entrypoint,p.entry_point_address,p.entryPointAddress,p.entry_point?.address_hash,p.entry_point?.hash));
    const sender=lower(first(p.address,p.sender,p.account_address,p.accountAddress,p.address_hash,address));
    const operations=Number(first(p.operations_count,p.user_operations_count,p.userOpsCount,p.total_operations,p.totalOps,p.total_user_operations,0))||0;
    const creationTx=first(p.creation_transaction_hash,p.creationTransactionHash,p.transaction_hash,p.creation_tx_hash);
    const indexed=Boolean(payload&&typeof payload==='object'&&Object.keys(p).length);
    const baseAccountFactory=BASE_ACCOUNT_FACTORIES.get(factory)||null;
    return {indexed,sender,factory:factory||null,factoryLabel:baseAccountFactory,entryPoint:entryPoint||null,entryPointLabel:ENTRYPOINTS.get(entryPoint)||null,operations,creationTx:creationTx||null,isCoinbaseSmartWallet:Boolean(baseAccountFactory)};
  }

  async function load(address){
    try{
      const r=await fetch(AA_ACCOUNT_ENDPOINT(address),{headers:{accept:'application/json'}});
      if(r.status===404)return {status:'not-indexed',account:normalizeAccount(null,address)};
      if(!r.ok)throw new Error(`AA API ${r.status}`);
      const json=await r.json();
      const account=normalizeAccount(json,address);
      return {status:account.indexed?'indexed':'not-indexed',account};
    }catch(error){
      return {status:'unavailable',account:normalizeAccount(null,address),error:String(error?.message||error)};
    }
  }

  function ensureUI(){
    if(document.getElementById('smartAccountCoverage'))return;
    const fingerprint=document.querySelector('.fingerprint-card'); if(!fingerprint)return;
    const el=document.createElement('article'); el.id='smartAccountCoverage'; el.className='card section-card';
    el.innerHTML=`<div class="card-head"><div><div class="eyebrow">ACCOUNT ABSTRACTION</div><h3>Smart-account coverage</h3></div><span id="aaStatusBadge" class="badge">Checking…</span></div><p class="section-intro">Best-effort ERC-4337 account-abstraction evidence from Blockscout. A contract address alone is never treated as proof of a Base Account.</p><div class="fingerprint-stats" style="margin-top:18px"><div><span>ERC-4337 indexed</span><strong id="aaIndexed">—</strong><small>Blockscout account-abstraction indexer evidence</small></div><div><span>Wallet family</span><strong id="aaWalletFamily">—</strong><small>Only labeled when factory evidence is recognized</small></div><div><span>Factory</span><strong id="aaFactory">—</strong><small id="aaFactoryLabel">Public factory address</small></div><div><span>EntryPoint</span><strong id="aaEntryPoint">—</strong><small id="aaEntryPointLabel">ERC-4337 entry point when reported</small></div></div><div id="aaNote" class="status" style="margin-top:14px">Waiting for an analyzed address.</div>`;
    fingerprint.insertAdjacentElement('afterend',el);
  }
  function shortAddr(a){return a?`${a.slice(0,8)}…${a.slice(-6)}`:'—';}
  function render(result){
    ensureUI();
    const a=result?.account||{};
    const yes=result?.status==='indexed';
    document.getElementById('aaStatusBadge').textContent=result?.status==='unavailable'?'Indexer unavailable':yes?'ERC-4337 evidence':'No indexed AA record';
    document.getElementById('aaIndexed').textContent=yes?'Yes':'Not confirmed';
    document.getElementById('aaWalletFamily').textContent=a.isCoinbaseSmartWallet?'Coinbase Smart Wallet':'Unclassified';
    document.getElementById('aaFactory').textContent=shortAddr(a.factory);
    document.getElementById('aaFactoryLabel').textContent=a.factoryLabel||'Factory not recognized by this project';
    document.getElementById('aaEntryPoint').textContent=shortAddr(a.entryPoint);
    document.getElementById('aaEntryPointLabel').textContent=a.entryPointLabel||'EntryPoint not reported/recognized';
    const note=document.getElementById('aaNote');
    if(result?.status==='unavailable')note.textContent='Account-abstraction endpoint was unavailable. This section stays inconclusive rather than guessing from contract code.';
    else if(yes&&a.isCoinbaseSmartWallet)note.textContent=`Indexed ERC-4337 account with recognized Coinbase Smart Wallet factory${a.operations?` · ${a.operations.toLocaleString()} indexed operation${a.operations===1?'':'s'}`:''}.`;
    else if(yes)note.textContent=`Indexed ERC-4337 account detected${a.operations?` · ${a.operations.toLocaleString()} indexed operation${a.operations===1?'':'s'}`:''}. Wallet implementation remains unclassified.`;
    else note.textContent='No account-abstraction record was returned for this address. This does not prove the address has never used smart-account flows.';
  }
  async function analyze(address){ ensureUI(); const result=await load(address); globalThis.BaseSmartAccount.last=result; render(result); return result; }
  function init(){ensureUI(); const status=document.getElementById('status'); if(!status)return; new MutationObserver(()=>{if(typeof state!=='undefined'&&state.address&&document.getElementById('dashboard')&&!document.getElementById('dashboard').classList.contains('hidden'))analyze(state.address);}).observe(status,{childList:true,subtree:true});}
  globalThis.BaseSmartAccount={BASE_ACCOUNT_FACTORIES,ENTRYPOINTS,normalizeAccount,load,analyze,last:null};
  if(typeof document!=='undefined')init();
})();
