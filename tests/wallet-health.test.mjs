import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('wallet-health.js','utf8');

function loadWithState(state){
  const context={
    state,
    document:{
      getElementById(){ return null; },
      querySelector(){ return null; },
      createElement(){ return {className:'',innerHTML:'',classList:{remove(){}},appendChild(){},insertAdjacentElement(){}}; }
    },
    window:{addEventListener(){},BasePortfolioWalletHealth:null},
    MutationObserver:class{ observe(){} },
    escapeHtml:s=>String(s)
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  return context.window.BasePortfolioWalletHealth;
}

const clean={
  portfolio:[{usd:400},{usd:350},{usd:250}],
  totalValue:1000,
  stableValue:250,
  txs:[],
  fingerprint:{concentration:.3,uniqueContracts:12,contractCalls:30},
  metrics:{txCount:30}
};
const cleanScore=loadWithState(clean).score();
assert.equal(cleanScore.score,100);
assert.equal(cleanScore.level,'Excellent');
assert.equal(cleanScore.riskCount,0);

const spender='0000000000000000000000001111111111111111111111111111111111111111';
const max='f'.repeat(64);
const approvalInput=`0x095ea7b3${spender}${max}`;
const risky={
  portfolio:[{usd:900},{usd:100},...Array.from({length:8},()=>({usd:0}))],
  totalValue:1000,
  stableValue:0,
  txs:[{to:'0x2222222222222222222222222222222222222222',input:approvalInput,hash:'0xabc',timeStamp:'1'},...Array.from({length:20},()=>({input:'0x',to:'0x3333333333333333333333333333333333333333'}))],
  fingerprint:{concentration:.8,uniqueContracts:2,contractCalls:20},
  metrics:{txCount:21}
};
const riskyScore=loadWithState(risky).score();
assert.equal(riskyScore.approvals.unlimited,1);
assert.equal(riskyScore.topShare,.9);
assert.ok(riskyScore.score<75);
assert.ok(riskyScore.findings.some(x=>x.title==='Unlimited approval observed'));
assert.ok(riskyScore.findings.some(x=>x.title==='Very high asset concentration'));

console.log('wallet health tests passed');
