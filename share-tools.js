(function(){
  const CANONICAL_ORIGIN='https://base-portfolio.xyz';
  function validAddress(address){return /^0x[a-fA-F0-9]{40}$/.test(String(address||''))}
  function buildShareUrl(address){
    if(!validAddress(address))return CANONICAL_ORIGIN+'/';
    return `${CANONICAL_ORIGIN}/?address=${encodeURIComponent(address)}`;
  }
  function buildShareText(address,fingerprint){
    const archetype=fingerprint?.archetype||'Base wallet';
    const short=validAddress(address)?`${address.slice(0,8)}…${address.slice(-6)}`:'Base wallet';
    return `${archetype} · ${short}\nExplore this public, read-only Base profile:`;
  }
  function ensureUI(){
    const host=document.querySelector('.share-copy');
    if(!host||document.getElementById('shareProfile'))return;
    const actions=document.createElement('div');actions.className='share-actions';
    actions.innerHTML='<button id="shareProfile" class="primary" type="button">Share profile</button><button id="copyProfileLink" class="secondary-action" type="button">Copy profile link</button><span id="shareActionStatus" class="share-action-status" aria-live="polite"></span>';
    const download=document.getElementById('downloadCard');
    if(download)download.insertAdjacentElement('afterend',actions);else host.appendChild(actions);
  }
  async function copyText(text){
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true}
    const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();return ok;
  }
  function setFeedback(text){const el=document.getElementById('shareActionStatus');if(el)el.textContent=text}
  async function shareProfile(){
    const address=globalThis.state?.address||'';
    if(!validAddress(address)){setFeedback('Analyze an address first.');return false}
    const url=buildShareUrl(address),text=buildShareText(address,globalThis.state?.fingerprint);
    if(navigator.share){
      try{await navigator.share({title:'Base Portfolio Explorer',text,url});setFeedback('Share sheet opened.');return true}catch(e){if(e?.name==='AbortError'){setFeedback('Share cancelled.');return false}}
    }
    try{await copyText(url);setFeedback('Profile link copied.');return true}catch{setFeedback('Could not copy the profile link.');return false}
  }
  async function copyProfileLink(){
    const address=globalThis.state?.address||'';
    if(!validAddress(address)){setFeedback('Analyze an address first.');return false}
    try{await copyText(buildShareUrl(address));setFeedback('Profile link copied.');return true}catch{setFeedback('Could not copy the profile link.');return false}
  }
  function init(){
    ensureUI();
    document.getElementById('shareProfile')?.addEventListener('click',shareProfile);
    document.getElementById('copyProfileLink')?.addEventListener('click',copyProfileLink);
  }
  globalThis.BaseShareTools={CANONICAL_ORIGIN,validAddress,buildShareUrl,buildShareText,shareProfile,copyProfileLink};
  if(typeof document!=='undefined')init();
})();
