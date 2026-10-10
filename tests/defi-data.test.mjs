import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const m=require('../defi-positions.js'),s=require('../tokenized-stocks.js');
const registry=s.fallbackRegistry(),stock=[...registry.values()][0];
const asset={address:stock.contract_address,symbol:stock.symbol,decimals:8};
const usd={address:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',symbol:'USDC',decimals:6};
const empty=()=>({data:{userByAddress:{marketPositions:[],vaultPositions:[],vaultV2Positions:[]}}});
const position=()=>({market:{collateralAsset:asset,loanAsset:usd},state:{collateral:'1729729',collateralUsd:3.98,borrowAssets:1006337,borrowAssetsUsd:1,supplyAssets:1004878,supplyAssetsUsd:1}});
test('missing APIs and GraphQL errors are not empty wallets',()=>{for(const p of [null,{}, {data:{}},{errors:[{message:'unavailable'}],data:{userByAddress:null}},{data:{userByAddress:{}}}])assert.throws(()=>m.normalize(p));assert.deepEqual(m.normalize(empty()),[]);assert.deepEqual(m.normalize({data:{userByAddress:null}}),[]);});
test('collateral, debt and supply units and exact contract match',()=>{const p=empty();p.data.userByAddress.marketPositions=[position()];const r=m.normalize(p,registry);assert.deepEqual(r.map(x=>x.displayAmount),['0.01729729','1.006337','1.004878']);assert.equal(r[0].verified,true);p.data.userByAddress.marketPositions[0].market.collateralAsset={...asset,address:usd.address};assert.equal(m.normalize(p,registry)[0].verified,false);});
test('vault v1 and v2 use underlying asset decimals',()=>{const p=empty();p.data.userByAddress.vaultPositions=[{vault:{name:'USDC vault',asset:usd},state:{assets:'1234567',assetsUsd:null}}];p.data.userByAddress.vaultV2Positions=[{vault:{name:'Stock vault',asset},assets:'1729729',assetsUsd:4}];assert.deepEqual(m.normalize(p,registry).map(x=>x.displayAmount),['1.234567','0.01729729']);assert.equal(m.normalize(p)[0].value,null);});
test('invalid decimals and balances fail closed',()=>{for(const d of [null,undefined,-1,37,'8'])assert.throws(()=>m.units('100',d));for(const n of [-1,NaN,Infinity,'oops',9007199254740992])assert.throws(()=>m.units(n,8));assert.equal(m.units('100000000000000000001',18),'100.000000000000000001');assert.equal(m.units('1000000000',8),'10');});
test('large JSON integers retain all digits',()=>assert.equal(m.parseResponse('{"assets":100000000000000000001,"label":"123456789012345678901"}').assets,'100000000000000000001'));
test('issuer payload missing, empty, malformed or mismatched is rejected',()=>{for(const p of [null,{}, {tokens:[]},{tokens:[{...stock,decimals:null}]},{tokens:[{...stock,decimals:8,contract_address:usd.address}]}])assert.throws(()=>s.validatedRegistry(p));assert.equal(s.validatedRegistry({tokens:[{...stock,decimals:8}]}).size,10);});
test('prices must be fresh, live and unpaused; multiplier never applied twice',()=>{const now=Date.parse('2026-10-10T12:00:00Z');const t={nav_price:230,multiplier:2,nav_price_updated_at:'2026-10-10T11:00:00Z',is_live:true,redeem_paused:false};assert.equal(s.nav(t,now).price,230);for(const patch of [{nav_price:null},{nav_price:'230'},{nav_price:-1},{nav_price:Infinity},{nav_price_updated_at:'2026-10-08T11:00:00Z'},{nav_price_updated_at:'2026-10-11T11:00:00Z'},{redeem_paused:true},{is_live:false},{nav_price_updated_at:'invalid'}])assert.equal(s.nav({...t,...patch},now),null);});
test('wallet holdings use raw balances and address, reject decimal mismatches',()=>{const t={token:{address_hash:asset.address,symbol:'FAKE',decimals:'8'},value:'1729729'};assert.equal(s.holdings([t],registry)[0].holding.amount,'0.01729729');assert.deepEqual(s.holdings([{...t,token:{...t.token,address_hash:usd.address}}],registry),[]);assert.deepEqual(s.holdings([],registry),[]);assert.throws(()=>s.holdings(undefined,registry));assert.throws(()=>s.holdings([{...t,token:{...t.token,decimals:'18'}}],registry));});
test('captured live Base wallet includes real stock collateral and vaults',()=>{const p=m.parseResponse(fs.readFileSync(new URL('./fixtures/morpho-base-2026-10-10.json',import.meta.url),'utf8'));const r=m.normalize(p,registry);assert.ok(r.some(x=>x.asset==='NVDAc'&&x.displayAmount==='0.01729729'&&x.verified));for(const type of ['Collateral','Borrowed','Supplied','Vault deposit'])assert.ok(r.some(x=>x.type===type),type);assert.ok(r.length>30,'do not silently truncate positions');});

test('issuer proxy reports missing HTTP APIs, bad JSON and upstream failures',async()=>{
 const code=fs.readFileSync(new URL('../functions/api/tokenized-stocks.js',import.meta.url),'utf8');
 const {onRequestGet}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const original=globalThis.fetch;
 try{
  for(const response of [new Response('',{status:404}),new Response('not json'),new Response('{"tokens":[]}')]){globalThis.fetch=async()=>response;assert.equal((await onRequestGet()).status,502);}
  globalThis.fetch=async()=>{throw Error('Network unavailable')};assert.equal((await onRequestGet()).status,502);
  globalThis.fetch=async(url)=>{assert.equal(url,'https://api.coinbase.com/v1/tokenized-stocks');return Response.json({tokens:[{...stock,decimals:8}]});};
  const response=await onRequestGet();assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal((await response.json()).tokens[0].contract_address,stock.contract_address);
 }finally{globalThis.fetch=original;}
});
