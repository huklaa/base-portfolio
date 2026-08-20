import assert from 'node:assert/strict';

await import('../stablecoin-flow.js');
const { summarize } = globalThis.BaseStablecoinFlow;

const wallet='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const other='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const now=2_000_000_000;
const transfer=(daysAgo,from,to,symbol='USDC',value='1000000',decimals='6',rate='1')=>({
  timestamp:new Date((now-daysAgo*86400)*1000).toISOString(),
  from:{hash:from},
  to:{hash:to},
  token:{symbol,type:'ERC-20',decimals,exchange_rate:rate},
  total:{value}
});

const rows=[
  transfer(5,other,wallet,'USDC','5000000'),
  transfer(4,wallet,other,'USDC','2000000'),
  transfer(3,other,wallet,'DAI','3000000000000000000','18','1'),
  transfer(2,other,wallet,'TOKEN','9000000')
];

const s=summarize(rows,wallet,now-30*86400,now+1);
assert.equal(s.count,3);
assert.equal(s.inbound,2);
assert.equal(s.outbound,1);
assert.equal(Math.round(s.inUsd),8);
assert.equal(Math.round(s.outUsd),2);
assert.equal(Math.round(s.netUsd),6);
assert.equal(s.counterparties[0][0],other);

console.log('stablecoin-flow tests passed');
