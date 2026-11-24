// The existing game runs on the portfolio's origin; removing it also releases audio.
export function mountGameRoom(host){
 host.innerHTML='<div class="game-stage"><p class="game-load-state" role="status">正在准备鲜乐拍…</p><iframe id="game-frame" title="鲜乐拍，跟着音乐接果蔬" allow="autoplay; fullscreen" tabindex="0"></iframe><div class="game-load-error" hidden><p>游戏暂时没有加载成功。</p><button class="outline-btn" type="button">重新加载</button><a href="./game/index.html" target="_blank" rel="noopener">单独打开游戏 ↗</a></div></div>';
 const frame=host.querySelector('iframe'),status=host.querySelector('.game-load-state'),error=host.querySelector('.game-load-error');
 let disposed=false,timeout=0,poll=0;
 function failed(){if(disposed)return;clearTimeout(poll);status.hidden=true;error.hidden=false;}
 function ready(){
  if(disposed)return;
  try{if(frame.contentDocument?.querySelector('.fresh-game')){clearTimeout(timeout);status.hidden=true;error.hidden=true;return;}}catch{}
  poll=setTimeout(ready,100);
 }
 function load(){clearTimeout(timeout);clearTimeout(poll);status.hidden=false;error.hidden=true;frame.src=new URL('./game/index.html',location.href).href;timeout=setTimeout(failed,18000);}
 frame.addEventListener('load',ready);frame.addEventListener('error',failed);error.querySelector('button').addEventListener('click',load);load();
 function stop(){try{frame.contentWindow?.dispatchEvent(new Event('xianlepai:host-stop'));}catch{}}
 return {stop,dispose(){if(disposed)return;stop();disposed=true;clearTimeout(timeout);clearTimeout(poll);frame.removeEventListener('load',ready);frame.removeEventListener('error',failed);frame.removeAttribute('src');frame.remove();host.replaceChildren();}};
}
