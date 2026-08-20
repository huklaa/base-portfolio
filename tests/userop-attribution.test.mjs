import assert from 'node:assert/strict';

await import('../builder-attribution.js');
await import('../userop-attribution.js');

const { scanOperations, senderOf, callDataOf } = globalThis.BaseUserOpAttribution;
const wallet='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const other='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const marker='80218021802180218021802180218021';
const code='baseapp';
const codeHex=Buffer.from(code).toString('hex');
const suffix=`0x1234${codeHex}${(code.length).toString(16).padStart(2,'0')}00${marker}`;

const ops=[
  {sender:{hash:wallet},call_data:suffix,hash:'0x01',timestamp:'2026-08-20T10:00:00Z'},
  {sender:wallet,callData:'0xdeadbeef',hash:'0x02',timestamp:'2026-08-20T11:00:00Z'},
  {sender:{address_hash:other},call_data:suffix,hash:'0x03',timestamp:'2026-08-20T12:00:00Z'}
];

assert.equal(senderOf(ops[0]),wallet);
assert.equal(callDataOf(ops[0]),suffix);
const scan=scanOperations(ops,wallet);
assert.equal(scan.total,2);
assert.equal(scan.count,1);
assert.equal(scan.codes[0][0],code);
assert.equal(scan.codes[0][1],1);
assert.equal(scan.first.hash,'0x01');
assert.equal(scan.last.hash,'0x01');
assert.equal(scan.share,0.5);

console.log('userop-attribution tests passed');
