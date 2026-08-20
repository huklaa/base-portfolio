import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../smart-account.js',import.meta.url),'utf8');
const sandbox={globalThis:{},console,fetch:async()=>{throw new Error('not used')},BLOCKSCOUT:'https://base.blockscout.com'};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
const api=sandbox.globalThis.BaseSmartAccount;

const v11=api.normalizeAccount({factory:'0xBA5ED110eFDBa3D005bfC882d75358ACBbB85842',entry_point:'0x0000000071727De22E5E9d8BAf0edAc6f37da032',operations_count:12,address:'0x1111111111111111111111111111111111111111'});
assert.equal(v11.indexed,true);
assert.equal(v11.isCoinbaseSmartWallet,true);
assert.equal(v11.factoryLabel,'Coinbase Smart Wallet Factory v1.1');
assert.equal(v11.entryPointLabel,'ERC-4337 EntryPoint v0.7');
assert.equal(v11.operations,12);

const unknown=api.normalizeAccount({factory_address:'0x2222222222222222222222222222222222222222',user_operations_count:'3'},'0x3333333333333333333333333333333333333333');
assert.equal(unknown.indexed,true);
assert.equal(unknown.isCoinbaseSmartWallet,false);
assert.equal(unknown.operations,3);
assert.equal(unknown.sender,'0x3333333333333333333333333333333333333333');

const empty=api.normalizeAccount(null,'0x4444444444444444444444444444444444444444');
assert.equal(empty.indexed,false);
assert.equal(empty.isCoinbaseSmartWallet,false);

console.log('smart account tests passed');
