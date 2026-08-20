import assert from 'node:assert/strict';

await import('../builder-attribution.js');
const { ERC8021_SUFFIX, parseAttribution, scanTransactions } = globalThis.BaseBuilderAttribution;

assert.equal(ERC8021_SUFFIX,'80218021802180218021802180218021');

const schema0='0x626173656170702c6d6f7270686f0e00'+ERC8021_SUFFIX;
const parsed=parseAttribution(schema0);
assert.equal(parsed.valid,true);
assert.equal(parsed.schemaId,0);
assert.equal(parsed.supported,true);
assert.equal(parsed.codesLength,14);
assert.deepEqual(parsed.codes,['baseapp','morpho']);

const unsupported=parseAttribution('0x01'+ERC8021_SUFFIX);
assert.equal(unsupported.valid,true);
assert.equal(unsupported.schemaId,1);
assert.equal(unsupported.supported,false);
assert.deepEqual(unsupported.codes,[]);

assert.equal(parseAttribution('0x1234802180218021').valid,false);
assert.equal(parseAttribution('0x626173650900'+ERC8021_SUFFIX).valid,false);

const scan=scanTransactions([
  {hash:'0x1',timeStamp:'100',input:schema0},
  {hash:'0x2',timeStamp:'200',input:'0x626173656170700700'+ERC8021_SUFFIX},
  {hash:'0x3',timeStamp:'300',input:'0x1234'}
]);
assert.equal(scan.count,2);
assert.equal(scan.codes.length,2);
assert.equal(scan.first.hash,'0x1');
assert.equal(scan.last.hash,'0x2');
assert.equal(Math.round(scan.share*100),67);

console.log('builder-attribution tests passed');
