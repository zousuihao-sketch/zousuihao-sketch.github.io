import {createMusic} from './music.js';
import {gsap,duration,revealContent,openDialog,dismissDialog,introducePage} from './motion.js';
import {mountProfileContact} from './profile-contact.js';
import {mountMusicRoom} from './music-room.js';
import {photographs} from './photographs.js';
import {mountFolder} from './project-folder.js';
import {mountStudioStickers} from './studio-stickers.js';
import {mountGameRoom} from './game-room.js';
import {renderArtworks} from './artworks.js';
import {mountStudioGuide} from './studio-guide.js';

const $=selector=>document.querySelector(selector);
const dialog=$('#content-dialog'),content=$('#dialog-content');
let panelRequest=0;
let workspace=null,activePanel=null,projectAssets={},musicState={tracks:[],index:-1,playing:false,current:0,duration:0,volume:.4},isNight=false,toastTimer;
let profileBadgeEffect=null,musicRoomEffect=null,projectFolderEffects=[],studioStickers=null,gameRoomEffect=null,studioGuide=null;
function disposeProjectFolders(){projectFolderEffects.forEach(effect=>effect.dispose());projectFolderEffects=[];}
function disposePanelEffects(){disposeProjectFolders();profileBadgeEffect?.dispose();profileBadgeEffect=null;musicRoomEffect?.dispose();musicRoomEffect=null;gameRoomEffect?.dispose();gameRoomEffect=null;dialog.classList.remove('music-dialog','game-dialog');}
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
const music=createMusic(state=>{musicState=state;workspace?.setPlaying(state.playing);workspace?.setVolume(state.volume);if(activePanel==='music')updateMusicUI();},toast);

