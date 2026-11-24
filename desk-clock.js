import * as THREE from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {createCounter,wrap,clamp} from './counter-engine.js';

// The clock shares the scene's RAF; no idle texture uploads or second animation loop.
export function createDeskClock({materials:M}){
 const root=new THREE.Group();root.name='desk-clock';
 const face=new THREE.Group();face.position.y=.19;face.rotation.x=-.10;root.add(face);
 const owned=[];
 function box(parent,name,w,h,d,material,x=0,y=0,z=0,r=.02){
  const geometry=new RoundedBoxGeometry(w,h,d,3,Math.min(r,d/3,h/3));
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);owned.push(geometry);return mesh;
 }
 box(face,'warm-white-case',.86,.31,.24,M.powderWhite,0,0,0,.04);
 box(face,'inset-display-rim',.762,.225,.012,M.graphite,0,.006,.125,.018);
 for(const x of [-.29,.29])box(root,'rubber-foot',.12,.036,.16,M.rubber,x,.022,0,.008);
 const canvas=document.createElement('canvas');canvas.width=672;canvas.height=224;
 const c=canvas.getContext('2d');
 const strip=document.createElement('canvas');strip.width=672;strip.height=224;const d=strip.getContext('2d');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const displayMaterial=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
 const displayGeometry=new THREE.PlaneGeometry(.736,.202);owned.push(displayGeometry);
 const display=new THREE.Mesh(displayGeometry,displayMaterial);display.position.set(0,.006,.138);face.add(display);
 const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 function timeParts(){const parts=Object.fromEntries(formatter.formatToParts(new Date()).map(p=>[p.type,p.value]));return [Number(parts.hour),Number(parts.minute),Number(parts.second)];}
 let [hour,minute,second]=timeParts(),label='',night=false,paused=false,lastCheck=-Infinity,dirty=true,active=true,disposed=false;
 const hours=createCounter(hour),minutes=createCounter(minute),seconds=createCounter(second);
 if(!motion.matches){hours.set(hour,true);minutes.set(minute,true);seconds.set(second,true);}
 function paint(){
  c.fillStyle=night?'#b8c6b5':'#dce3d4';c.fillRect(0,0,672,224);
  d.clearRect(0,0,672,224);d.textAlign='center';d.textBaseline='middle';d.fillStyle=night?'#344638':'#596851';
  const items=[...hours.items(),...minutes.items(),...seconds.items()],centers=[84,180,304,400,518,598];
  items.forEach((item,index)=>{
   const x=centers[index],isSeconds=index>=4,em=isSeconds?110:140,baseline=isSeconds?120:107,blur=motion.matches?0:clamp((Math.abs(item.vel)-3)*.006,0,.09)*em;
   d.save();d.font=`500 ${em}px Arial`;d.beginPath();d.rect(x-47,18,94,168);d.clip();
   for(let n=0;n<10;n++){
    const offset=wrap(n-item.pos)*168;if(Math.abs(offset)>195)continue;
    if(blur>.25){for(const [shift,alpha] of [[-1,.15],[-.5,.2],[0,.3],[.5,.2],[1,.15]]){d.globalAlpha=alpha;d.fillText(String(n),x,baseline+offset+shift*blur);}}
    else{d.globalAlpha=1;d.fillText(String(n),x,baseline+offset);}
   }
   d.restore();
  });
  d.globalCompositeOperation='destination-in';const mask=d.createLinearGradient(0,18,0,186);mask.addColorStop(0,'transparent');mask.addColorStop(.13,'white');mask.addColorStop(.87,'white');mask.addColorStop(1,'transparent');d.fillStyle=mask;d.fillRect(0,0,672,224);d.globalCompositeOperation='source-over';
  c.drawImage(strip,0,0);c.fillStyle=night?'#344638':'#596851';c.beginPath();for(const x of [242,463]){c.moveTo(x+5,83);c.arc(x,83,5,0,Math.PI*2);c.moveTo(x+5,128);c.arc(x,128,5,0,Math.PI*2);}c.fill();
  c.font='17px Arial';c.textAlign='center';c.fillText('N A N C H A N G',336,208);texture.needsUpdate=true;
 }
 function sync(){const next=timeParts();if(next[0]!==hour||next[1]!==minute||next[2]!==second){[hour,minute,second]=next;hours.set(hour);minutes.set(minute);seconds.set(second);active=dirty=true;}label=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');}
 sync();paint();
 return {
  root,
  update(now,{suspended=false,night:nextNight=false}={}){
   if(disposed)return;
   if(suspended){paused=true;hours.resetTime(now);minutes.resetTime(now);seconds.resetTime(now);return;}
   if(paused){paused=false;lastCheck=-Infinity;hours.resetTime(now);minutes.resetTime(now);seconds.resetTime(now);}
   if(now-lastCheck>=80){sync();lastCheck=now;}
   if(night!==nextNight){night=nextNight;dirty=true;}
   if(active||dirty){const h=hours.frame(now,motion.matches),m=minutes.frame(now,motion.matches),s=seconds.frame(now,motion.matches);active=h||m||s;paint();dirty=false;}
  },
  state(){return {model:'warm-white-desk-clock',renderer:'supplied-counter',label,displayLabel:label+':'+String(second).padStart(2,'0'),timeZone:'Asia/Shanghai',paused,reducedMotion:motion.matches,animating:active,hours:hours.inspect(),minutes:minutes.inspect(),seconds:seconds.inspect()};},
  dispose(){disposed=true;texture.dispose();displayMaterial.dispose();owned.forEach(g=>g.dispose());}
 };
}
