(function(){
  const CANONICAL_ORIGIN='https://base-portfolio.xyz';
  function validAddress(address){return /^0x[a-fA-F0-9]{40}$/.test(String(address||''))}
  function currentState(){try{return typeof state!=='undefined'?state:null}catch{return null}}
  function buildShareUrl(address){
    if(!validAddress(address))return CANONICAL_ORIGIN+'/';
    return `${CANONICAL_ORIGIN}/?address=${encodeURIComponent(address)}`;
  }
  function buildShareText(address,fingerprint){
    const archetype=fingerprint?.archetype||'Base wallet';
    const short=validAddress(address)?`${address.slice(0,8)}…${address.slice(-6)}`:'Base wallet';
    return `${archetype} · ${short}\nExplore this public, read-only Base profile:`;
  }
  function ensureStyles(){
    if(document.getElementById('shareToolsStyles'))return;
    const style=document.createElement('style');style.id='shareToolsStyles';style.textContent='.share-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;align-items:center}.secondary-action{border:1px solid #2b456f;border-radius:13px;padding:13px 18px;background:#0b1830;color:#d7e6ff;font-weight:800;cursor:pointer}.secondary-action:hover{border-color:#4f8cff}.share-action-status{flex-basis:100%;min-height:18px;color:#8fa2bc;font-size:12px}@media(max-width:560px){.share-actions{display:grid;grid-template-columns:1fr}.share-actions .primary,.secondary-action{width:100%;min-height:48px}.share-action-status{grid-column:1}}';document.head.appendChild(style);
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
    const s=currentState(),address=s?.address||'';
    if(!validAddress(address)){setFeedback('Analyze an address first.');return false}
    const url=buildShareUrl(address),text=buildShareText(address,s?.fingerprint);
    if(navigator.share){
      try{await navigator.share({title:'Base Portfolio Explorer',text,url});setFeedback('Share sheet opened.');return true}catch(e){if(e?.name==='AbortError'){setFeedback('Share cancelled.');return false}}
    }
    try{await copyText(url);setFeedback('Profile link copied.');return true}catch{setFeedback('Could not copy the profile link.');return false}
  }
  async function copyProfileLink(){
    const address=currentState()?.address||'';
    if(!validAddress(address)){setFeedback('Analyze an address first.');return false}
    try{await copyText(buildShareUrl(address));setFeedback('Profile link copied.');return true}catch{setFeedback('Could not copy the profile link.');return false}
  }
  function loadPolishAssets(){
    if(!document.querySelector('link[href="./product-polish.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='./product-polish.css';document.head.appendChild(l)}
    if(!document.querySelector('.skip-link')){const a=document.createElement('a');a.className='skip-link';a.href='#addressInput';a.textContent='Skip to address search';document.body.prepend(a)}
    const status=document.getElementById('status');if(status){status.setAttribute('role','status');status.setAttribute('aria-live','polite')}
    ['./product-polish.js','./compare.js'].forEach(src=>{if(document.querySelector(`script[src="${src}"]`))return;const s=document.createElement('script');s.src=src;s.defer=true;document.body.appendChild(s)});
  }
  function init(){
    ensureStyles();ensureUI();loadPolishAssets();
    document.getElementById('shareProfile')?.addEventListener('click',shareProfile);
    document.getElementById('copyProfileLink')?.addEventListener('click',copyProfileLink);
  }
  globalThis.BaseShareTools={CANONICAL_ORIGIN,validAddress,buildShareUrl,buildShareText,shareProfile,copyProfileLink};
  if(typeof document!=='undefined')init();
})();