const projects={
 ux:{title:'乐铺 · 界面与体验升级',type:'UI / UX DESIGN',description:'从商品发现、发布到交易，梳理信息层级与交互流程，让闲置交易更清晰、更顺手。'},
 ops:{title:'大润发优鲜 · 运营视觉',type:'VISUAL DESIGN / AIGC',description:'围绕活动场景、品牌 IP 与趣味玩法，探索视觉表达与 AIGC 辅助设计。'},
 ip:{title:'珀利 · 睡衣派对 IP 设计',type:'CHARACTER / IP DESIGN',description:'围绕梦境守护者珀利，展开角色设定、表情与服装、场景及周边物料设计。'}
};
function heading(title,description){return `<div class="panel-heading"><h2 id="dialog-title">${title}</h2><p>${description}</p></div>`;}
function renderWork(){
 disposeProjectFolders();
 activePanel='work';$('#dialog-kicker').textContent='ON MY SCREEN / SELECTED WORK';
 const entries=Object.entries(projects),captions={ux:'乐铺 · UI / UX',ops:'大润发 · 运营视觉',ip:'珀利 · IP 设计'};
 content.innerHTML=heading('做过的设计，放在这里。','三个项目，关于体验、视觉与角色的探索。')+`<section class="project-folder-collection" aria-label="三个精选项目"><div class="project-folder-display"><div id="project-folder-selected"></div></div><p class="project-folder-hint">打开文件夹，选择一张封面查看完整项目。</p><div class="project-index">${entries.map(([id,p],index)=>`<button class="project-index-link" data-project="${id}" aria-label="查看${p.title}完整案例"><span class="project-index-number">0${index+1}</span><span class="project-index-copy"><small>${p.type}</small><strong>${p.title}</strong></span><span class="project-index-arrow" aria-hidden="true">↗</span></button>`).join('')}</div></section>`;
 projectFolderEffects.push(mountFolder($('#project-folder-selected'),{label:'PROJECTS / 03',variant:'glass',theme:'light',color:'#a7bca8',paperColor:'#fffdf7',size:1.4,frost:.18,intro:true,bounce:.28,zoomOnClick:false,items:entries.map(([id,p])=>({id,image:`./assets/${id}-cover.webp`,title:p.title,caption:captions[id],alt:p.title+'，查看完整项目'})),onItemClick:item=>renderProject(item.id)}));
 content.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>renderProject(button.dataset.project)));
 dialog.scrollTop=0;
}
function renderProject(id){
 const project=projects[id];if(!project)return;
 disposeProjectFolders();
 activePanel='project';$('#dialog-kicker').textContent=project.type;
 const tiles=projectAssets[id]||[];
 content.innerHTML=`<div class="project-header"><button class="back-link" id="back-projects">返回作品集</button><h2 id="dialog-title">${project.title}</h2></div><div class="project-long">${tiles.length?tiles.map((file,i)=>`<img src="./assets/${file}" alt="${project.title}，第 ${i+1} 段" loading="${i?'lazy':'eager'}" decoding="async" width="1100" height="${i===tiles.length-1?'auto':'2400'}">`).join(''):'<p>项目图片暂时没能加载，请稍后重试。</p>'}</div>`;
 $('#back-projects').addEventListener('click',()=>{renderWork();$('#project-folder-selected .folder-stage').focus();});dialog.scrollTop=0;$('#back-projects').focus();
}
function renderAbout(){
 activePanel='about';$('#dialog-kicker').textContent='THE PERSON BEHIND THE DESK';
 content.innerHTML=`<div class="about-layout"><div class="profile-badge-column" id="profile-contact"><div class="profile-stage"><button class="profile-badge" id="flip-profile-badge" aria-pressed="false" aria-label="翻到工牌背面，查看联系方式"><span class="profile-badge-inner"><span class="profile-badge-front"><img src="./assets/profile/badge-front.png" alt="邹穗豪的工作证正面，UI / UX DESIGNER"></span><span class="profile-badge-back" aria-hidden="true"><img src="./assets/profile/badge-back.png" alt="工作证背面：以理性构形，以感性赋意。微信 Sui2498，附联系方式二维码"></span></span></button><button id="profile-qr-stage" class="profile-qr-stage" hidden aria-hidden="true" aria-label="返回工牌"></button></div><button id="toggle-profile-qr" class="profile-qr-toggle" aria-label="显示微信二维码" aria-expanded="false" aria-controls="profile-qr-stage"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx=".5"/><rect x="15" y="3" width="6" height="6" rx=".5"/><rect x="3" y="15" width="6" height="6" rx=".5"/><path d="M15 15h3v3h3v3h-6v-3h-3v-3M12 3v3M3 12h6M12 9h3M12 21v-3M21 12h-3"/></svg></button></div><div class="about-copy"><p class="about-eyebrow">ABOUT ME / 关于我</p><h2 id="dialog-title">你好，我是邹穗豪。</h2><div class="subline">UI / UX · 视觉设计 · AIGC</div><p class="design-motto">以理性构形，<br>以感性赋意。</p><p>我关注产品里的每一次交互，也喜欢用视觉让想法变得具体。从梳理流程、搭建界面，到探索画面和场景，尝试让设计既好用，也有自己的表情。</p><p>工作台之外，我用画笔和镜头收集日常。那些颜色、光线和小小的发现，也会回到我的设计里。</p><div class="skills-list"><span>Figma</span><span>Photoshop</span><span>Illustrator</span><span>After Effects</span><span>AIGC</span></div><section class="experience" aria-labelledby="experience-heading">
<h3 id="experience-heading">工作经历</h3>
<article class="experience-item">
<h4>杭州万循科技贸易有限公司</h4>
<div class="experience-meta"><span>UX设计师</span><span class="experience-date">2026.02 — 至今</span></div>
<ul class="experience-details">
<li>负责产品日常界面设计与版本迭代，承接功能更新、页面调整及视觉优化需求，完成设计方案与修改交付。</li>
<li>参与维护 UI 组件和视觉规范，结合需求反馈完善设计细节，支持不同页面的设计复用与后续迭代。</li>
<li>参与核心业务页面改版，结合使用场景梳理设计问题，完成方案比较、界面绘制及细节调整，推进设计方案完善。</li>
</ul></article>
<article class="experience-item">
<h4>上海润国信息技术有限公司</h4>
<div class="experience-meta"><span>视觉设计实习生</span><span class="experience-date">2025.06 — 2026.01</span></div>
<ul class="experience-details">
<li>协助运营活动主会场及配套物料设计，根据活动主题延展视觉方案，配合完成后续修改、多尺寸适配与素材输出，保障活动排期内的设计交付。</li>
<li>参与 AIGC 生图工作流，通过配色与材质方案生成、人工筛选和局部精修，整理可复用设计素材，使同类素材前期探索及制作耗时缩短约 <strong>20%</strong>。</li>
</ul></article></section><div class="about-actions"><button class="outline-btn" data-open="resume">查看简历</button><button class="outline-btn" data-open="contact">和我聊聊</button></div></div></div>`;
 const badge=$('#flip-profile-badge');
 function updateBadgeSide(flipped){
  badge.setAttribute('aria-pressed',String(flipped));
  badge.setAttribute('aria-label',flipped?'翻回工牌正面':'翻到工牌背面，查看联系方式');
  badge.querySelector('.profile-badge-front').setAttribute('aria-hidden',String(flipped));badge.querySelector('.profile-badge-back').setAttribute('aria-hidden',String(!flipped));
 }
 profileBadgeEffect=mountProfileContact(document.querySelector('#profile-contact'),{onFlip:updateBadgeSide});
 bindOpenButtons(content);
}

