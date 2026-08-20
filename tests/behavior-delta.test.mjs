import assert from 'node:assert/strict';

await import('../behavior-delta.js');
const { buildDelta, summarizeWindow } = globalThis.BaseBehaviorDelta;

const now = 2_000_000_000;
const DAY = 86400;
const tx = (daysAgo, to, input='0x1234', value='0', gasUsed='21000', gasPrice='1000000000') => ({
  timeStamp: String(now - daysAgo*DAY),
  to,
  input,
  value,
  gasUsed,
  gasPrice
});

const A='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const B='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const C='0xcccccccccccccccccccccccccccccccccccccccc';

const txs=[
  tx(75,A),
  tx(50,A),
  tx(45,B),
  tx(20,A),
  tx(15,C),
  tx(10,C),
  tx(5,'0xdddddddddddddddddddddddddddddddddddddddd','0x')
];

const delta=buildDelta(txs,now);
assert.equal(delta.previous.txCount,2);
assert.equal(delta.current.txCount,4);
assert.equal(delta.current.uniqueContracts,2);
assert.deepEqual(delta.newApps,[C]);
assert.deepEqual(delta.revisitedApps,[A]);
assert.equal(Math.round(delta.txTrend),100);

const window=summarizeWindow(txs,now-30*DAY,now+1);
assert.equal(window.activeDays,4);
assert.equal(window.contractCalls,3);
assert.ok(window.gasEth>0);

console.log('behavior-delta tests passed');
