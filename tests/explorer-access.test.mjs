import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import gateModule from '../blockscout-rate-limit.js';
const {createGate}=gateModule;
const load=async path=>import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL(path,import.meta.url),'utf8')).toString('base64'));
const proxy=await load('../functions/api/explorer.js');
const config=await load('../functions/api/explorer-config.js');
const address='0x'+'1'.repeat(40), path='/api?module=account&action=txlist&address='+address;
const url='https://base.blockscout.com'+path;
const request=()=>new Request('https://base-portfolio.xyz/api/explorer?path='+encodeURIComponent(path));
test('successful JSON is cached and configured routes use same-origin proxy',async()=>{
 const calls=[];const gate=createGate(async target=>{calls.push(target);return Response.json({result:[]});},{gapMs:0,configured:async()=>true});
 assert.deepEqual(await (await gate.fetch(url)).json(),{result:[]});
 assert.deepEqual(await (await gate.fetch(url)).json(),{result:[]});
 assert.equal(calls.length,1);assert.equal(new URL(calls[0]).pathname,'/api/explorer');assert.equal(new URL(calls[0]).searchParams.get('path'),path);
});
test('403 and 429 are never retried or cached',async()=>{
 for(const status of [403,429]){let calls=0;const gate=createGate(async()=>{calls++;return new Response('unavailable',{status});},{gapMs:0});
 assert.equal((await gate.fetch(url)).status,status);assert.equal(calls,1);await gate.fetch(url);assert.equal(calls,2);}
});
test('stalled network or response body releases queue on deadline',async()=>{
 for(const body of [false,true]){let calls=0;const gate=createGate(async()=>{calls++;if(calls>1)return Response.json([]);return body?{arrayBuffer:()=>new Promise(()=>{})}:new Promise(()=>{});},{gapMs:0,timeoutMs:20});
 const first=gate.fetch(url);const next=gate.fetch(url+'&page=2');await assert.rejects(first,/timed out/);assert.deepEqual(await (await next).json(),[]);assert.equal(calls,2);}
});
test('active and queued cancellations do not retry or block next request',async()=>{
 let calls=0,started;const ready=new Promise(r=>started=r);const gate=createGate(async()=>{calls++;if(calls===1){started();return new Promise(()=>{});}return Response.json([]);},{gapMs:0,timeoutMs:100});
 const active=new AbortController(),queued=new AbortController();const first=gate.fetch(url,{signal:active.signal});await ready;
 const second=gate.fetch(url+'&page=2',{signal:queued.signal});const third=gate.fetch(url+'&page=3');queued.abort();active.abort();
 await assert.rejects(first,{name:'AbortError'});await assert.rejects(second,{name:'AbortError'});assert.deepEqual(await (await third).json(),[]);assert.equal(calls,2);
});
test('unconfigured gate preserves public URL and other hosts pass through',async()=>{
 const calls=[];const gate=createGate(async target=>{calls.push(target);return Response.json([]);},{gapMs:0});await gate.fetch(url);await gate.fetch('https://example.com');assert.deepEqual(calls,[url,'https://example.com']);
});
test('proxy restricts host, chain, routes and query parameters',()=>{
 assert.equal(proxy.upstreamURL(path),'https://api.blockscout.com/8453'+path);
 assert.equal(proxy.upstreamURL('/api/v2/addresses/'+address+'/token-balances'),'https://api.blockscout.com/8453/api/v2/addresses/'+address+'/token-balances');
 for(const p of ['https://evil.test/api','//evil.test/api','/api/v2/../rpc',path+'&apikey=secret',path+'&chain_id=1',path+'&page=1&page=2',path+'&offset=10001',path.replace('txlist','eth_sendRawTransaction'),'/api/v2/addresses/invalid',path+'#fragment'])assert.throws(()=>proxy.upstreamURL(p));
});
test('missing API key returns 503 without calling upstream; config exposes only boolean',async()=>{
 const old=globalThis.fetch;globalThis.fetch=()=>{throw Error('must not fetch');};try{assert.equal((await proxy.onRequestGet({request:request(),env:{}})).status,503);assert.deepEqual(await config.onRequestGet({env:{BLOCKSCOUT_API_KEY:'secret'}}).json(),{configured:true});assert.deepEqual(await config.onRequestGet({env:{}}).json(),{configured:false});}finally{globalThis.fetch=old;}
});
test('proxy uses server authorization and preserves large integer JSON',async()=>{
 const old=globalThis.fetch;const body='{"value":900719925474099312345}';globalThis.fetch=async(target,options)=>{assert.equal(target,'https://api.blockscout.com/8453'+path);assert.equal(options.headers.Authorization,'Bearer test-secret');assert.equal(options.redirect,'error');return new Response(body);};
 try{const response=await proxy.onRequestGet({request:request(),env:{BLOCKSCOUT_API_KEY:'test-secret'}});assert.equal(response.status,200);assert.equal(await response.text(),body);}finally{globalThis.fetch=old;}
});
test('upstream failures and invalid JSON are sanitized',async()=>{
 const old=globalThis.fetch;try{for(const response of [new Response('secret',{status:403}),new Response('secret',{status:429}),new Response('<html>secret</html>')]){globalThis.fetch=async()=>response;const result=await proxy.onRequestGet({request:request(),env:{BLOCKSCOUT_API_KEY:'secret'}});assert.equal(result.status,response.status===429?429:502);assert.equal((await result.text()).includes('secret'),false);}}finally{globalThis.fetch=old;}
});
