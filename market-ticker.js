(function(){
  const tape=document.getElementById('marketTape'),button=document.getElementById('marketTickerToggle'),status=document.getElementById('marketTickerStatus');
  if(!tape||!button||!status)return;
  if(!window.customElements){status.textContent='Market prices are unavailable in this browser.';return;}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused=reduced.matches;
  function update(){tape.toggleAttribute('disable-scroll',paused);button.textContent=paused?'Resume':'Pause';button.setAttribute('aria-pressed',String(paused));}
  update();
  button.addEventListener('click',()=>{paused=!paused;update();});
  reduced.addEventListener('change',e=>{paused=e.matches;update();});
  const timer=setTimeout(()=>{status.textContent='Market feed is taking longer to load. Wallet analysis is still available.';},15000);
  const script=document.createElement('script');script.type='module';script.src='https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js';
  script.addEventListener('error',()=>{clearTimeout(timer);status.textContent='Market prices are unavailable. Wallet analysis is still available.';});
  customElements.whenDefined('tv-ticker-tape').then(()=>{clearTimeout(timer);status.hidden=true;button.disabled=false;});
  document.head.appendChild(script);
})();
