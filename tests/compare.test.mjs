import assert from 'node:assert/strict';

await import('../compare.js');
const {summarizeTxs}=globalThis.BaseCompare;
const rows=[
  {timeStamp:'1700000000',to:'0x1111111111111111111111111111111111111111',input:'0x1234'},
  {timeStamp:'1700000300',to:'0x1111111111111111111111111111111111111111',input:'0xabcd'},
  {timeStamp:'1700086400',to:'0x2222222222222222222222222222222222222222',input:'0x'},
  {timeStamp:'1700172800',to:'0x3333333333333333333333333333333333333333',input:'0xbeef'}
];
const s=summarizeTxs(rows);
assert.equal(s.transactions,4);
assert.equal(s.activeDays,3);
assert.equal(s.contracts,2,'plain transfers must not count as contract destinations');
assert.equal(s.firstSeen,1700000000);
assert.deepEqual(summarizeTxs(null),{transactions:0,activeDays:0,contracts:0,firstSeen:0});
console.log('comparison tests passed');
