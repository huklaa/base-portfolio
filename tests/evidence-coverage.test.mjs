import assert from 'node:assert/strict';

globalThis.state={
  address:'0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  txs:[
    {timeStamp:'1900000000'},
    {timeStamp:'1950000000'}
  ]
};
globalThis.BaseBuilderAttribution={parseAttribution(){},last:{count:1}};
globalThis.BaseStablecoinFlow={last:{
  transfers:[1,2,3],
  verifiedContracts:['a','b'],
  coverage:{pagesFetched:4,oldestTimestamp:'2026-06-01T00:00:00.000Z',targetTimestamp:'2026-05-22T00:00:00.000Z',reachedTarget:true,reachedEnd:false,hitPageCap:false,completeForRequestedWindow:true}
}};
globalThis.BaseSmartAccount={last:{status:'indexed',account:{operations:7}}};
globalThis.BaseUserOpAttribution={last:{status:'indexed',fetched:5,scan:{count:2}}};

await import('../evidence-coverage.js');
const c=globalThis.BaseEvidenceCoverage.buildCoverage();
assert.equal(c.normalTransactions.fetched,2);
assert.equal(c.normalTransactions.capReached,false);
assert.equal(c.builderAttribution.strictAttributedTransactions,1);
assert.equal(c.stablecoinTransfers.fetched,3);
assert.equal(c.stablecoinTransfers.allowlistedContracts,2);
assert.equal(c.stablecoinTransfers.pagesFetched,4);
assert.equal(c.stablecoinTransfers.reachedTarget,true);
assert.equal(c.stablecoinTransfers.hitPageCap,false);
assert.equal(c.stablecoinTransfers.completeForRequestedWindow,true);
assert.equal(c.accountAbstraction.status,'indexed');
assert.equal(c.accountAbstraction.indexedOperations,7);
assert.equal(c.userOperations.fetched,5);
assert.equal(c.userOperations.strictAttributedUserOps,2);
assert.match(c.caveat,/not complete lifetime activity/i);

BaseStablecoinFlow.last.coverage={pagesFetched:10,reachedTarget:false,reachedEnd:false,hitPageCap:true,completeForRequestedWindow:false};
const partial=globalThis.BaseEvidenceCoverage.buildCoverage();
assert.equal(partial.stablecoinTransfers.pagesFetched,10);
assert.equal(partial.stablecoinTransfers.hitPageCap,true);
assert.equal(partial.stablecoinTransfers.completeForRequestedWindow,false);
console.log('evidence coverage tests passed');
