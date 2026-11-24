import {gsap,duration} from './motion.js';
import {mountElasticSlider} from './elastic-slider.js';
import {vinylSurface} from './vinyl-surface.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const time=n=>`${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
const icon=(name)=>({play:'<path d="m8 5 11 7-11 7z"/>',pause:'<path d="M7 5h3v14H7zM15 5h3v14h-3z"/>',previous:'<path d="M5 5v14M19 5l-10 7 10 7z"/>',next:'<path d="M19 5v14M5 5l10 7-10 7z"/>'}[name]);
const svg=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icon(name)}</svg>`;

export function mountMusicRoom(root,music,initial){
 const events=new AbortController();let alive=true,view='browser',state=initial,selected=initial.index>=0?initial.index:3;
 let cardSignature='',trackSignature='',lyricSignature='',activeLyric=-2,transition=null,drag=null,wheelTimer=0,suppressClickUntil=0;
 let manualScrollUntil=0,lastTick=performance.now(),spin=0,speed=0,lyricTarget=null;
 const position={value:selected},rotation={value:0};
 root.className='music-room';root.dataset.view=view;
 root.innerHTML=`<h2 id="dialog-title" class="music-sr-only">我的唱片收藏</h2>
  <div class="music-browser">
   <div class="music-browser-heading"><div><p class="music-eyebrow">THE DESK SIDE / RECORD COLLECTION</p><h3>让喜欢的旋律，转起来。</h3></div><div class="music-browser-actions"><button class="music-resume" hidden>回到播放页 ↗</button><button class="music-import-btn" id="import-music">添加音乐</button></div></div>
   <div class="music-carousel" tabindex="0" role="region" aria-label="唱片架，左右拖动或使用方向键选择歌曲"><div class="music-album-cards"></div></div>
   <div class="music-browser-footer"><button class="music-card-prev" aria-label="上一张唱片">上一张</button><div><strong class="music-selection-title"></strong><span class="music-selection-album"></span></div><button class="music-card-next" aria-label="下一张唱片">下一张</button></div>
   <p class="music-browser-hint">拖动唱片架，选一首喜欢的歌</p>
  </div>
  <div class="music-player" aria-hidden="true" inert>
   <div class="music-player-top"><button class="music-return">返回唱片架</button><span class="music-eyebrow">THE WORKSPACE SESSIONS</span></div>
   <div class="music-listening-layout"><div class="music-player-media"><div class="music-cover-slot"></div><p class="music-side-note">A LITTLE MUSIC / A LITTLE FOCUS</p></div>
    <div class="music-player-copy"><p class="music-eyebrow music-album-year"></p><h3 class="music-song-title" id="track-name"></h3><p class="music-artist"></p>
     <div class="music-lyric-lines" aria-label="歌词"></div><p class="music-lyric-phase" aria-live="off"></p><p class="music-lyric-storage" role="status" hidden></p>
     <div class="music-control-panel"><div class="music-transport"><button id="previous-track" aria-label="上一首">${svg('previous')}</button><button id="play-music" class="music-play" aria-label="播放音乐">${svg('play')}</button><button id="next-track" aria-label="下一首">${svg('next')}</button></div>
      <div class="music-seek-row"><span id="current-time">0:00</span><div id="seek"></div><span id="duration">0:00</span></div>
      <div class="music-volume-row"><span>音量</span><div id="volume"></div><span class="music-volume-value">40%</span></div>
     </div><div class="music-player-bottom"><span id="music-status" role="status"></span><button id="import-lyrics" title="为本曲选择 LRC，保存到此浏览器，刷新后自动恢复">导入本曲歌词</button><button id="clear-lyrics" hidden>清除已保存歌词</button><a class="music-album-source" target="_blank" rel="noopener">专辑资料</a></div>
    </div></div>
  </div>
  <div class="music-disc" aria-hidden="true"><div class="music-disc-spin"><div class="music-disc-label"><span>suihao.</span><strong></strong><i></i><small>SIDE A / SLOW RADIO</small></div></div></div>
  <div class="music-playing-cover" aria-hidden="true"><img alt=""></div>
  <input id="audio-files" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac" multiple hidden><input id="lyric-file" type="file" accept=".lrc,text/plain" hidden>`;
 const $=selector=>root.querySelector(selector),browser=$('.music-browser'),player=$('.music-player'),carousel=$('.music-carousel'),cards=$('.music-album-cards');
 const disc=$('.music-disc'),discSpin=$('.music-disc-spin'),cover=$('.music-playing-cover'),lyrics=$('.music-lyric-lines');
 const surface=vinylSurface();
 if(surface){discSpin.style.backgroundImage=`url("${surface.surface}")`;if(surface.paper)$('.music-disc-label').style.backgroundImage=`url("${surface.paper}")`;}
 const listen=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal:events.signal});
 const seek=mountElasticSlider($('#seek'),{ariaLabel:'播放进度',maxStretch:32,formatValue:f=>time(f*state.duration),onChange:f=>music.seek(f)});
 const volume=mountElasticSlider($('#volume'),{value:state.volume,ariaLabel:'音量',maxStretch:20,formatValue:v=>`${Math.round(v*100)}%`,onChange:v=>music.volume(v)});
 const currentTrack=()=>state.tracks[state.index];
 const wrap=n=>state.tracks.length?((Math.round(n)%state.tracks.length)+state.tracks.length)%state.tracks.length:0;
 const geometry=()=>{const b=carousel.getBoundingClientRect(),r=root.getBoundingClientRect();return {w:b.width||1000,h:b.height||490,left:b.left-r.left,top:b.top-r.top};};
 function labelFor(index){const song=state.tracks[index];if(!song)return;$('.music-selection-title').textContent=song.title||song.name;$('.music-selection-album').textContent=`${song.album||'我的收藏'}${song.year?' · '+song.year:''}`;$('.music-disc-label strong').textContent=song.title||song.name;}
 function layoutCards(){
  const {w,h}=geometry(),count=state.tracks.length;if(!count)return;
  const radius=w<600?w*.7:Math.min(350,w*.34),cy=w<600?Math.min(h+110,radius+245):h+110,cardRadius=radius+(w<600?125:115),step=w<600?.42:.38;
  [...cards.children].forEach((card,i)=>{
   let d=i-position.value;d-=Math.round(d/count)*count;const angle=d*step;
   const visible=Math.abs(d)<3.6;
   gsap.set(card,{x:w/2+Math.sin(angle)*cardRadius,y:cy-Math.cos(angle)*cardRadius,rotation:angle*180/Math.PI,scale:1-Math.min(.22,Math.abs(d)*.065),opacity:visible?Math.max(.14,1-Math.abs(d)*.25):0,zIndex:30-Math.round(Math.abs(d)*5)});
   card.tabIndex=visible?0:-1;card.setAttribute('aria-pressed',String(i===wrap(position.value)));card.style.pointerEvents=visible?'auto':'none';
  });
  if(view==='browser'){
   const g=geometry(),diameter=radius*2;gsap.set(disc,{x:g.left+w/2-180,y:g.top+cy-180,scale:diameter/360});
   labelFor(wrap(position.value));
  }
  root.dataset.focusIndex=String(wrap(position.value));
 }
 function focusCard(index,animate=true,moveFocus=false){
  if(!state.tracks.length)return;
  const next=position.value+(index-wrap(position.value));
  if(moveFocus)cards.children[wrap(index)]?.focus({preventScroll:true});
  gsap.to(position,{value:next,duration:animate?duration(.65):0,ease:'power3.out',overwrite:true,onUpdate:layoutCards});
 }
 function playerTargets(){
  const r=root.getBoundingClientRect(),m=$('.music-player-media').getBoundingClientRect(),s=$('.music-cover-slot').getBoundingClientRect();
  const diameter=Math.min(m.width*.9,m.height*.95,360);
  return {disc:{x:m.left-r.left+m.width*.64-180,y:m.top-r.top+m.height*.45-180,scale:diameter/360},cover:{x:s.left-r.left,y:s.top-r.top,scale:s.width/240}};
 }
 function layoutPlayer(){const t=playerTargets();gsap.set(disc,t.disc);gsap.set(cover,t.cover);}
 function updateCover(track){
  const image=cover.querySelector('img');
  if(track?.cover){image.src=track.cover;image.hidden=false;cover.classList.remove('music-no-cover');}
  else{image.removeAttribute('src');image.hidden=true;cover.classList.add('music-no-cover');}
 }
 function enterPlayer(index,sourceCard=null){
  if(!state.tracks[index]||!alive)return;
  transition?.kill();gsap.killTweensOf(position);selected=index;position.value=index;
  spin=Number(gsap.getProperty(discSpin,'rotation'))||0;
  const r=root.getBoundingClientRect(),s=sourceCard?.querySelector('img')?.getBoundingClientRect();
  view='player';root.dataset.view=view;browser.inert=true;browser.setAttribute('aria-hidden','true');player.inert=false;player.setAttribute('aria-hidden','false');
  // Opening a view must not reload or resume an already-started current track.
  if(index!==state.index)music.select(index,true);else if(!state.started)void music.play();
  updateCover(state.tracks[index]);
  const t=playerTargets();
  gsap.set(player,{autoAlpha:1});gsap.set($('.music-player-copy'),{autoAlpha:0,y:15});gsap.set($('.music-player-top'),{autoAlpha:0});
  if(s&&s.width)gsap.set(cover,{x:s.left-r.left,y:s.top-r.top,scale:s.width/240,autoAlpha:1,rotation:0});else gsap.set(cover,{...t.cover,autoAlpha:0});
  transition=gsap.timeline({defaults:{ease:'power3.inOut'}})
   .to(browser,{autoAlpha:0,duration:duration(.25)},0)
   .to(disc,{...t.disc,duration:duration(.85)},0)
   .to(cover,{...t.cover,autoAlpha:1,rotation:-3,duration:duration(.85)},0)
   .to($('.music-player-copy'),{autoAlpha:1,y:0,duration:duration(.45)},duration(.38))
   .to($('.music-player-top'),{autoAlpha:1,duration:duration(.3)},duration(.45));
  $('#dialog-title').textContent=`正在听${state.tracks[index].title||state.tracks[index].name}`;
 }
 function returnToBrowser(){
  if(view==='browser')return;transition?.kill();selected=state.index>=0?state.index:selected;position.value=selected;
  spin=(Number(gsap.getProperty(discSpin,'rotation'))||0)+selected*24;
  const old={x:gsap.getProperty(disc,'x'),y:gsap.getProperty(disc,'y'),scale:gsap.getProperty(disc,'scale')};
  view='browser';root.dataset.view=view;player.inert=true;player.setAttribute('aria-hidden','true');browser.inert=false;browser.setAttribute('aria-hidden','false');
  layoutCards();const target={x:gsap.getProperty(disc,'x'),y:gsap.getProperty(disc,'y'),scale:gsap.getProperty(disc,'scale')};gsap.set(disc,old);
  transition=gsap.timeline({defaults:{ease:'power3.inOut'}}).to(player,{autoAlpha:0,duration:duration(.25)},0).to(cover,{autoAlpha:0,scale:'*=.9',duration:duration(.25)},0).to(disc,{...target,duration:duration(.75)},0).to(browser,{autoAlpha:1,duration:duration(.5)},duration(.2));
  $('#dialog-title').textContent='我的唱片收藏';
 }
 function renderCards(){
  cards.replaceChildren();state.tracks.forEach((track,index)=>{
   const card=document.createElement('button');card.className='music-album-card';card.type='button';card.dataset.track=String(index);card.setAttribute('aria-label',`打开${track.title||track.name}`);
   const art=document.createElement('span');art.className='music-card-art';
   if(track.cover){const image=document.createElement('img');image.src=track.cover;image.alt=`${track.album}专辑封面`;image.draggable=false;art.append(image);}else{art.classList.add('music-placeholder-art');art.textContent='我的音乐';}
   const title=document.createElement('strong'),meta=document.createElement('span');title.textContent=track.title||track.name;meta.className='music-card-meta';meta.textContent=track.album||'我的收藏';card.append(art,title,meta);cards.append(card);
  });layoutCards();
 }
 function renderLyrics(song){
  const signature=`${song?.id}|${song?.lyricVersion||''}|${song?.lyrics?.length||0}`;if(signature===lyricSignature)return;lyricSignature=signature;activeLyric=-2;lyrics.replaceChildren();lyrics.scrollTop=0;
  if(!song?.lyrics?.length){const p=document.createElement('p');p.className='music-lyrics-empty';p.textContent='先听音乐，让灵感慢慢来。';lyrics.append(p);return;}
  song.lyrics.forEach(row=>{const button=document.createElement('button');button.className='music-lyric-line';button.type='button';button.textContent=row.text;button.dataset.start=String(row.start);button.setAttribute('aria-current','false');button.addEventListener('click',()=>{if(state.duration)music.seek(row.start/state.duration);},{signal:events.signal});lyrics.append(button);});
 }
 function updateLyrics(song){
  const lines=song?.lyrics||[];let index=-1;
  for(let i=0;i<lines.length&&lines[i].start<=state.current+.005;i++)index=i;
  if(index>=0&&state.current>lines[index].end+(lines[index].explicitEnd?0:1.25)&&(lines[index].explicitEnd||index===lines.length-1||lines[index+1].start-lines[index].end>5))index=-1;
  $('.music-lyric-phase').textContent=!lines.length?'这首歌暂未添加歌词':index>=0?'':state.current<lines[0].start?'前奏':state.current>lines.at(-1).end?'尾奏':'间奏';
  if(index===activeLyric)return;activeLyric=index;
  [...lyrics.querySelectorAll('.music-lyric-line')].forEach((line,i)=>line.setAttribute('aria-current',String(i===index)));
  const line=lyrics.children[index];if(line&&view==='player'&&performance.now()>manualScrollUntil)lyrics.scrollTo({top:line.offsetTop-lyrics.clientHeight/2+line.clientHeight/2,behavior:duration(1)?'smooth':'instant'});
 }
 function update(next){
  if(!alive)return;state=next;const song=currentTrack();
  const signature=state.tracks.map(t=>t.id||t.name).join('|');if(signature!==cardSignature){cardSignature=signature;renderCards();}
  const changed=trackSignature!==song?.id;if(changed){trackSignature=song?.id;if(view==='player'){selected=state.index;position.value=selected;updateCover(song);$('.music-disc-label strong').textContent=song?.title||song?.name||'';}}
  $('.music-song-title').textContent=song?.title||song?.name||'选一首喜欢的歌';$('.music-artist').textContent=song?.artist||'';$('.music-album-year').textContent=`${song?.album||'我的收藏'}${song?.year?' / '+song.year:''}`;
  const source=$('.music-album-source');source.hidden=!song?.source;if(song?.source)source.href=song.source;
  renderLyrics(song);updateLyrics(song);
  $('#play-music').innerHTML=svg(state.playing?'pause':'play');$('#play-music').setAttribute('aria-label',state.playing?'暂停音乐':'播放音乐');
  $('#previous-track').disabled=$('#next-track').disabled=state.tracks.length<2;
  $('#current-time').textContent=time(state.current);$('#duration').textContent=time(state.duration);
  seek.setDisabled(!state.duration);seek.setValue(state.duration?state.current/state.duration:0);volume.setValue(state.volume);
  $('.music-volume-value').textContent=`${Math.round(state.volume*100)}%`;$('#music-status').textContent=state.playing?'正在播放':'已暂停';
  const saving=song?.lyricPersistence==='saving',clearing=!!song?.lyricClearing;
  $('#import-lyrics').textContent=saving?'保存中…':song?.localLyrics?'替换歌词':'导入本曲歌词';$('#import-lyrics').disabled=saving||clearing;
  const storage=$('.music-lyric-storage'),notice=clearing?'正在清除本地记录…':saving?'正在保存到此浏览器…':song?.lyricPersistence==='saved'?'已保存到此浏览器 · 刷新自动恢复':'本次可用 · 未能保存，刷新后需重新导入';
  storage.hidden=!song?.localLyrics;if(storage.textContent!==notice)storage.textContent=notice;
  $('#clear-lyrics').hidden=!song?.localLyrics;$('#clear-lyrics').disabled=saving||clearing;$('#clear-lyrics').textContent=song?.lyricsUrl?'恢复原版歌词':'清除已保存歌词';
  const resume=$('.music-resume');resume.hidden=!song||!state.started;resume.dataset.playing=String(state.playing);resume.setAttribute('aria-label',`回到播放页：${song?.title||song?.name||''}，${state.playing?'正在播放':'已暂停'}`);
 }
 listen($('#import-music'),'click',()=>$('#audio-files').click());listen($('#audio-files'),'change',e=>{music.addFiles(e.target.files);e.target.value='';});
 listen($('#import-lyrics'),'click',()=>{lyricTarget={index:state.index,duration:state.duration};$('#lyric-file').click();});
 listen($('#lyric-file'),'change',async event=>{const file=event.target.files[0],target=lyricTarget;event.target.value='';if(file&&target)await music.importLyrics(file,target.index,target.duration);});
 listen($('#clear-lyrics'),'click',()=>void music.clearLyrics(state.index));
 listen($('.music-return'),'click',returnToBrowser);listen($('#play-music'),'click',()=>void music.toggle());listen($('#previous-track'),'click',()=>music.previous());listen($('#next-track'),'click',()=>music.next());
 listen($('.music-resume'),'click',()=>enterPlayer(state.index,cards.children[state.index]));
 listen($('.music-card-prev'),'click',()=>focusCard(wrap(position.value)-1));listen($('.music-card-next'),'click',()=>focusCard(wrap(position.value)+1));
 listen(cards,'click',e=>{const card=e.target.closest('[data-track]');if(card&&e.detail===0&&performance.now()>suppressClickUntil)enterPlayer(Number(card.dataset.track),card);});
 listen(carousel,'pointerdown',e=>{if(view!=='browser'||drag||e.button!==0)return;gsap.killTweensOf(position);drag={id:e.pointerId,x:e.clientX,position:position.value,card:e.target.closest('[data-track]')};carousel.setPointerCapture(e.pointerId);});
 listen(carousel,'pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;position.value=drag.position-(e.clientX-drag.x)/(carousel.clientWidth<600?155:230);layoutCards();});
 const finish=(e,cancelled=false)=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;const moved=Math.abs(e.clientX-d.x);if(carousel.hasPointerCapture(e.pointerId))carousel.releasePointerCapture(e.pointerId);if(!cancelled&&moved<7&&d.card){suppressClickUntil=performance.now()+300;enterPlayer(Number(d.card.dataset.track),d.card);}else{if(moved>7)suppressClickUntil=performance.now()+300;gsap.to(position,{value:Math.round(position.value),duration:duration(.65),ease:'power3.out',overwrite:true,onUpdate:layoutCards});}};
 listen(carousel,'pointerup',e=>finish(e));listen(carousel,'pointercancel',e=>finish(e,true));
 listen(carousel,'wheel',e=>{if(view!=='browser')return;e.preventDefault();clearTimeout(wheelTimer);const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!delta)return;position.value+=clamp(delta/260,-.65,.65);layoutCards();wheelTimer=setTimeout(()=>gsap.to(position,{value:Math.round(position.value+Math.sign(delta)*.3),duration:duration(.55),ease:'power3.out',overwrite:true,onUpdate:layoutCards}),100);},{passive:false});
 listen(carousel,'keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();focusCard(wrap(position.value)+(e.key==='ArrowRight'?1:-1),true,true);}else if((e.key==='Enter'||e.key===' ')&&e.target===carousel){e.preventDefault();const index=wrap(position.value);enterPlayer(index,cards.children[index]);}});
 listen(player,'scroll',()=>{if(view==='player')layoutPlayer();},{passive:true});
 listen(lyrics,'wheel',()=>{manualScrollUntil=performance.now()+4000;},{passive:true});
 const resize=new ResizeObserver(()=>{if(view==='browser')layoutCards();else layoutPlayer();});resize.observe(root);
 const ticker=()=>{const now=performance.now(),dt=Math.min((now-lastTick)/1000,.05);lastTick=now;if(document.hidden)return;const target=state.playing&&view==='player'?24:0;speed+=(target-speed)*(1-Math.exp(-dt*2.5));if(duration(1)){spin+=speed*dt;rotation.value=spin+(view==='browser'?position.value*-24:0);gsap.set(discSpin,{rotation:rotation.value});}};
 gsap.ticker.add(ticker);gsap.set(player,{autoAlpha:0});gsap.set(cover,{autoAlpha:0});update(state);
 const api={update,getState:()=>({view,focusIndex:wrap(position.value),lyricIndex:activeLyric,sliderEngine:seek.getState().engine}),dispose(){alive=false;events.abort();resize.disconnect();clearTimeout(wheelTimer);transition?.kill();gsap.killTweensOf([position,disc,discSpin,cover,browser,player,$('.music-player-copy'),$('.music-player-top')]);gsap.ticker.remove(ticker);seek.dispose();volume.dispose();if(drag&&carousel.hasPointerCapture(drag.id))carousel.releasePointerCapture(drag.id);drag=null;delete root.musicRoom;}};
 root.musicRoom=api;return api;
}
