import assert from 'node:assert/strict';

globalThis.state={
  address:'0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  txs:[
    {timeStamp:'1900000000'},
    {timeStamp:'1950000000'}
  ]
};
globalThis.BaseBuilderAttribution={parseAttribution(){},last:{count:1}};
globalThis.BaseStablecoinFlow={last:{transfers:[1,2,3],verifiedContracts:['a','b']}};
globalThis.BaseSmartAccount={last:{status:'indexed',account:{operations:7}}};
globalThis.BaseUserOpAttribution={last:{status:'indexed',fetched:5,scan:{count:2}}};

await import('../evidence-coverage.js');
const c=globalThis.BaseEvidenceCoverage.buildCoverage();
assert.equal(c.normalTransactions.fetched,2);
assert.equal(c.normalTransactions.capReached,false);
assert.equal(c.builderAttribution.strictAttributedTransactions,1);
assert.equal(c.stablecoinTransfers.fetched,3);
assert.equal(c.stablecoinTransfers.allowlistedContracts,2);
assert.equal(c.accountAbstraction.status,'indexed');
assert.equal(c.accountAbstraction.indexedOperations,7);
assert.equal(c.userOperations.fetched,5);
assert.equal(c.userOperations.strictAttributedUserOps,2);
assert.match(c.caveat,/not complete lifetime activity/i);
console.log('evidence coverage tests passed');
