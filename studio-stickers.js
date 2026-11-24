import {mountStickerPeel} from './sticker-peel.js';

// Four paper stickers remain; the former eyes anchor now locates the Cobalt guide.
export function mountStudioStickers(host, workspace, {onEyesPosition}={}) {
 const layer=document.createElement('div');layer.className='studio-stickers';layer.setAttribute('aria-label','工作台贴纸');host.append(layer);
 const definitions=[
  {id:'rainbow',label:'彩虹贴纸',rotate:-5,factor:.13,loc:b=>[b.monitor.x+b.monitor.width*.89,b.monitor.y+b.monitor.height*.80]},
  {id:'heart',label:'爱心贴纸',rotate:10,factor:.085,loc:b=>[b.board.x+b.board.width*.91,b.board.y+b.board.height*.90]},
  {id:'turntable',label:'唱片机贴纸',rotate:-9,factor:.15,loc:b=>[b.turntable.x+b.turntable.width*.30,b.turntable.y-45*(b.monitor.width/575)]},
  {id:'game',label:'GAME 游戏贴纸',rotate:6,factor:.15,loc:b=>[b.game.x+b.game.width*.50,b.game.y-31*(b.monitor.width/575)]}
 ];
 const stickers=definitions.map(d=>({...d,effect:mountStickerPeel(layer,{...d,imageSrc:'./assets/stickers/'+d.id+'.webp',width:48,peelBackHoverPct:23,peelBackActivePct:42,curlRadius:8,lightingIntensity:.38,shadowIntensity:.32,friction:.85,bounce:.16,intro:false})}));
 let frame=0,last=0,disposed=false,hidden=true,anchor={x:0,y:0,width:48};
 workspace.setEyesSticker(true);
 function update(now,reset=false){
  if(disposed)return;
  if(reset||now-last>65){
   last=now;const motion=workspace.motionState(),nextHidden=motion.busy||motion.mix>.005||!!document.querySelector('dialog[open]');
   if(nextHidden!==hidden||!layer.hasAttribute('data-hidden')){hidden=nextHidden;layer.dataset.hidden=String(hidden);layer.inert=hidden;stickers.forEach(d=>d.effect.setVisible?.(!hidden));}
   if(!hidden||reset){const b=workspace.layoutState();for(const d of stickers){const [x,y]=d.loc(b);d.effect.place(x,y,Math.max(24,Math.min(105,b.monitor.width*d.factor)),reset);}anchor={x:b.eyes.x+b.eyes.width*.5,y:b.eyes.y+b.eyes.height*.5,width:b.eyes.width};}
  }
 }
 function tick(now){update(now);onEyesPosition?.({...anchor,hidden:hidden||document.hidden});frame=requestAnimationFrame(tick);}
 update(0,true);frame=requestAnimationFrame(tick);
 return{reset:()=>update(performance.now(),true),inspect:()=>({hidden,eyesReplaced:true,items:stickers.map(d=>({id:d.id,...d.effect.inspect()}))}),dispose(){disposed=true;cancelAnimationFrame(frame);workspace.setEyesSticker(false);stickers.forEach(d=>d.effect.dispose());layer.remove();}};
}
