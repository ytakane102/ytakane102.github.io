'use strict';
const main = document.querySelector('#main');
const viewer = document.querySelector('#viewer');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let events = [], wallCleanup = () => {}, coverCleanup = () => {}, activeEvent, activeIndex = 0, lastFocus, galleryShown = 0;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const src = (p, size = 'thumb') => `./assets/photos/${p.id}-${size}.webp`;
const photoImage = (p, alt, lazy = true) => `<img src="${src(p)}" alt="${esc(alt)}" width="${p.width}" height="${p.height}" ${lazy ? 'loading="lazy"' : ''} decoding="async">`;
function shuffled(items) {
 const result = [...items];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
const eventOrder = ['装飾・日常','夏合宿','海ドライブ','新歓合宿','運動会'];
const eventRank = event => {const rank=eventOrder.indexOf(event.name);return rank<0?eventOrder.length:rank;};
const cover = e => e.photos[Math.floor(Math.random()*e.photos.length)];
const arrow = '<span class="round-arrow" aria-hidden="true">↗</span>';
function breadcrumb(year, event) { return `<nav class="breadcrumbs" aria-label="パンくず"><a href="#/">トップ</a><span>/</span>${event ? `<a href="#/year/${year}">${year}</a><span>/</span><span>${esc(event.name)}</span>` : `<span>${year}</span>`}</nav>`; }
function home() {
 document.title = '編集局アルバム';
 main.innerHTML = `<section class="hero" aria-label="写真一覧"><div class="photo-wall" aria-hidden="true"></div><div class="hero-note"><h1>編集局アルバム</h1></div></section><section class="section-wrap" id="years"><div class="section-heading"><h2>年度</h2></div><div class="year-list">${[2026,2025,2024].map(y => {
 const list = events.filter(e => e.year === y);
 if (!list.length) return `<article class="year-card pending"><div class="year-top"><span class="year-number">${y}</span></div><div class="year-empty"><span>cooming soon</span></div></article>`;
 const e = list.find(e => e.name === '海ドライブ') ?? list[0];
 return `<a class="year-card" href="#/year/${y}"><div class="year-top"><span class="year-number">${y}</span></div><div class="year-cover" data-cover-year="${y}">${photoImage(cover(e),`${y}年の写真`)}</div><div class="year-details"><span aria-hidden="true">↗</span></div></a>`;
 }).join('')}</div></section>`;
 startWall();
}
function startWall(userPaused = reducedMotion.matches) {
 const wall = document.querySelector('.photo-wall');
 const all = shuffled(events.filter(e=>e.year===2026).flatMap(e=>e.photos));
 if(!all.length) return;
 let paused = userPaused, visible = true, raf, last = 0, resizeTimer;
 const rows = Array.from({length:5}, (_,r) => {
  const row = document.createElement('div');row.className = 'film-row';
  const track = document.createElement('div');track.className = 'film-track'; row.append(track);wall.append(row);
  const tileCount = Math.ceil(window.innerWidth / 200) + 3;
  const rowPhotos = all.filter((_,i) => i % 5 === r);
  let cursor = 0;
  const makeTile = () => { const tile=document.createElement('div');tile.className='film-tile';const img=document.createElement('img');img.alt='';img.decoding='async';img.draggable=false;tile.append(img);return tile; };
  const assign = tile => { const photo=rowPhotos[cursor++ % rowPhotos.length] ?? all[0];tile.firstChild.src=src(photo); };
  const appendTile=()=>{const tile=makeTile();assign(tile);track.append(tile);};
  for(let i=0;i<tileCount;i++) appendTile();
  const step = track.firstChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
  return {track,offset:0,direction:r%2?1:-1,speed:12+r*2,assign,step,appendTile};
 });
 const observer = new IntersectionObserver(entries => {visible=entries[0].isIntersecting;});observer.observe(wall);
 const frame = now => {
  const dt=Math.min((now-last)/1000 || 0,.05);last=now;
  if(!paused && visible && !document.hidden){
   for(const row of rows){const step=row.step; row.offset += dt*row.speed;
    if(row.offset >= step){row.offset-=step;if(row.direction<0){const tile=row.track.firstChild;row.track.append(tile);row.assign(tile);}else{const tile=row.track.lastChild;row.track.prepend(tile);row.assign(tile);}}
    row.track.style.transform=`translate3d(${row.direction<0 ? -row.offset : row.offset-step}px,0,0)`;
   }
  }
  raf=requestAnimationFrame(frame);
 };
 raf=requestAnimationFrame(frame);
 const onMotion=e=>{paused=e.matches;};reducedMotion.addEventListener('change',onMotion);
 let layoutWidth=window.innerWidth;
 const onResize=()=>{
  // Mobile browser chrome changes viewport height while scrolling.
  // Retain the same rows, photo queue and progress during every resize.
  if(window.innerWidth===layoutWidth) return;
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
   layoutWidth=window.innerWidth;
   const tileCount=Math.ceil(layoutWidth/200)+3;
   for(const row of rows){
    while(row.track.children.length<tileCount) row.appendTile();
    const step=row.track.firstChild.getBoundingClientRect().width+parseFloat(getComputedStyle(row.track).gap);
    row.offset=row.offset/row.step*step;
    row.step=step;
   }
  },150);
 };
 window.addEventListener('resize',onResize);
 wallCleanup=()=>{cancelAnimationFrame(raf);clearTimeout(resizeTimer);observer.disconnect();window.removeEventListener('resize',onResize);reducedMotion.removeEventListener('change',onMotion);};
}
function startCoverFades() {
 const cards=[...document.querySelectorAll('[data-cover-year],[data-cover-event]')].map((element,index)=>({
  element, front:element.querySelector('img'), visible:false, busy:false,
  lastChange:performance.now()+index*450,
  photos:events.filter(e=>element.dataset.coverEvent ? e.id===element.dataset.coverEvent : e.year===Number(element.dataset.coverYear)).flatMap(e=>e.photos)
 }));
 if(!cards.length) return;
 let disposed=false;
 const animations=new Map();
 const canPlay=card=>!disposed && card.visible && !document.hidden && !reducedMotion.matches;
 const sync=()=>{for(const [animation,card] of animations) canPlay(card)?animation.play():animation.pause();};
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){const card=cards.find(card=>card.element===entry.target);card.visible=entry.isIntersecting;}
  sync();
 });
 cards.forEach(card=>observer.observe(card.element));
 async function change(card){
  const choices=card.photos.filter(photo=>!card.front.src.includes(photo.id));
  if(!choices.length) return;
  card.busy=true;card.lastChange=performance.now();
  const image=new Image();image.alt=card.front.alt;image.decoding='async';
  image.src=src(choices[Math.floor(Math.random()*choices.length)]);
  try{
   await image.decode();
   if(!canPlay(card)) return;
   card.element.append(image);
   const animation=image.animate([{opacity:0},{opacity:1}],{duration:1400,easing:'ease-in-out',fill:'forwards'});
   animations.set(animation,card);
   try{await animation.finished;}finally{animations.delete(animation);}
   if(disposed) return;
   card.front.remove();card.front=image;animation.cancel();
  }catch{image.remove();}finally{card.busy=false;}
 }
 const timer=setInterval(()=>{
  const now=performance.now();
  cards.filter(card=>canPlay(card)&&!card.busy&&now-card.lastChange>=4200).forEach(change);
 },300);
 document.addEventListener('visibilitychange',sync);
 reducedMotion.addEventListener('change',sync);
 coverCleanup=()=>{
  disposed=true;clearInterval(timer);observer.disconnect();
  animations.forEach((_,animation)=>animation.cancel());animations.clear();
  document.removeEventListener('visibilitychange',sync);reducedMotion.removeEventListener('change',sync);
 };
}
function yearPage(year) {
 const list=events.filter(e=>e.year===year).sort((a,b)=>eventRank(a)-eventRank(b));
 document.title=`${year}年のアルバム | 編集局アルバム`;
 if(!list.length){main.innerHTML=`<section class="inner-page">${breadcrumb(year)}<div class="empty-page"><h1>${year}</h1><p>cooming soon</p><a class="back-link" href="#/">← トップへ</a></div></section>`;return;}
 main.innerHTML=`<section class="inner-page">${breadcrumb(year)}<div class="page-heading"><div><h1>${year}</h1></div></div><div class="event-grid">${list.map((e,i)=>`<a class="event-card" href="#/event/${e.id}"><div class="event-cover" data-cover-event="${e.id}">${photoImage(cover(e),e.name)}</div><div class="event-meta"><div><h2>${esc(e.name)}</h2></div>${arrow}</div></a>`).join('')}</div><a class="back-link" href="#/">← トップへ</a></section>`;
}
function eventPage(event) {
 activeEvent={...event,photos:shuffled(event.photos)};galleryShown=0;
 document.title=`${event.name} · ${event.year} | 編集局アルバム`;
 main.innerHTML=`<section class="inner-page">${breadcrumb(event.year,event)}<div class="page-heading event-heading"><div><div class="eyebrow">${event.year}</div><h1>${esc(event.name)}</h1></div></div><div class="gallery-tools"><span>写真をタップして拡大</span><a href="#/year/${event.year}">イベント一覧 ↗</a></div><div class="gallery" id="gallery"></div><div class="more-wrap"><button id="load-more" class="more-button">もっと見る ＋</button></div><a class="back-link" href="#/year/${event.year}">← ${event.year}年のイベントへ</a></section>`;
 document.querySelector('#load-more').onclick=appendPhotos;
 document.querySelector('#gallery').onclick=e=>{const b=e.target.closest('[data-photo]');if(b)openViewer(activeEvent,Number(b.dataset.photo));};
 appendPhotos();
}
function appendPhotos(){
 const end=Math.min(galleryShown+60,activeEvent.photos.length);
 document.querySelector('#gallery').insertAdjacentHTML('beforeend',activeEvent.photos.slice(galleryShown,end).map((p,i)=>`<button class="photo-button" data-photo="${galleryShown+i}" aria-label="${esc(activeEvent.name)}の写真 ${galleryShown+i+1} を拡大">${photoImage(p,`${activeEvent.name} ${galleryShown+i+1}`)}</button>`).join(''));
 galleryShown=end;
 document.querySelector('#load-more').hidden=end===activeEvent.photos.length;
}
function openViewer(event,index){activeEvent=event;activeIndex=index;lastFocus=document.activeElement;viewer.showModal();showPhoto();document.querySelector('#close-viewer').focus();}
function showPhoto(){
 const p=activeEvent.photos[activeIndex], img=document.querySelector('#viewer-image');
 img.src=src(p,'full');img.alt=`${activeEvent.year}年 ${activeEvent.name}の写真 ${activeIndex+1}`;
 document.querySelector('#viewer-title').textContent=`${activeEvent.year} / ${activeEvent.name}`;
}
function movePhoto(direction){activeIndex=(activeIndex+direction+activeEvent.photos.length)%activeEvent.photos.length;showPhoto();}
function closeViewer(){viewer.close();lastFocus?.focus();}
viewer.addEventListener('close',()=>{document.querySelector('#viewer-image').removeAttribute('src');lastFocus?.focus();});
document.querySelector('#close-viewer').onclick=closeViewer;
document.querySelector('#previous').onclick=()=>movePhoto(-1);
document.querySelector('#next').onclick=()=>movePhoto(1);
viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();movePhoto(-1);}if(e.key==='ArrowRight'){e.preventDefault();movePhoto(1);}});
let touchStart;
viewer.addEventListener('touchstart',e=>{if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};else touchStart=null;},{passive:true});
viewer.addEventListener('touchend',e=>{if(!touchStart)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5)movePhoto(dx<0?1:-1);touchStart=null;},{passive:true});
function route(){
 wallCleanup();wallCleanup=()=>{};
 coverCleanup();coverCleanup=()=>{};
 if(viewer.open)closeViewer();
 const hash=location.hash;
 const year=hash.match(/^#\/year\/(202[456])$/), event=hash.match(/^#\/event\/([a-f0-9]+)$/);
 if(year)yearPage(Number(year[1]));else if(event){const e=events.find(e=>e.id===event[1]);if(e)eventPage(e);else main.innerHTML='<section class="empty-page"><h1>404</h1><p>アルバムが見つかりませんでした。</p><a class="back-link" href="#/">トップへ戻る</a></section>';}else home();
 startCoverFades();
 if(hash==='#years')requestAnimationFrame(()=>document.querySelector('#years')?.scrollIntoView());else window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
fetch('./assets/album.json').then(r=>{if(!r.ok)throw new Error('Album loading failed');return r.json();}).then(data=>{events=data.events;route();}).catch(()=>{main.innerHTML='<div class="loading">アルバムを読み込めませんでした。<br><br><button class="more-button" onclick="location.reload()">もう一度読み込む</button></div>';});
