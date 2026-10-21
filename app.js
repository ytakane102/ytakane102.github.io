'use strict';
const main = document.querySelector('#main');
const viewer = document.querySelector('#viewer');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let events = [], wallCleanup = () => {}, activeEvent, activeIndex = 0, lastFocus, galleryShown = 0;
const count = n => n.toLocaleString('ja-JP');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const src = (p, size = 'thumb') => `./assets/photos/${p.id}-${size}.webp`;
const photoImage = (p, alt, lazy = true) => `<img src="${src(p)}" alt="${esc(alt)}" width="${p.width}" height="${p.height}" ${lazy ? 'loading="lazy"' : ''} decoding="async">`;
function shuffled(items) {
 const result = [...items];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
const cover = e => e.photos[Math.floor(Math.random()*e.photos.length)];
const arrow = '<span class="round-arrow" aria-hidden="true">↗</span>';
const total = list => list.reduce((n,e) => n + e.photos.length,0);
function breadcrumb(year, event) { return `<nav class="breadcrumbs" aria-label="パンくず"><a href="#/">トップ</a><span>/</span>${event ? `<a href="#/year/${year}">${year}</a><span>/</span><span>${esc(event.name)}</span>` : `<span>${year}</span>`}</nav>`; }
function home() {
 document.title = '編集局アルバム';
 main.innerHTML = `<section class="hero" aria-label="写真一覧"><div class="photo-wall" aria-hidden="true"></div><div class="hero-note"><h1>編集局アルバム</h1><a class="round-link" href="#years">年度を選択 <span class="round-arrow" aria-hidden="true">↓</span></a></div><button class="motion-control" id="motion-toggle" aria-pressed="${reducedMotion.matches}"></button></section><section class="section-wrap" id="years"><div class="section-heading"><h2>年度</h2></div><div class="year-list">${[2026,2025,2024].map(y => {
 const list = events.filter(e => e.year === y);
 if (!list.length) return `<article class="year-card pending"><div class="year-top"><span class="year-number">${y}</span></div><div class="year-empty"><span>cooming soon</span></div></article>`;
 const e = list.find(e => e.name === '海ドライブ') ?? list[0];
 return `<a class="year-card" href="#/year/${y}"><div class="year-top"><span class="year-number">${y}</span><span class="year-status"><i class="status-dot"></i>公開中</span></div><div class="year-cover">${photoImage(cover(e),`${y}年の写真`)}</div><div class="year-details"><span>${list.length}イベント &nbsp; / &nbsp; ${count(total(list))}枚</span><span aria-hidden="true">↗</span></div></a>`;
 }).join('')}</div></section>`;
 startWall();
}
function startWall(userPaused = reducedMotion.matches) {
 const wall = document.querySelector('.photo-wall');
 const photos = events.flatMap(e=>e.photos);
 if(!photos.length) return;
 let queue = shuffled(photos), cursor = 0;
 const nextPhoto = () => {
  if(cursor===queue.length){queue=shuffled(photos);cursor=0;}
  return queue[cursor++];
 };
 let paused = userPaused, visible = true, disposed = false, resizeTimer;
 const animations = new Set();
 const tiles = [];
 const button = document.querySelector('#motion-toggle');
 const canPlay = () => !disposed && !paused && visible && !document.hidden;
 const syncPlayback = () => {
  for(const animation of animations) canPlay() ? animation.play() : animation.pause();
  button.innerHTML = paused ? '<span aria-hidden="true">▷</span> 再生する' : '<span aria-hidden="true">Ⅱ</span> 動きを止める';
  button.setAttribute('aria-pressed',String(paused));
 };
 button.onclick=()=>{paused=!paused;syncPlayback();};
 const columnsForWidth = () => Math.max(3,Math.ceil(window.innerWidth/(window.innerWidth<=600?150:190)));
 const columns = columnsForWidth();
 wall.style.setProperty('--wall-columns',columns);
 const makeImage = photo => {
  const img=new Image();img.alt='';img.decoding='async';img.draggable=false;img.src=src(photo);return img;
 };
 for(let i=0;i<columns*5;i++){
  const element=document.createElement('div');element.className='wall-tile';
  const front=makeImage(nextPhoto());element.append(front);wall.append(element);
  tiles.push({element,front,busy:false});
 }
 const changePhoto = async tile => {
  tile.busy=true;
  const incoming=makeImage(nextPhoto());
  try {
   await incoming.decode();
   if(!canPlay()) return;
   tile.element.append(incoming);
   const animation=incoming.animate([{opacity:0},{opacity:1}],{duration:1800,easing:'ease-in-out',fill:'forwards'});
   animations.add(animation);
   try { await animation.finished; }
   finally { animations.delete(animation); }
   if(disposed) return;
   tile.front.remove();tile.front=incoming;
   animation.cancel();
  } catch {
   incoming.remove(); // Keep the current photo when loading is interrupted.
  } finally { tile.busy=false; }
 };
 const timer=setInterval(()=>{
  if(!canPlay()) return;
  shuffled(tiles.filter(tile=>!tile.busy)).slice(0,Math.max(2,Math.ceil(tiles.length/15))).forEach(changePhoto);
 },1000);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncPlayback();});
 observer.observe(wall);
 const onMotion=e=>{paused=e.matches;syncPlayback();};
 const onVisibility=()=>syncPlayback();
 const onResize=()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
   if(columnsForWidth()!==columns){wallCleanup();wall.replaceChildren();startWall(paused);}
  },150);
 };
 reducedMotion.addEventListener('change',onMotion);
 document.addEventListener('visibilitychange',onVisibility);
 window.addEventListener('resize',onResize);
 syncPlayback();
 wallCleanup=()=>{
  disposed=true;clearInterval(timer);clearTimeout(resizeTimer);observer.disconnect();
  for(const animation of animations) animation.cancel();
  animations.clear();
  reducedMotion.removeEventListener('change',onMotion);
  document.removeEventListener('visibilitychange',onVisibility);
  window.removeEventListener('resize',onResize);
 };
}
function yearPage(year) {
 const list=events.filter(e=>e.year===year);
 document.title=`${year}年のアルバム | 編集局アルバム`;
 if(!list.length){main.innerHTML=`<section class="inner-page">${breadcrumb(year)}<div class="empty-page"><h1>${year}</h1><p>cooming soon</p><a class="back-link" href="#years">← 年度一覧へ</a></div></section>`;return;}
 main.innerHTML=`<section class="inner-page">${breadcrumb(year)}<div class="page-heading"><div><h1>${year}</h1></div><p>${list.length}イベント / ${count(total(list))}枚</p></div><div class="event-grid">${list.map((e,i)=>`<a class="event-card" href="#/event/${e.id}"><div class="event-cover">${photoImage(cover(e),e.name)}</div><div class="event-meta"><div><h2>${esc(e.name)}</h2><p>${count(e.photos.length)}枚</p></div>${arrow}</div></a>`).join('')}</div><a class="back-link" href="#years">← 年度一覧へ</a></section>`;
}
function eventPage(event) {
 activeEvent={...event,photos:shuffled(event.photos)};galleryShown=0;
 document.title=`${event.name} · ${event.year} | 編集局アルバム`;
 main.innerHTML=`<section class="inner-page">${breadcrumb(event.year,event)}<div class="page-heading event-heading"><div><div class="eyebrow">${event.year}</div><h1>${esc(event.name)}</h1></div><p>${count(event.photos.length)}枚</p></div><div class="gallery-tools"><span>写真をタップして拡大</span><a href="#/year/${event.year}">イベント一覧 ↗</a></div><div class="gallery" id="gallery"></div><div class="more-wrap"><button id="load-more" class="more-button">もっと見る ＋</button><p id="gallery-progress" aria-live="polite"></p></div><a class="back-link" href="#/year/${event.year}">← ${event.year}年のイベントへ</a></section>`;
 document.querySelector('#load-more').onclick=appendPhotos;
 document.querySelector('#gallery').onclick=e=>{const b=e.target.closest('[data-photo]');if(b)openViewer(activeEvent,Number(b.dataset.photo));};
 appendPhotos();
}
function appendPhotos(){
 const end=Math.min(galleryShown+60,activeEvent.photos.length);
 document.querySelector('#gallery').insertAdjacentHTML('beforeend',activeEvent.photos.slice(galleryShown,end).map((p,i)=>`<button class="photo-button" data-photo="${galleryShown+i}" aria-label="${esc(activeEvent.name)}の写真 ${galleryShown+i+1} を拡大">${photoImage(p,`${activeEvent.name} ${galleryShown+i+1}`)}</button>`).join(''));
 galleryShown=end;
 document.querySelector('#gallery-progress').textContent=`${count(galleryShown)} / ${count(activeEvent.photos.length)}枚`;
 document.querySelector('#load-more').hidden=end===activeEvent.photos.length;
}
function openViewer(event,index){activeEvent=event;activeIndex=index;lastFocus=document.activeElement;viewer.showModal();showPhoto();document.querySelector('#close-viewer').focus();}
function showPhoto(){
 const p=activeEvent.photos[activeIndex], img=document.querySelector('#viewer-image');
 img.src=src(p,'full');img.alt=`${activeEvent.year}年 ${activeEvent.name}の写真 ${activeIndex+1}`;
 document.querySelector('#viewer-title').textContent=`${activeEvent.year} / ${activeEvent.name}`;
 document.querySelector('#viewer-count').textContent=`${activeIndex+1} / ${activeEvent.photos.length}`;
 const a=document.querySelector('#download');a.href=src(p,'full');a.download=`${activeEvent.year}-${activeEvent.name}-${String(activeIndex+1).padStart(3,'0')}.webp`;
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
 if(viewer.open)closeViewer();
 const hash=location.hash;
 const year=hash.match(/^#\/year\/(202[456])$/), event=hash.match(/^#\/event\/([a-f0-9]+)$/);
 if(year)yearPage(Number(year[1]));else if(event){const e=events.find(e=>e.id===event[1]);if(e)eventPage(e);else main.innerHTML='<section class="empty-page"><h1>404</h1><p>アルバムが見つかりませんでした。</p><a class="back-link" href="#/">トップへ戻る</a></section>';}else home();
 if(hash==='#years')requestAnimationFrame(()=>document.querySelector('#years')?.scrollIntoView());else window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
fetch('./assets/album.json').then(r=>{if(!r.ok)throw new Error('Album loading failed');return r.json();}).then(data=>{events=data.events;route();}).catch(()=>{main.innerHTML='<div class="loading">アルバムを読み込めませんでした。<br><br><button class="more-button" onclick="location.reload()">もう一度読み込む</button></div>';});
