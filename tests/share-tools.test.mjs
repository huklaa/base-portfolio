import assert from 'node:assert/strict';

await import('../share-tools.js');
const {CANONICAL_ORIGIN,validAddress,buildShareUrl,buildShareText}=globalThis.BaseShareTools;
const address='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

assert.equal(CANONICAL_ORIGIN,'https://base-portfolio.xyz');
assert.equal(validAddress(address),true);
assert.equal(validAddress('0x1234'),false);
assert.equal(buildShareUrl(address),`https://base-portfolio.xyz/?address=${address}`);
assert.equal(buildShareUrl('bad'),'https://base-portfolio.xyz/');
assert.match(buildShareText(address,{archetype:'Protocol Explorer'}),/Protocol Explorer/);
assert.match(buildShareText(address,{archetype:'Protocol Explorer'}),/public, read-only Base profile/i);

console.log('share tools tests passed');
