// Portrait attract screen: existing game art, gentle motion, one whole-screen entry.
export function createPhoneStandby(){
 const canvas=document.createElement('canvas');canvas.width=375;canvas.height=812;
 const c=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');
 c.scale(.5,.5); // More than enough pixels for the small handset, with 4x fewer texture bytes.
 let alive=true,dirty=true,lastTime=null,lastPaint=-Infinity,elapsed=0,paused=false,lastReduced=motion.matches;
 const images={};
 for(const [name,src] of Object.entries({poster:'./assets/game-standby-art.png',pear:'./assets/game/pear.png',broccoli:'./assets/game/broccoli.png',mangosteen:'./assets/game/mangosteen.png'})){
  const image=new Image();image.onload=()=>{if(alive){images[name]=image;dirty=true;}};image.src=src;images[name+'Pending']=image;
 }
 const art=document.createElement('canvas');art.width=750;art.height=800;const ac=art.getContext('2d');let posterReady=false;
 function preparePoster(){
  if(posterReady||!images.poster)return;
  // Viewport focuses on the complete machine at the right of the landscape poster.
  // Title is typeset above it in the portrait UI instead of retaining a tiny inset poster.
  const image=images.poster,sx=image.naturalWidth*.37,sy=image.naturalHeight*.08,sw=image.naturalWidth-sx,sh=image.naturalHeight*.86;
  const h=750*sh/sw;ac.drawImage(image,sx,sy,sw,sh,0,0,750,h);
  ac.globalCompositeOperation='destination-in';const mask=ac.createLinearGradient(0,0,0,h);mask.addColorStop(0,'transparent');mask.addColorStop(.04,'white');mask.addColorStop(.84,'white');mask.addColorStop(1,'transparent');ac.fillStyle=mask;ac.fillRect(0,0,750,800);ac.globalCompositeOperation='source-over';posterReady=true;
 }
 function sparkle(x,y,size,alpha){c.save();c.globalAlpha=alpha;c.fillStyle='#fffbe4';c.beginPath();c.moveTo(x,y-size);c.quadraticCurveTo(x+size*.2,y-size*.2,x+size,y);c.quadraticCurveTo(x+size*.2,y+size*.2,x,y+size);c.quadraticCurveTo(x-size*.2,y+size*.2,x-size,y);c.quadraticCurveTo(x-size*.2,y-size*.2,x,y-size);c.fill();c.restore();}
 function fruit(name,x,y,size,phase,angle){const image=images[name];if(!image)return;c.save();c.translate(x,y+Math.sin(elapsed*.8+phase)*13);c.rotate(angle+Math.sin(elapsed*.55+phase)*.035);c.drawImage(image,-size/2,-size/2,size,size);c.restore();}
 function paint(){
  const t=elapsed;
  const background=c.createLinearGradient(0,0,0,1624);background.addColorStop(0,'#ff9e42');background.addColorStop(.35,'#ffbd78');background.addColorStop(.70,'#ffe6b2');background.addColorStop(1,'#fff3d6');c.fillStyle=background;c.fillRect(0,0,750,1624);
  const light=c.createRadialGradient(375,820,20,375,820,720);light.addColorStop(0,'rgba(255,255,223,.66)');light.addColorStop(1,'rgba(255,255,223,0)');c.fillStyle=light;c.fillRect(0,0,750,1624);
  c.fillStyle='rgba(255,255,255,.10)';for(let y=80;y<440;y+=34)for(let x=0;x<750;x+=34){c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();}
  c.textAlign='center';c.fillStyle='#fff4d9';c.font='500 24px Arial';c.fillText('READY FOR A FRESH BEAT',375,181);
  c.save();c.translate(375,333+Math.sin(t*.65)*3);c.rotate(-.035);c.font='900 151px Microsoft YaHei, Arial';c.lineJoin='round';c.lineWidth=14;c.strokeStyle='rgba(207,98,31,.22)';c.strokeText('鲜乐拍',0,0);c.fillStyle='#fffdf0';c.fillText('鲜乐拍',0,0);c.restore();
  c.font='500 28px Arial';c.fillStyle='#fff8e6';c.fillText('FRESH TAP CHALLENGE',375,410);
  preparePoster();
  if(posterReady){c.save();c.translate(375,894+Math.sin(t*.7)*8);const scale=1+Math.sin(t*.7)*.008;c.scale(scale,scale);c.drawImage(art,-375,-400);c.restore();}
  fruit('pear',103,501,136,.8,-.16);fruit('mangosteen',651,535,112,2.5,.12);fruit('broccoli',585,1263,132,4.1,.16);
  sparkle(665,377,13,.75+Math.sin(t)*.15);sparkle(105,1210,15,.6+Math.sin(t*.9+1)*.2);sparkle(620,1380,8,.65);
  c.fillStyle='#b56736';c.font='500 34px Microsoft YaHei';c.fillText('跟着节奏，接住新鲜',375,1365);
  c.save();c.globalAlpha=.66+Math.sin(t*1.5)*.16;c.font='28px Microsoft YaHei';c.fillStyle='#a86237';c.fillText('轻触屏幕，开始这一拍',375,1470);c.restore();
  // Small moving beat bars make the invitation feel alive without a button panel.
  c.fillStyle='#dfa46a';for(let i=0;i<5;i++){const h=8+Math.pow(Math.sin(t*1.8+i*.8),2)*15;c.beginPath();c.roundRect(342+i*15,1520-h/2,5,h,2.5);c.fill();}
  c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.roundRect(252,1580,246,9,4.5);c.fill();
 }
 paint();dirty=false;
 return {
  canvas,
  update(now,{suspended=false}={}){
   if(!alive)return false;
   if(suspended){paused=true;lastTime=now;return false;}
   if(paused){paused=false;lastTime=now;}
   if(lastReduced!==motion.matches){lastReduced=motion.matches;dirty=true;}
   if(!motion.matches&&lastTime!==null)elapsed+=Math.min(Math.max(0,now-lastTime),80)/1000;
   lastTime=now;
   if(!dirty&&(motion.matches||now-lastPaint<50))return false;
   paint();dirty=false;lastPaint=now;return true;
  },
  state:()=>({mode:'standby',style:'game-attract',artLoaded:posterReady,source:'game-standby-art.png',animated:!motion.matches,paused,phase:elapsed,reducedMotion:motion.matches}),
  dispose(){alive=false;for(const image of Object.values(images))image.onload=null;}
 };
}
