// cecAcademy — player HTML5 próprio. É o único player das aulas (celular e desktop).
// O Google Drive é só armazenamento: o vídeo chega por /api/media (Pages Function), com Range/206.
(()=>{
'use strict';
const SPEEDS=[0.5,0.75,1,1.25,1.5,1.75,2];
try{localStorage.removeItem('cec-player')}catch{} // limpa a chave da fase de teste

// iOS ignora alterações de volume por script: nesse caso mostramos apenas o botão de mudo.
const volumeWritable=(()=>{try{const v=document.createElement('video');v.volume=.5;return Math.abs(v.volume-.5)<.01}catch{return false}})();

const fmt=n=>{if(!Number.isFinite(n)||n<0)return '--:--';n=Math.floor(n);const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=String(n%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${s}`:`${m}:${s}`};
const rateLabel=r=>String(r).replace('.',',')+'x';
const svg=p=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${p}</svg>`;
const icon={
 play:svg('<path d="M8 5.2v13.6L19 12z" fill="currentColor"/>'),
 pause:svg('<path d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z" fill="currentColor"/>'),
 replay:svg('<path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" fill="currentColor"/>'),
 back:svg('<path d="M12 4.5V1.8L7.6 5.4 12 9V6.3a6.2 6.2 0 1 1-6.2 6.2H4a8 8 0 1 0 8-8z" fill="currentColor"/><text x="12" y="16" text-anchor="middle" font-size="7.2" font-weight="700" fill="currentColor" font-family="Manrope,Arial,sans-serif">15</text>'),
 fwd:svg('<path d="M12 4.5V1.8l4.4 3.6L12 9V6.3a6.2 6.2 0 1 0 6.2 6.2H20a8 8 0 1 1-8-8z" fill="currentColor"/><text x="12" y="16" text-anchor="middle" font-size="7.2" font-weight="700" fill="currentColor" font-family="Manrope,Arial,sans-serif">15</text>'),
 vol:svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15 8.8a4.5 4.5 0 0 1 0 6.4M17.6 6.2a8 8 0 0 1 0 11.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>'),
 mute:svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m15.5 9.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
 full:svg('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
 unfull:svg('<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
};

let active=null;

function markup(v,esc,title){
 const src='/api/media?id='+encodeURIComponent(v.id);
 return `<div class="hp" id="hp" data-state="loading">
<video id="videoFrame" class="hp-video" playsinline webkit-playsinline preload="metadata" src="${src}#t=0.001" aria-label="Videoaula: ${esc(title(v.name))}"></video>
<div class="hp-tap" aria-hidden="true"></div>
<div class="hp-flash" aria-hidden="true"></div>
<div class="hp-chip" role="status" aria-live="polite">Carregando vídeo…</div>
<div class="hp-center">
 <button type="button" class="hp-btn hp-skip" data-hp="back" aria-label="Voltar 15 segundos">${icon.back}</button>
 <span class="hp-play-wrap"><span class="hp-ring" aria-hidden="true"></span><button type="button" class="hp-btn hp-play" data-hp="play" aria-label="Reproduzir">${icon.play}</button></span>
 <button type="button" class="hp-btn hp-skip" data-hp="fwd" aria-label="Avançar 15 segundos">${icon.fwd}</button>
</div>
<div class="hp-bottom">
 <input class="hp-seek" type="range" min="0" max="1000" step="1" value="0" data-hp="seek" aria-label="Posição do vídeo" aria-valuetext="0:00 de --:--" disabled>
 <div class="hp-bar">
  <span class="hp-time"><span data-hp-cur>0:00</span> / <span data-hp-dur>--:--</span></span>
  <span class="hp-grow"></span>
  <button type="button" class="hp-btn hp-small" data-hp="mute" aria-label="Desativar som">${icon.vol}</button>
  ${volumeWritable?'<input class="hp-volume" type="range" min="0" max="1" step="0.05" value="1" data-hp="volume" aria-label="Volume">':''}
  <button type="button" class="hp-btn hp-small hp-speed" data-hp="speed" aria-haspopup="dialog" aria-expanded="false" aria-label="Velocidade de reprodução: 1x">1x</button>
  <button type="button" class="hp-btn hp-small" data-hp="cinema" aria-label="Entrar no modo cinema">${icon.full}</button>
 </div>
</div>
<div class="hp-panel hp-menu" hidden role="dialog" aria-label="Velocidade de reprodução"><div class="hp-sheet">
 <div class="hp-sheet-head"><strong>Velocidade</strong><button type="button" class="hp-btn hp-small" data-hp="menu-close" aria-label="Fechar">✕</button></div>
 <div class="hp-speeds">${SPEEDS.map(s=>`<button type="button" data-hp="rate" data-rate="${s}" aria-pressed="${s===1}">${rateLabel(s)}</button>`).join('')}</div>
</div></div>
<div class="hp-panel hp-error" hidden role="alert"><div class="hp-sheet">
 <p class="hp-error-text"></p>
 <div class="hp-error-actions"><button type="button" data-hp="retry">↻ Tentar novamente</button></div>
</div></div>
</div>`;
}

function mount(v,hooks={}){
 stop();
 const root=document.getElementById('hp');if(!root)return;
 const video=root.querySelector('video'),wrap=root.closest('.player-wrap');
 const q=s=>root.querySelector(s);
 const seek=q('.hp-seek'),cur=q('[data-hp-cur]'),dur=q('[data-hp-dur]'),chip=q('.hp-chip'),playBtn=q('[data-hp="play"]'),muteBtn=q('[data-hp="mute"]'),vol=q('[data-hp="volume"]'),speedBtn=q('[data-hp="speed"]'),cinemaBtn=q('[data-hp="cinema"]'),menu=q('.hp-menu'),err=q('.hp-error'),errText=q('.hp-error-text'),flash=q('.hp-flash');
 const src=video.getAttribute('src').split('#')[0];
 const state={stopped:false,seeking:false,pendingTime:0,resume:false,hideTimer:0,waitTimer:0,lastTap:0,icons:{}};
 let rate=1;try{const r=Number(localStorage.getItem('cec-speed'));if(SPEEDS.includes(r))rate=r}catch{}
 video.defaultPlaybackRate=rate;video.playbackRate=rate;
 wrap?.classList.add('has-hp');

 const setState=s=>{root.dataset.state=s};
 const say=t=>{chip.textContent=t||'';chip.hidden=!t};
 const setIcon=(btn,key,label)=>{if(state.icons[btn.dataset.hp]!==key){btn.innerHTML=icon[key];state.icons[btn.dataset.hp]=key}btn.setAttribute('aria-label',label)};
 const idle=on=>{root.classList.toggle('hp-idle',on);wrap?.classList.toggle('hp-idle',on)};
 function show(){idle(false);clearTimeout(state.hideTimer);if(!video.paused&&!video.ended&&menu.hidden&&err.hidden&&!state.seeking)state.hideTimer=setTimeout(hide,3200)}
 function hide(){if(video.paused||video.ended||!menu.hidden||!err.hidden||state.seeking)return;idle(true)}

 function paint(){
  const d=video.duration,known=Number.isFinite(d)&&d>0;
  const t=state.seeking&&known?Number(seek.value)/1000*d:video.currentTime;
  cur.textContent=fmt(t);dur.textContent=fmt(d);
  seek.disabled=!known;
  if(known){
   if(!state.seeking)seek.value=String(Math.round(video.currentTime/d*1000));
   const p=Number(seek.value)/10;let b=0;
   try{for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=video.currentTime+1)b=Math.max(b,video.buffered.end(i))}catch{}
   seek.style.setProperty('--p',p+'%');seek.style.setProperty('--b',Math.max(p,Math.min(100,b/d*100))+'%');
  }
  seek.setAttribute('aria-valuetext',fmt(t)+' de '+fmt(d));
  const paused=video.paused||video.ended;
  setIcon(playBtn,paused?(video.ended?'replay':'play'):'pause',paused?(video.ended?'Assistir novamente':'Reproduzir'):'Pausar');
  const silent=video.muted||video.volume===0;
  setIcon(muteBtn,silent?'mute':'vol',silent?'Ativar som':'Desativar som');
  if(vol&&document.activeElement!==vol)vol.value=String(video.muted?0:video.volume);
  speedBtn.textContent=rateLabel(video.playbackRate);
  speedBtn.setAttribute('aria-label','Velocidade de reprodução: '+rateLabel(video.playbackRate));
  root.querySelectorAll('[data-rate]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.rate)===video.playbackRate)));
  const cinema=!!wrap?.classList.contains('cinema-on');
  setIcon(cinemaBtn,cinema?'unfull':'full',cinema?'Sair do modo cinema':'Entrar no modo cinema');
 }

 async function toggle(){
  if(video.paused||video.ended){
   try{if(video.ended)video.currentTime=0;await video.play()}
   catch(e){if(state.stopped)return;if(e?.name==='NotAllowedError')say('Toque em reproduzir para iniciar.');else if(e?.name!=='AbortError')diagnose()}
  }else video.pause();
  show();
 }
 function skip(delta){
  const d=video.duration;let t=video.currentTime+delta;
  t=Math.max(0,Number.isFinite(d)?Math.min(d,t):t);
  video.currentTime=t;
  flash.textContent=(delta<0?'− ':'+ ')+Math.abs(delta)+' s';flash.className='hp-flash '+(delta<0?'left':'right');void flash.offsetWidth;flash.classList.add('show');
  paint();show();
 }
 function setRate(r){video.playbackRate=r;video.defaultPlaybackRate=r;try{localStorage.setItem('cec-speed',String(r))}catch{}paint()}
 function openMenu(open){menu.hidden=!open;speedBtn.setAttribute('aria-expanded',String(open));if(open){idle(false);clearTimeout(state.hideTimer);menu.querySelector('[aria-pressed="true"]')?.focus()}else{show();speedBtn.focus()}}

 async function diagnose(){
  if(state.stopped)return;
  setState('error');say('');clearTimeout(state.waitTimer);
  let msg='Não foi possível reproduzir este vídeo.',retryLabel='↻ Tentar novamente',relogin=false;
  const code=video.error?.code;
  try{
   const r=await fetch(src,{headers:{Range:'bytes=0-1'},cache:'no-store',credentials:'same-origin'});
   if(r.ok){
    await r.body?.cancel();
    msg=code===4||code===3?'O arquivo desta aula não pôde ser reproduzido neste navegador (formato incompatível ou arquivo inválido). Avise o administrador.':'A conexão com o vídeo foi interrompida. Verifique a internet e tente novamente.';
   }else{
    const j=await r.json().catch(()=>({}));
    msg=j.error||('O servidor respondeu com erro '+r.status+'.');
    if(r.status===401){relogin=true;retryLabel='Entrar novamente'}
   }
  }catch{msg='Sem conexão com o servidor. Verifique a internet e tente novamente.'}
  if(state.stopped)return;
  errText.textContent=msg;
  const rb=err.querySelector('[data-hp="retry"]');rb.textContent=retryLabel;rb.dataset.relogin=relogin?'1':'';
  menu.hidden=true;err.hidden=false;idle(false);paint();
 }
 function retry(){
  if(state.stopped)return;
  const t=video.currentTime||state.pendingTime;state.resume=!video.paused||state.resume;
  err.hidden=true;setState('loading');say('Recarregando vídeo…');
  state.pendingTime=t;video.src=t>0?src:src+'#t=0.001';video.load();
  if(state.resume)video.play().catch(()=>{});
  show();
 }

 const on=(el,ev,fn,opt)=>el.addEventListener(ev,fn,opt);
 on(video,'loadedmetadata',()=>{if(state.pendingTime>0){try{video.currentTime=state.pendingTime}catch{}state.pendingTime=0}video.playbackRate=video.defaultPlaybackRate;setState(video.paused?'paused':'playing');say('');paint()});
 ['durationchange','timeupdate','progress','ratechange','volumechange','seeked'].forEach(ev=>on(video,ev,paint));
 on(video,'waiting',()=>{setState('loading');clearTimeout(state.waitTimer);state.waitTimer=setTimeout(()=>{if(root.dataset.state==='loading')say('Carregando…')},700)});
 on(video,'canplay',()=>{clearTimeout(state.waitTimer);if(root.dataset.state==='loading'){setState(video.paused?'paused':'playing');say('')}});
 on(video,'playing',()=>{clearTimeout(state.waitTimer);setState('playing');say('');state.resume=false;paint();show()});
 on(video,'pause',()=>{if(root.dataset.state!=='error')setState('paused');paint();show()});
 on(video,'ended',()=>{setState('paused');paint();show()});
 on(video,'error',()=>{if(!state.stopped)diagnose()});

 on(root,'click',e=>{
  const b=e.target.closest('[data-hp]');if(!b||!root.contains(b))return;
  const a=b.dataset.hp;
  if(a==='play')toggle();
  else if(a==='back')skip(-15);
  else if(a==='fwd')skip(15);
  else if(a==='mute'){video.muted=!video.muted;if(!video.muted&&video.volume===0)video.volume=1;show()}
  else if(a==='speed')openMenu(menu.hidden);
  else if(a==='menu-close')openMenu(false);
  else if(a==='rate'){setRate(Number(b.dataset.rate));openMenu(false)}
  else if(a==='cinema'){hooks.toggleCinema?.();setTimeout(paint,50);show()}
  else if(a==='retry'){if(b.dataset.relogin)location.reload();else retry()}
 });
 on(q('.hp-tap'),'click',e=>{
  const now=Date.now(),r=root.getBoundingClientRect(),x=(e.clientX-r.left)/r.width;
  // Toque duplo nas laterais: ±15 s (como no YouTube). Toque simples: mostra/oculta os controles.
  if(now-state.lastTap<320&&(x<.35||x>.65)){state.lastTap=0;skip(x<.35?-15:15);return}
  state.lastTap=now;
  if(root.classList.contains('hp-idle'))show();else if(!video.paused&&!video.ended)hide();else show();
 });
 on(seek,'input',()=>{state.seeking=true;idle(false);clearTimeout(state.hideTimer);paint()});
 on(seek,'change',()=>{const d=video.duration;if(Number.isFinite(d)&&d>0)video.currentTime=d*Number(seek.value)/1000;state.seeking=false;paint();show()});
 on(seek,'pointercancel',()=>{state.seeking=false;paint()});
 if(vol)on(vol,'input',()=>{const x=Number(vol.value);video.volume=x;video.muted=x===0;show()});
 on(root,'keydown',e=>{
  if(e.target.matches('input'))return;
  const k=e.key.toLowerCase();
  if(k===' '||k==='k'){e.preventDefault();toggle()}
  else if(k==='arrowleft'||k==='j'){e.preventDefault();skip(-15)}
  else if(k==='arrowright'||k==='l'){e.preventDefault();skip(15)}
  else if(k==='m'){video.muted=!video.muted}
  else if(k==='escape'&&!menu.hidden){e.stopPropagation();openMenu(false)}
 });
 on(root,'pointerdown',()=>{if(!root.classList.contains('hp-idle'))show()},{passive:true});

 try{
  if('mediaSession' in navigator){
   navigator.mediaSession.metadata=new MediaMetadata({title:hooks.title||'Videoaula',artist:'cecAcademy',album:hooks.category||''});
   navigator.mediaSession.setActionHandler('seekbackward',()=>active?.video===video&&skip(-15));
   navigator.mediaSession.setActionHandler('seekforward',()=>active?.video===video&&skip(15));
  }
 }catch{}

 active={video,root,state,paint,retry,
  stop(){state.stopped=true;clearTimeout(state.hideTimer);clearTimeout(state.waitTimer);try{video.pause();video.removeAttribute('src');video.load()}catch{}wrap?.classList.remove('has-hp','hp-idle')}};
 paint();
}

function stop(){if(!active)return;const a=active;active=null;a.stop()}

window.CecPlayer={
 enabled:()=>true,
 markup,mount,stop,
 active:()=>!!active,
 retry:()=>active?.retry(),
 refresh:()=>active?.paint(),
 video:()=>active?.video||null
};
})();
