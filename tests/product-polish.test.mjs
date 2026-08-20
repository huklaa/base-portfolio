import assert from 'node:assert/strict';

await import('../product-polish.js');
const {readRecent,saveRecent,MAX_RECENT}=globalThis.BaseProductPolish;
const data=new Map();
const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
const a=i=>`0x${i.toString(16).padStart(40,'0')}`;
assert.deepEqual(readRecent(storage),[]);
for(let i=1;i<=7;i++)saveRecent(a(i),storage);
const rows=readRecent(storage);
assert.equal(rows.length,MAX_RECENT);
assert.equal(rows[0],a(7));
assert.equal(rows.at(-1),a(3));
saveRecent(a(5),storage);
assert.equal(readRecent(storage)[0],a(5),'revisiting an address should move it to the front');
assert.equal(readRecent(storage).filter(x=>x===a(5)).length,1,'recent history must not duplicate addresses');
console.log('product polish tests passed');