function renderResume(){
 activePanel='resume';$('#dialog-kicker').textContent='RESUME / 邹穗豪';
 content.innerHTML=heading('我的简历','教育、工作与项目经历。')+'<div class="resume-toolbar"><button class="outline-btn" id="resume-zoom" aria-pressed="false" aria-controls="resume-preview">放大查看</button><a class="outline-btn" href="./assets/profile/resume.png" download="邹穗豪-简历.png">下载简历</a></div><div class="resume-preview" id="resume-preview" tabindex="0" aria-label="简历预览，可滚动查看"><img src="./assets/profile/resume.png" alt="邹穗豪的完整简历，包含个人介绍、教育背景、工作经历、项目经验和设计技能"></div>';
 const preview=$('#resume-preview'),zoom=$('#resume-zoom');
 zoom.addEventListener('click',()=>{const expanded=preview.classList.toggle('is-expanded');zoom.setAttribute('aria-pressed',String(expanded));zoom.textContent=expanded?'适应宽度':'放大查看';});
}

function renderLife(tab='photo',initialIndex=0){
 activePanel='life';$('#dialog-kicker').textContent='BEYOND DESIGN / EVERYDAY INSPIRATION';
 content.innerHTML=heading('在设计之外，收集生活。','用镜头收藏日常，也用画笔记录那些小美好。')+
 '<div class="life-tabs" role="tablist" aria-label="个人创作类型"><button role="tab" id="tab-photo" data-life="photo" aria-controls="life-gallery">日常光影</button><button role="tab" id="tab-art" data-life="art" aria-controls="life-gallery">手绘记录</button></div><div id="life-gallery" role="tabpanel"></div>';
 for(const button of content.querySelectorAll('[data-life]')){
  const selected=button.dataset.life===tab;button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
  button.addEventListener('click',()=>{renderLife(button.dataset.life);$('#tab-'+button.dataset.life).focus();});
  button.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();renderLife(tab==='photo'?'art':'photo');content.querySelector('[aria-selected="true"]').focus();}});
 }
 const gallery=$('#life-gallery');gallery.setAttribute('aria-labelledby','tab-'+tab);
 if(tab==='art'){renderArtworks(gallery);return;}
 gallery.innerHTML='<div class="photo-deck" id="photo-deck" tabindex="0" aria-label="摄影相册，左右拖动或使用方向键切换">'+photographs.map((photo,i)=>'<div class="photo-card" data-photo="'+i+'" role="button" aria-label="'+photo.title+'"><img draggable="false" decoding="async" src="./assets/photos/'+photo.file+'.webp" alt="'+photo.title+'"><span>'+photo.title+'</span></div>').join('')+'</div><div class="photo-controls"><button id="previous-photo" aria-label="上一张照片">‹</button><span id="photo-counter" aria-live="polite"></span><button id="next-photo" aria-label="下一张照片">›</button></div><p class="photo-hint">左右拖动照片，看看生活里的下一帧</p>';
 let index=((initialIndex%photographs.length)+photographs.length)%photographs.length,drag=null,suppressClickUntil=0;
 const deck=$('#photo-deck'),cards=[...deck.querySelectorAll('.photo-card')];
 function arrange(next,animate=true){
  index=(next+cards.length)%cards.length;deck.dataset.activeIndex=index;$('#photo-counter').textContent=String(index+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');
  cards.forEach((card,i)=>{let offset=(i-index+cards.length)%cards.length;if(offset>cards.length/2)offset-=cards.length;card.dataset.active=String(offset===0);card.tabIndex=offset===0?0:-1;card.style.zIndex=String(10-Math.abs(offset));gsap.set(card,{xPercent:-50});gsap.to(card,{x:offset*(innerWidth<600?67:125),y:Math.abs(offset)*17,rotation:offset*7,scale:1-Math.abs(offset)*.09,autoAlpha:Math.abs(offset)>1?.22:1,duration:animate?duration(.55):0,ease:'power3.out',overwrite:true});});
 }
 $('#previous-photo').addEventListener('click',()=>arrange(index-1));$('#next-photo').addEventListener('click',()=>arrange(index+1));
 deck.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();arrange(index+(event.key==='ArrowRight'?1:-1));}});
 cards.forEach((card,i)=>{
  card.addEventListener('click',()=>{if(performance.now()<suppressClickUntil)return;arrange(i);});
  card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();arrange(i);}});
  card.addEventListener('pointerdown',event=>{if(i!==index||event.button>0)return;drag={x:event.clientX,y:event.clientY,card,index};card.setPointerCapture(event.pointerId);gsap.killTweensOf(card);});
  card.addEventListener('pointermove',event=>{if(!drag||drag.card!==card)return;const dx=event.clientX-drag.x;gsap.set(card,{x:dx*.75,rotation:dx*.045,y:Math.abs(dx)*.025});});
  const finish=event=>{if(!drag||drag.card!==card)return;const dx=event.clientX-drag.x;if(Math.abs(dx)>8)suppressClickUntil=performance.now()+300;drag=null;arrange(index+(Math.abs(dx)>55?(dx<0?1:-1):0));};
  card.addEventListener('pointerup',finish);card.addEventListener('pointercancel',()=>{drag=null;arrange(index);});
 });arrange(index,false);
}
function renderContact(){
 activePanel='contact';$('#dialog-kicker').textContent='SAY HELLO / LET’S MAKE SOMETHING';
 content.innerHTML=`<div class="contact-layout">${heading('好想法，可以从一句你好开始。','关于设计、项目合作，或只是分享一点有趣的事。')}<a class="email-link" href="mailto:zousuihao@gmail.com">zousuihao@gmail.com</a><div class="contact-actions"><a class="solid-btn" href="mailto:zousuihao@gmail.com">写一封邮件</a><button class="outline-btn" id="copy-email">复制邮箱</button></div><p style="margin-top:30px">目前在江西南昌。<br>谢谢你来我的工作台坐坐。</p></div>`;
 $('#copy-email').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('zousuihao@gmail.com');toast('邮箱已复制。');}catch{toast('邮箱：zousuihao@gmail.com');}});
}
function renderMusic(){
 activePanel='music';$('#dialog-kicker').textContent='SUIHAO / THE MUSIC CORNER';dialog.classList.add('music-dialog');
 content.innerHTML='<div id="music-room"></div>';musicRoomEffect=mountMusicRoom($('#music-room'),music,musicState);
}
function updateMusicUI(){musicRoomEffect?.update(musicState);}
function renderGame(){
 activePanel='game';music.pause();$('#dialog-kicker').textContent='TAKE A LITTLE BREAK / 鲜乐拍';dialog.classList.add('game-dialog');
 content.innerHTML='<h2 id="dialog-title" class="sr-only">鲜乐拍音乐小游戏</h2><div id="game-room" style="height:100%"></div>';
 gameRoomEffect=mountGameRoom($('#game-room'));
}
const renderers={work:renderWork,about:renderAbout,life:renderLife,contact:renderContact,music:renderMusic,game:renderGame,resume:renderResume};

