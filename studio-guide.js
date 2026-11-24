import {guideWelcome,guideQuestions} from './guide-content.js';
import {mountCobaltSprite} from './cobalt-sprite.js';

export function mountStudioGuide(host,{onNavigate}){
 const entry=document.createElement('button');entry.id='guide-open';entry.className='guide-invitation guide-cobalt';entry.type='button';entry.innerHTML='<span class="guide-cobalt-host" aria-hidden="true"></span><span class="guide-cobalt-bubble">带我逛逛 ↗</span>';entry.hidden=true;entry.setAttribute('aria-label','打开穗豪的工作台向导');entry.setAttribute('aria-expanded','false');entry.setAttribute('aria-controls','studio-guide');host.append(entry);
 const mascot=mountCobaltSprite(entry.querySelector('.guide-cobalt-host'),{visible:false});let mascotVisible=false;
 const showMascot=value=>{if(value!==mascotVisible){mascotVisible=value;mascot.setVisible(value);}};
 const root=document.createElement('section');root.id='studio-guide';root.className='studio-guide';root.hidden=true;root.inert=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','false');root.setAttribute('aria-labelledby','guide-title');
 root.innerHTML='<header class="guide-header"><img class="guide-avatar" src="./assets/cobalt-sprite-static.png" alt="" aria-hidden="true"><div><h2 id="guide-title">穗豪的工作台向导</h2><p>点选问题，一起逛逛工作台</p></div><button type="button" class="guide-close" aria-label="收起工作台向导">×</button></header><div class="guide-log" role="log" aria-label="作品导览对话" aria-live="polite" aria-relevant="additions"></div><div class="guide-choices"><p>想从这里开始吗？</p><div class="guide-questions"></div></div>';
 document.body.append(root);
 const log=root.querySelector('.guide-log'),choices=root.querySelector('.guide-questions'),prompt=root.querySelector('.guide-choices>p'),closeButton=root.querySelector('.guide-close'),events=new AbortController();
 let alive=true,open=false,current=null,history=[];
 function node(tag,cls,text){const element=document.createElement(tag);element.className=cls;if(text)element.textContent=text;return element;}
 log.append(node('p','guide-message guide-reply guide-welcome',guideWelcome));
 for(const item of guideQuestions){const button=node('button','guide-question',item.question);button.type='button';button.dataset.question=item.id;choices.append(button);}
 function close({returnFocus=true}={}){if(!alive||!open)return;open=false;root.hidden=true;root.inert=true;entry.setAttribute('aria-expanded','false');if(returnFocus&&!entry.hidden)entry.focus({preventScroll:true});}
 function show(){if(!alive)return;if(open){close();return;}open=true;root.hidden=false;root.inert=false;entry.setAttribute('aria-expanded','true');choices.querySelector('button').focus({preventScroll:true});}
 function ask(id){
  const item=guideQuestions.find(q=>q.id===id);if(!item||current===id)return;
  current=id;
  const exchange=node('div','guide-exchange'),question=node('p','guide-message guide-visitor',item.question),reply=node('div','guide-message guide-reply');
  reply.append(node('p','guide-answer',item.answer));
  const links=node('div','guide-destinations');
  item.actions.forEach((action,index)=>{const button=node('button','guide-destination',action.label+' ↗');button.type='button';button.dataset.destination=item.id;button.dataset.action=String(index);links.append(button);});
  reply.append(links);exchange.append(question,reply);log.append(exchange);history.push(exchange);
  // Keep the conversation short enough to read and revisit in a small panel.
  if(history.length>5)history.shift().remove();
  prompt.textContent='还想了解哪一面？';
  choices.querySelectorAll('button').forEach(button=>button.classList.toggle('is-current',button.dataset.question===id));
  log.scrollTop=log.scrollHeight;
 }
 choices.addEventListener('click',event=>{const button=event.target.closest('[data-question]');if(button)ask(button.dataset.question);},{signal:events.signal});
 log.addEventListener('click',event=>{const button=event.target.closest('[data-destination]');if(!button)return;const action=guideQuestions.find(item=>item.id===button.dataset.destination)?.actions[Number(button.dataset.action)];if(action){close();onNavigate(action);}},{signal:events.signal});
 entry.addEventListener('click',show,{signal:events.signal});closeButton.addEventListener('click',()=>close(),{signal:events.signal});
 window.addEventListener('keydown',event=>{if(open&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}},{capture:true,signal:events.signal});
 return {
  close,
  place(state){
   if(!alive)return;
   const hidden=state.hidden||state.dragging;
   entry.hidden=!!hidden;
   showMascot(!hidden);
   if(hidden){close({returnFocus:false});return;}
   if(Number.isFinite(state.x+state.y+state.width)){
    entry.dataset.anchored='true';
    const x=Math.max(16,Math.min(host.clientWidth-250,state.x-65)),y=Math.max(100,state.y-65);
    const left=Math.round(x)+'px',top=Math.round(y)+'px';if(entry.style.left!==left)entry.style.left=left;if(entry.style.top!==top)entry.style.top=top;
   }
  },
  fallback(){document.body.append(entry);entry.style.position='fixed';entry.style.removeProperty('left');entry.style.removeProperty('top');entry.hidden=false;delete entry.dataset.anchored;showMascot(true);},
  inspect:()=>({open,current,questionCount:guideQuestions.length,mascot:mascot.inspect()}),
  dispose(){if(!alive)return;close({returnFocus:false});alive=false;events.abort();mascot.dispose();entry.remove();root.remove();}
 };
}
