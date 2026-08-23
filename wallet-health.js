(function(){
  const APPROVE_SELECTOR='095ea7b3';
  const MAXISH=1n<<255n;

  function latestApprovalSignals(txs){
    const latest=new Map();
    for(const tx of txs||[]){
      const input=String(tx.input||'').replace(/^0x/,'').toLowerCase();
      if(!input.startsWith(APPROVE_SELECTOR)||input.length<8+64+64) continue;
      const token=String(tx.to||'').toLowerCase();
      if(!token) continue;
      const spender=`0x${input.slice(8+24,8+64)}`;
      let amount=0n;
      try{ amount=BigInt(`0x${input.slice(8+64,8+128)}`); }catch{ continue; }
      latest.set(`${token}:${spender}`,{token,spender,amount,hash:tx.hash||'',time:Number(tx.timeStamp||0)});
    }
    const nonzero=[...latest.values()].filter(x=>x.amount>0n);
    return {
      observed:nonzero.length,
      unlimited:nonzero.filter(x=>x.amount>=MAXISH).length,
      revoked:[...latest.values()].filter(x=>x.amount===0n).length,
      samples:nonzero.sort((a,b)=>b.time-a.time).slice(0,3)
    };
  }

  function scoreWalletHealth(){
    if(typeof state==='undefined') return null;
    const portfolio=state.portfolio||[];
    const txs=state.txs||[];
    const f=state.fingerprint||{};
    const total=Number(state.totalValue||0);
    const stable=Number(state.stableValue||0);
    const priced=portfolio.filter(x=>Number(x.usd||0)>0);
    const unpriced=portfolio.filter(x=>!(Number(x.usd||0)>0));
    const topShare=total>0?Math.max(0,...priced.map(x=>Number(x.usd||0)/total)):0;
    const stableShare=total>0?stable/total:0;
    const approvals=latestApprovalSignals(txs);

    let score=100;
    const findings=[];
    const add=(severity,title,detail,penalty=0)=>{ score-=penalty; findings.push({severity,title,detail,penalty}); };

    if(total<=0){ add('info','Limited portfolio pricing','No priced fungible balance is available, so concentration and stablecoin checks are limited.',0); }
    else if(topShare>=0.85) add('high','Very high asset concentration',`${Math.round(topShare*100)}% of priced portfolio value is in one asset.`,14);
    else if(topShare>=0.70) add('medium','High asset concentration',`${Math.round(topShare*100)}% of priced portfolio value is in one asset.`,9);
    else if(topShare>=0.50) add('low','Moderate asset concentration',`${Math.round(topShare*100)}% of priced portfolio value is in one asset.`,4);
    else add('good','Diversified priced holdings','No single priced asset exceeds half of portfolio value.',0);

    if(unpriced.length>=8) add('medium','Many unpriced token balances',`${unpriced.length} fungible balances have no explorer price, which can hide low-quality or spam assets.`,7);
    else if(unpriced.length>=3) add('low','Some unpriced token balances',`${unpriced.length} fungible balances have no explorer price. Review unfamiliar assets before interacting with them.`,3);
    else add('good','Low unpriced-token exposure',`${unpriced.length} fungible balance${unpriced.length===1?'':'s'} without explorer pricing.`,0);

    if(approvals.unlimited>=2) add('high','Multiple unlimited approvals observed',`${approvals.unlimited} latest direct ERC-20 approve calls use effectively unlimited amounts. Verify current allowances before revoking.`,16);
    else if(approvals.unlimited===1) add('medium','Unlimited approval observed','A latest direct ERC-20 approve call uses an effectively unlimited amount. Verify the live allowance before taking action.',9);
    else if(approvals.observed>=5) add('low','Several approval relationships observed',`${approvals.observed} latest direct ERC-20 approve relationships remain non-zero in the indexed transaction sequence.`,4);
    else add('good','No obvious approval red flag','No effectively unlimited latest direct ERC-20 approve call was found in the indexed normal-transaction history.',0);

    const concentration=Number(f.concentration||0);
    const uniqueContracts=Number(f.uniqueContracts||0);
    if(concentration>=0.70 && Number(f.contractCalls||0)>=10) add('medium','Contract activity is highly concentrated',`${Math.round(concentration*100)}% of contract calls went to one destination.`,6);
    else if(uniqueContracts>=10) add('good','Broad contract usage',`Activity spans ${uniqueContracts} unique contract destinations.`,0);
    else if(txs.length>=20) add('low','Limited contract diversity',`Only ${uniqueContracts} unique contract destinations were found in the indexed history.`,2);

    if(total>0){
      if(stableShare>=0.10 && stableShare<=0.60) add('good','Balanced stablecoin exposure',`${Math.round(stableShare*100)}% of priced portfolio value is in recognized stablecoins.`,0);
      else if(stableShare>0.85) add('low','Stablecoin-heavy portfolio',`${Math.round(stableShare*100)}% of priced value is in recognized stablecoins. This is concentration, not necessarily a safety problem.`,3);
      else if(stableShare===0) add('info','No recognized stablecoin balance','No priced balance in the app’s recognized stablecoin set was found.',0);
    }

    if((state.metrics?.txCount||0)>=10000) add('info','History coverage capped','Health analysis uses the explorer’s first 10,000 indexed normal transactions, so older/later approval evidence may be incomplete.',0);

    score=Math.max(0,Math.min(100,Math.round(score)));
    const level=score>=90?'Excellent':score>=75?'Good':score>=55?'Needs review':'High attention';
    const riskCount=findings.filter(x=>x.penalty>0).length;
    return {score,level,riskCount,findings,approvals,topShare,stableShare,unpricedCount:unpriced.length};
  }

  function severityLabel(s){ return ({high:'High',medium:'Medium',low:'Low',good:'Good',info:'Info'})[s]||'Info'; }

  function renderWalletHealth(){
    const root=document.getElementById('walletHealthCard');
    if(!root) return;
    const health=scoreWalletHealth();
    if(!health) return;
    state.walletHealth=health;
    document.getElementById('walletHealthScore').textContent=`${health.score}/100`;
    document.getElementById('walletHealthLevel').textContent=health.level;
    document.getElementById('walletHealthRisks').textContent=health.riskCount?`${health.riskCount} item${health.riskCount===1?'':'s'} to review`:'No scored red flags';
    const list=document.getElementById('walletHealthFindings');
    list.innerHTML='';
    health.findings.forEach(item=>{
      const el=document.createElement('div');
      el.className=`health-finding health-${item.severity}`;
      el.innerHTML=`<div class="health-finding-main"><span class="health-severity">${severityLabel(item.severity)}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div></div>${item.penalty?`<span class="health-penalty">−${item.penalty}</span>`:''}`;
      list.appendChild(el);
    });
    const note=document.getElementById('walletHealthApprovalNote');
    note.textContent=`Approval hygiene is inferred only from direct ERC-20 approve(...) calls visible in indexed normal transactions (${health.approvals.observed} latest non-zero relationship${health.approvals.observed===1?'':'s'} observed). Permit2, signatures, internal calls and current onchain allowance state are not fully verified in V1.`;
    root.classList.remove('hidden');
  }

  function maybeRender(){
    const status=document.getElementById('status');
    if(status && status.textContent.startsWith('Loaded public Base data for ')) renderWalletHealth();
  }

  const status=document.getElementById('status');
  if(status){ new MutationObserver(maybeRender).observe(status,{childList:true,characterData:true,subtree:true}); }
  window.addEventListener('load',maybeRender);
  window.BasePortfolioWalletHealth={score:scoreWalletHealth,render:renderWalletHealth};
})();