async function openPanel(id,options={}){
 if(id==='lamp'){toggleTheme();return;}
 const requested=id;if(id.startsWith('photo-')){options.photoIndex=photographs.findIndex(p=>p.file===id.slice(6));id='life';}
 const render=renderers[id];if(!render)return;const request=++panelRequest;
 studioGuide?.close({returnFocus:false});
 if(!dialog.open&&workspace){const arrived=await workspace.focus(requested,options);if(!arrived||request!==panelRequest)return;}
 if(request!==panelRequest)return;
 disposePanelEffects();
 if(id==='work'&&options.project&&projects[options.project])renderProject(options.project);else if(id==='life')renderLife(options.source==='art'?'art':'photo',Math.max(0,options.photoIndex||0));else render();
 dialog.scrollTop=0;if(!dialog.open){dialog.showModal();openDialog(dialog);}revealContent(content);$('#close-dialog').focus();
}
function closePanel(){panelRequest++;gameRoomEffect?.stop();if(!dialog.open){workspace?.reset();return;}dismissDialog(dialog,()=>dialog.close());}
function bindOpenButtons(root=document){root.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.open)));}
bindOpenButtons();
void music.loadLibrary();
document.addEventListener('workspace:open',event=>{const detail=event.detail;if(typeof detail==='string')void openPanel(detail);else void openPanel(detail.id,detail);});
$('#close-dialog').addEventListener('click',closePanel);dialog.addEventListener('cancel',event=>{event.preventDefault();closePanel();});
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dialog.open){panelRequest++;workspace?.reset();}});
dialog.addEventListener('click',event=>{const bounds=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom))closePanel();});
dialog.addEventListener('close',()=>{disposePanelEffects();activePanel=null;workspace?.reset();});
function toggleTheme(){isNight=!isNight;document.body.classList.toggle('night',isNight);$('#theme-toggle').setAttribute('aria-pressed',String(isNight));$('#theme-toggle').setAttribute('aria-label',isNight?'切换到白天':'切换到夜晚');$('.theme-icon').textContent=isNight?'☾':'☼';workspace?.setNight(isNight);try{localStorage.setItem('studio-theme',isNight?'night':'day');}catch{}}
$('#theme-toggle').addEventListener('click',toggleTheme);
$('#reset-view').addEventListener('click',()=>{workspace?.reset();studioStickers?.reset();toast('已经回到工作台。');});
function updateClock(){const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit'}).format(new Date());$('#clock').textContent=`NANCHANG · ${time}`;}
updateClock();setInterval(updateClock,30000);

try{const response=await fetch('./assets/projects.json');if(!response.ok)throw Error('project assets');projectAssets=await response.json();}catch{toast('部分项目预览未能加载，刷新后可重试。');}
studioGuide=mountStudioGuide($('#scene'),{onNavigate:action=>void openPanel(action.panel,action)});
try{
 const {createWorkspace}=await import('./scene.js');workspace=await createWorkspace($('#workspace-canvas'));$('#scene').classList.add('ready');$('#loading').classList.add('done');workspace.reveal();introducePage();
 studioStickers=mountStudioStickers($('#scene'),workspace,{onEyesPosition:state=>studioGuide.place(state)});
 try{if(localStorage.getItem('studio-theme')==='night')toggleTheme();}catch{}
 // Exposed scene coordinates make the physical entry points inspectable in local QA.
 window.studio={getHotspots:()=>workspace.hotspots(),getLayoutState:()=>workspace.layoutState(),getDeviceState:()=>workspace.deviceState(),getContactState:()=>workspace.contactState(),getBoardParts:()=>workspace.boardParts(),getMotionState:()=>workspace.motionState(),getMonitorState:()=>workspace.monitorState(),getStickers:()=>studioStickers?.inspect(),getGuideState:()=>studioGuide?.inspect(),getMusicState:()=>({...musicState,tracks:musicState.tracks.map(t=>({name:t.name}))})};
}catch(error){console.error('Workspace could not initialize:',error);document.body.classList.add('scene-unavailable');$('#loading').classList.add('done');$('#scene-error').hidden=false;$('#scene-caption').textContent='使用下方导航，也能探索整个工作台';studioGuide.fallback();}
window.addEventListener('pagehide',event=>{if(!event.persisted){disposePanelEffects();studioGuide?.dispose();studioStickers?.dispose();workspace?.dispose();music.dispose();}});

