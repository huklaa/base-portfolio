import assert from 'node:assert/strict';

await import('../stablecoin-flow.js');
const { summarize, stableTransfer, fetchTransfers, pageOldestTimestamp } = globalThis.BaseStablecoinFlow;

const wallet='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const other='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const now=2_000_000_000;
const addresses={
  USDC:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  DAI:'0x50c5725949a6f0c72e6c4a641f24049a917db0cb'
};
const transfer=(daysAgo,from,to,symbol='USDC',value='1000000',decimals='6',rate='1',address=addresses[symbol]||'0x9999999999999999999999999999999999999999')=>({
  timestamp:new Date((now-daysAgo*86400)*1000).toISOString(),
  from:{hash:from},
  to:{hash:to},
  token:{symbol,type:'ERC-20',decimals,exchange_rate:rate,address_hash:address},
  total:{value}
});

const rows=[
  transfer(5,other,wallet,'USDC','5000000'),
  transfer(4,wallet,other,'USDC','2000000'),
  transfer(3,other,wallet,'DAI','3000000000000000000','18','1'),
  transfer(2,other,wallet,'USDC','9000000','6','1','0x9999999999999999999999999999999999999999')
];

assert.equal(stableTransfer(rows[0]),true);
assert.equal(stableTransfer(rows[3]),false,'a spoofed USDC symbol must not pass without an allowlisted contract');

const s=summarize(rows,wallet,now-30*86400,now+1);
assert.equal(s.count,3);
assert.equal(s.inbound,2);
assert.equal(s.outbound,1);
assert.equal(Math.round(s.inUsd),8);
assert.equal(Math.round(s.outUsd),2);
assert.equal(Math.round(s.netUsd),6);
assert.equal(s.counterparties[0][0],other);
assert.equal(pageOldestTimestamp(rows),now-5*86400);

const originalFetch=globalThis.fetch;
let calls=0;
const sinceTs=now-90*86400;
const pages=[
  {items:[transfer(5,other,wallet),transfer(30,other,wallet)],next_page_params:{index:2}},
  {items:[transfer(60,other,wallet),transfer(95,other,wallet)],next_page_params:{index:3}},
  {items:[transfer(120,other,wallet)],next_page_params:null}
];
globalThis.fetch=async()=>{
  const page=pages[calls++];
  return {ok:true,json:async()=>page};
};
try{
  const fetched=await fetchTransfers(wallet,{sinceTs,maxPages:10});
  assert.equal(calls,2,'pagination should stop once the requested history boundary is reached');
  assert.equal(fetched.length,4);
  assert.equal(fetched.coverage.pages,2);
  assert.equal(fetched.coverage.complete,true);
  assert.equal(fetched.coverage.oldestTimestamp,now-95*86400);

  calls=0;
  globalThis.fetch=async()=>({ok:true,json:async()=>({items:[transfer(5+calls++,other,wallet)],next_page_params:{index:calls+1}})});
  const capped=await fetchTransfers(wallet,{sinceTs:now-365*86400,maxPages:2});
  assert.equal(capped.coverage.pages,2);
  assert.equal(capped.coverage.complete,false,'coverage must say incomplete when the page cap is hit before the time boundary');
} finally {
  globalThis.fetch=originalFetch;
}

console.log('stablecoin-flow tests passed');
