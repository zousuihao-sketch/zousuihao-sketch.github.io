import {gsap} from './motion.js';
import {createSignatureRenderer} from './signature.js';

function background(night){
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=760;const c=canvas.getContext('2d');
 c.fillStyle=night?'#233139':'#faf4e9';c.fillRect(0,0,1280,760);
 for(const [x,y,r,color] of night?[[1050,80,700,'#8c6f8030'],[50,700,650,'#648d8040']]:[[1100,30,700,'#edc0bd75'],[70,700,650,'#b9cfbd75'],[500,0,520,'#d6cfe63c']]){
  const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,1280,760);
 }
 return canvas;
}

export function createMonitorGreeting(){
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=680;const c=canvas.getContext('2d');
 const signature=createSignatureRenderer(),words=['hello.','welcome.','suihao.'].map(text=>signature.plan(text));
 const backgrounds={day:background(false),night:background(true)},media=matchMedia('(prefers-reduced-motion: reduce)');
 const ink={progress:0,opacity:1};
 let word=0,eyesAwake=false,near=false,paused=false,awaySince=performance.now(),pauseAt=0,lastDraw=-Infinity,previousNight=null,dirty=true,disposed=false;
 const timeline=gsap.timeline({paused:true,repeat:-1});
 for(let i=0;i<words.length;i++){
  timeline.call(()=>{word=i;ink.progress=0;ink.opacity=1;dirty=true;})
   .to(ink,{progress:1,duration:3,ease:'none'})
   .to(ink,{duration:2.6})
   .to(ink,{opacity:0,duration:.65,ease:'sine.inOut'});
 }
 function configureMotion(){
  if(media.matches){timeline.pause();word=0;ink.progress=1;ink.opacity=1;}
  else{timeline.restart();if(paused)timeline.pause();}
  dirty=true;
 }
 media.addEventListener('change',configureMotion);configureMotion();
 function draw(now,night){
  c.clearRect(0,0,1200,680);
  const shift=media.matches?0:Math.sin(now/13000)*14;
  c.drawImage(backgrounds[night?'night':'day'],-40+shift,-40,1280,760);
  c.fillStyle=night?'#a3ada4':'#94a196';c.font='16px Arial';c.textAlign='center';c.fillText('S U I H A O   S T U D I O',600,104);
  c.save();c.globalAlpha=ink.opacity;signature.draw(c,words[word],{x:170,y:185,width:860,height:300,progress:ink.progress,duration:3,ink:night?'#ede6d5':'#52665b',outline:true});c.restore();
  c.fillStyle=night?'#a3ada4':'#9aa395';c.font='23px Microsoft YaHei, sans-serif';c.fillText('很高兴，你来了。',600,565);
 }
 draw(0,false);dirty=false;
 return {
  canvas,
  proximity(value){if(near===value)return;near=value;if(value)eyesAwake=true;else awaySince=paused?pauseAt:performance.now();},
  // Waking now affects only the eyes: the monitor always keeps its Signature artwork.
  wake(){eyesAwake=true;awaySince=paused?pauseAt:performance.now();},
  update(now,{suspended=false,night=false}={}){
   if(disposed)return false;
   if(suspended!==paused){paused=suspended;if(paused){pauseAt=now;timeline.pause();}else{awaySince+=Math.max(0,now-pauseAt);if(!media.matches)timeline.resume();dirty=true;}}
   if(paused)return false;
   if(eyesAwake&&!near&&now-awaySince>=20000)eyesAwake=false;
   if(night!==previousNight)dirty=true;
   if(!dirty&&media.matches)return false;
   if(now-lastDraw<1000/24)return false;
   draw(now,night);lastDraw=now;previousNight=night;dirty=false;return true;
  },
  inspect:()=>({renderer:'originkit-signature',screen:'signature',mode:'greeting',sleeping:!eyesAwake,eyesAwake,word:words[word].text,progress:ink.progress,opacity:ink.opacity,blend:1,near,paused,reducedMotion:media.matches,glyphs:words[word].letters.map(g=>g.ch).join('')}),
  dispose(){disposed=true;timeline.kill();signature.dispose();media.removeEventListener('change',configureMotion);}
 };
}

