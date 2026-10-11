import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import api from '../api-fetch.js';
const source=await readFile(new URL('../functions/api/history.js',import.meta.url),'utf8');
const {normalize,onRequestGet}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const address='0x'+'1'.repeat(40),hash='0x'+'2'.repeat(64);
const fixture=()=>({archive_height:9,next_block:10,data:[{blocks:[{number:1,timestamp:1700000000}],transactions:[{block_number:1,transaction_index:0,hash,from:address,to:null,input:'0x',value:'0x20000000000001',gas_used:'0x5208',effective_gas_price:'0x3b9aca00',status:1,l1_fee:'0x01'}]}]});
test('normalizes exact quantities, receipt gas and contract creation',()=>{const p=normalize(fixture(),address,0);assert.equal(p.complete,true);assert.equal(p.result[0].value,'9007199254740993');assert.equal(p.result[0].gasUsed,'21000');assert.equal(p.result[0].gasPrice,'1000000000');assert.equal(p.result[0].to,'');});
test('rejects mismatched addresses, unsafe quantities, missing timestamps and broken cursors',()=>{
 for(const mutate of [p=>p.next_block=0,p=>p.data[0].blocks=[],p=>p.data[0].transactions[0].from='0x'+'3'.repeat(40),p=>p.data[0].transactions[0].value=9007199254740992,p=>p.data[0].transactions[0].status=2]){const p=fixture();mutate(p);assert.throws(()=>normalize(p,address,0));}
});
test('empty completed scan is valid',()=>{assert.deepEqual(normalize({archive_height:9,next_block:10,data:[]},address,0).result,[]);});
test('missing credential never contacts provider',async()=>{assert.equal((await onRequestGet({request:new Request('https://example.com/api/history?address='+address),env:{}})).status,503);});
test('invalid parameters rejected before upstream',async()=>{for(const query of ['address=x','address='+address+'&url=https://evil.test','address='+address+'&from=-1'])assert.equal((await onRequestGet({request:new Request('https://example.com/?'+query),env:{}})).status,400);});
test('provider auth and rate limit failures are sanitized',async()=>{const old=globalThis.fetch;try{for(const status of [401,403,429]){globalThis.fetch=async(url,options)=>{assert.equal(url,'https://base.hypersync.xyz/query');assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,'Bearer secret');return new Response('secret',{status});};const r=await onRequestGet({request:new Request('https://example.com/?address='+address),env:{ENVIO_API_TOKEN:'secret'}});assert.equal(r.status,status===429?429:424);assert.equal((await r.text()).includes('secret'),false);}}finally{globalThis.fetch=old;}});
test('client scans all pages and pins end block',async()=>{const urls=[];const responses=[{historyProvider:'envio'},{result:[],nextBlock:5,endBlock:10,complete:false},{result:[],nextBlock:10,endBlock:10,complete:true}];const p=await api.history(address,async u=>{urls.push(u);return Response.json(responses.shift());});assert.equal(p.provider,'envio');assert.equal(p.result.length,0);assert.match(urls[2],/from=5&to=10/);});
test('client rejects partial errors and cursor inconsistencies instead of returning zero',async()=>{for(const page of [{result:[],nextBlock:0,endBlock:10,complete:false},{result:[],nextBlock:5,endBlock:10,complete:true}]){let n=0;await assert.rejects(api.history(address,async()=>Response.json(n++?page:{historyProvider:'envio'})),/pagination/);}});

test('redirect is rejected without forwarding bearer credentials',async()=>{const old=globalThis.fetch;let calls=0;try{globalThis.fetch=async(url,options)=>{calls++;assert.equal(options.redirect,'manual');return new Response(null,{status:307,headers:{Location:'https://other.example/query'}});};const r=await onRequestGet({request:new Request('https://example.com/?address='+address),env:{ENVIO_API_TOKEN:'secret'}});assert.equal(r.status,424);assert.equal((await r.json()).upstreamStatus,307);assert.equal(calls,1);}finally{globalThis.fetch=old;}});

test('omitted recipient represents contract creation',()=>{const p=fixture();delete p.data[0].transactions[0].to;assert.equal(normalize(p,address,0).result[0].to,'');});

test('high-volume history is explicitly capped and never marked complete',async()=>{let n=0;const txs=Array.from({length:10001},(_,i)=>({hash:String(i),blockNumber:String(i),transactionIndex:'0'}));const p=await api.history(address,async()=>Response.json(n++?{result:txs,nextBlock:10002,endBlock:20000,complete:false}:{historyProvider:'envio'}));assert.equal(p.result.length,10000);assert.equal(p.complete,false);assert.equal(p.truncated,true);});
