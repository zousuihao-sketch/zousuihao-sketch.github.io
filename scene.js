import * as THREE from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {createStudioMaterials} from './materials.js';
import {gsap,duration} from './motion.js';
import {createPortraitBadge,createMonitorEyes,createCompactPinboard,createSketchSheet} from './homepage-objects.js';
import {createReferenceComputer,createReferenceTurntable} from './devices.js';
import {createDeskPhone} from './iphone.js';
import {createMonitorGreeting} from './monitor-greeting.js';
import {createDeskClock} from './desk-clock.js';

const palette={white:0xf3f4ee,porcelain:0xe5e8e2,blue:0xb8cdd5,ink:0x39484c,silver:0xc7cfcf,wood:0xd6c7ac,green:0x8ca897,paper:0xfffcf2};
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=motionQuery.matches;
motionQuery.addEventListener('change',event=>{reduced=event.matches;});
const materialCache=new Map();
const mat=(color,roughness=.6,metalness=0)=>{const key=`${color}:${roughness}:${metalness}`;if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materialCache.get(key);};
function box(parent,w,h,d,color,x=0,y=0,z=0,r=.035){const geo=new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3));const mesh=new THREE.Mesh(geo,typeof color==='object'?color:mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cylinder(parent,rt,rb,h,color,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,40),typeof color==='object'?color:mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function sphere(parent,r,color,x,y,z,sx=1,sy=1,sz=1){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,24,20),typeof color==='object'?color:mat(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;parent.add(mesh);return mesh;}
function line(parent,points,color=palette.ink,radius=.015){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,40,radius,8,false),typeof color==='object'?color:mat(color));mesh.castShadow=true;parent.add(mesh);return mesh;}
function canvasTexture(width,height,draw){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');draw(context,width,height);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;}
function plane(parent,w,h,texture,x,y,z){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide}));m.position.set(x,y,z);parent.add(m);return m;}
function labelTexture(title,subtitle,background='#f8f8f0',foreground='#455650',width=512,height=256){return canvasTexture(width,height,(c,w,h)=>{c.fillStyle=background;c.fillRect(0,0,w,h);c.fillStyle=foreground;c.font=`500 ${h*.20}px Arial, Microsoft YaHei`;c.fillText(title,w*.09,h*.46);c.font=`${h*.072}px Arial`;c.fillText(subtitle,w*.1,h*.72);});}
function smallLabel(parent,text,x,y,z,w=.5,h=.13){return plane(parent,w,h,labelTexture(text,'','#e9ede8','#657871',512,128),x,y,z);}

export async function createWorkspace(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xf6f1eb);scene.fog=new THREE.Fog(0xf6f1eb,25,65);
 const pmrem=new THREE.PMREMGenerator(renderer);const environment=new RoomEnvironment();const environmentTarget=pmrem.fromScene(environment,.04);scene.environment=environmentTarget.texture;scene.environmentIntensity=.60;environment.dispose();pmrem.dispose();
 const M=await createStudioMaterials(renderer);
 const camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,100);
 const cameraTarget=new THREE.Vector3(0,2.75,0);
 const focusRig={x:0,y:4.35,zoom:1,mix:0};let focusTimeline=null,lightingTimeline=null,busy=false;
 const hemi=new THREE.HemisphereLight(0xffffff,0xbfc6b4,1.6);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xfffbf0,2.4);sun.position.set(-5.5,9,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=9;sun.shadow.camera.bottom=-5;sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;sun.shadow.radius=5;sun.shadow.blurSamples=10;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xd8e9f2,.65);fill.position.set(8,5,5);scene.add(fill);
 const wallMat=mat(0xfffaf4,.95);const wall=box(scene,40,20,.1,wallMat,0,8,-1.85,.01);wall.castShadow=false;
 const floorMaterial=new THREE.MeshBasicMaterial({color:0xf6f1eb,toneMapped:false});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-.04;scene.add(floor);
 const groundShadow=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.ShadowMaterial({color:0x5c6a5c,opacity:.17}));groundShadow.rotation.x=-Math.PI/2;groundShadow.position.y=-.035;groundShadow.receiveShadow=true;scene.add(groundShadow);
 // Soft, physical-looking afternoon stripes on the wall.
 const lightTex=canvasTexture(512,1024,(c,w,h)=>{c.clearRect(0,0,w,h);const g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'rgba(173,185,168,0)');g.addColorStop(.5,'rgba(173,185,168,.11)');g.addColorStop(1,'rgba(173,185,168,0)');c.fillStyle=g;for(let i=0;i<8;i++){c.save();c.translate(-70,i*130);c.rotate(-.3);c.fillRect(0,0,w+170,36);c.restore();}});
 const wallLight=new THREE.Mesh(new THREE.PlaneGeometry(6.5,7.3),new THREE.MeshBasicMaterial({map:lightTex,transparent:true,depthWrite:false}));wallLight.position.set(-4,3.5,-1.787);scene.add(wallLight);
 // Pale ash tabletop, textured along its grain.
 const woodTex=canvasTexture(1024,256,(c,w,h)=>{c.fillStyle='#dfd5c2';c.fillRect(0,0,w,h);let seed=23;for(let i=0;i<650;i++){seed=(seed*16807)%2147483647;let yy=seed%h;c.strokeStyle=`rgba(123,105,73,${.015+(i%5)*.009})`;c.lineWidth=.3+(i%3)*.3;c.beginPath();c.moveTo(0,yy);c.bezierCurveTo(w*.3,yy+Math.sin(i)*5,w*.6,yy-4,w,yy+2);c.stroke();}});
 woodTex.wrapS=woodTex.wrapT=THREE.RepeatWrapping;
 const woodMaterial=M.ash;
 const desk=new THREE.Group();scene.add(desk);
 const deskSurface=box(desk,10.5,.18,2.65,woodMaterial,0,2.38,.15,.075);
 box(desk,10.15,.12,2.35,M.powderWhite,0,2.23,.12,.03);
 for(const x of [-4.65,4.65])for(const z of [-.8,1.04])cylinder(desk,.07,.085,2.22,woodMaterial,x,1.1,z);
 // Keep the space under the desk open, matching the approved frontal layout.
 // Felt desk mat and a keyboard with individually modelled keycaps.
 
 const keyboard=new THREE.Group();keyboard.position.set(-.25,2.53,.71);desk.add(keyboard);
 box(keyboard,2.35,.075,.69,M.aluminum,0,0,0,.055);
 for(let row=0;row<5;row++)for(let col=0;col<15;col++){
  if(row===4&&col>3&&col<11)continue;
  const color=(col===0&&row===0)?0x668ba0:((col===14||row===4)?0xb7c5cf:0xf1f1e9);
  const key=box(keyboard,.132,.052,.105,color,-1.05+col*.15,.055,-.259+row*.125,.014);
  if(row<4&&col>0&&col<14){const legend=new THREE.Mesh(new THREE.PlaneGeometry(.025,.012),mat(0xa5b3a8));legend.rotation.x=-Math.PI/2;legend.position.set(key.position.x,.082,key.position.z);keyboard.add(legend);}
 }
 box(keyboard,1.0,.05,.105,0xf3f5ec,.03,.055,.241,.015);
 const mouse=sphere(desk,.23,palette.white,1.48,2.57,.74,.69,.33,1.05);line(desk,[[1.48,2.642,.53],[1.48,2.65,.64],[1.48,2.64,.69]],0xb0bbb1,.007);
 // The monitor is the main project entrance.
 const interactives=[];const anchors={};
 function interactive(id,title,position){const group=new THREE.Group();group.position.set(...position);group.userData={id,title,baseY:position[1],baseZ:position[2],hover:0,reveal:1};scene.add(group);interactives.push(group);return group;}
 const monitor=interactive('work','精选作品 · 打开电脑',[0,4.15,-.20]);
 const screenTexture=canvasTexture(1200,680,(c,w,h)=>{c.fillStyle='#faf4e9';c.fillRect(0,0,w,h);});
 const computer=createReferenceComputer({materials:M,screenTexture});computer.root.scale.setScalar(1.1);monitor.add(computer.root);const screenGlow=computer.glow;
 let greeting=null,greetingTexture=null,monitorPointer=null;
 const eyes=createMonitorEyes();eyes.root.position.set(-1.74,1.17,.17);computer.root.add(eyes.root);
 const loader=new THREE.TextureLoader();
 const loadTexture=(path)=>new Promise(resolve=>loader.load(path,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();resolve(t);},undefined,()=>resolve(null)));
 // The former camera area now holds the playable iPhone on its own desk stand.
 const gamePhone=interactive('game','鲜乐拍 · 玩一局音乐小游戏',[-2.72,2.48,-.02]);
 const phone=createDeskPhone({materials:M});gamePhone.add(phone.root);
 
 // Three individual photographs; the board remains secondary to the screen.
 const board=interactive('life','照片墙 · 生活里的光',[3.52,5.08,-1.65]);
 const pinboardModel=await createCompactPinboard({materials:M,loadTexture});const pinboard=pinboardModel.root;board.add(pinboard);
 const boardPhotos=pinboardModel.photos;for(const photo of boardPhotos)interactives.push(photo);
 // A small portrait badge, with its swing pivot at the wall attachment.
 const badge=interactive('about','关于我 · 工作证',[-3.72,4.98,-1.48]);
 const identity=await createPortraitBadge({materials:M,loadTexture});badge.add(identity.root);
 const badgePeg=cylinder(scene,.023,.023,.07,M.aluminum,-3.72,4.98,-1.73);badgePeg.rotation.x=Math.PI/2;
 badge.rotation.z=-.035;
 const deskClock=createDeskClock({materials:M});deskClock.root.position.set(-3.72,2.48,-.08);scene.add(deskClock.root);
 // Cream/orange turntable from the supplied style reference.
 const player=interactive('music','黑胶唱片机 · 听点音乐',[3.22,2.79,.23]);
 const turntable=createReferenceTurntable({materials:M});turntable.root.scale.setScalar(.86);player.add(turntable.root);
 player.position.y=2.47-turntable.supportFloor*.86;player.userData.baseY=player.position.y;
 // An adjustable task lamp, modelled with joints and a tilted shade.
 const lamp=interactive('lamp','台灯 · 切换昼夜',[4.65,2.49,-.46]);
 cylinder(lamp,.28,.31,.065,M.enamelSage,0,0,0);line(lamp,[[0,.03,0],[.08,.77,0],[-.27,1.26,.02]],M.aluminum,.038);
 sphere(lamp,.065,palette.silver,.08,.77,0);sphere(lamp,.065,palette.silver,-.27,1.26,.02);
 const shadeGroup=new THREE.Group();shadeGroup.position.set(-.33,1.26,.04);shadeGroup.rotation.z=-.24;lamp.add(shadeGroup);
 cylinder(shadeGroup,.13,.32,.31,M.enamelSage,0,-.10,0);const shadeGlow=new THREE.MeshStandardMaterial({color:0xfff2ce,emissive:0xffd995,emissiveIntensity:.15});cylinder(shadeGroup,.28,.28,.012,shadeGlow,0,-.257,0);
 const lampLight=new THREE.PointLight(0xffdba2,0,5,2);lampLight.position.set(-.35,1,.15);lamp.add(lampLight);
 // The user's sneaker drawing becomes an entrance to their artwork.
 const sketch=interactive('life','手绘稿 · 看看我的画',[-3.0,2.4755,.95]);sketch.userData.action='art';
 sketch.add(await createSketchSheet({materials:M,loadTexture}));
 // Objects resting on the desk keep their contact plane during the entrance too.
 for(const object of [gamePhone,player,lamp,sketch])object.userData.grounded=true;
 const projectAnchor=new THREE.Vector3();
 const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2(2,2);let current=null,night=false,playing=false,viewX=0,viewY=0,desiredX=0,desiredY=0,startPoint=null;
 const tooltip=document.getElementById('object-tooltip');
 function setHover(target,event){
  if(current!==target){if(current)gsap.to(current.userData,{hover:0,duration:duration(.35),ease:'power2.out',overwrite:true});current=target;if(target)gsap.to(target.userData,{hover:reduced?0:1,duration:duration(.35),ease:'power2.out',overwrite:true});canvas.style.cursor=target?'pointer':'default';tooltip.textContent=target?.userData.title||'';tooltip.classList.toggle('visible',!!target);}
  if(target&&event){tooltip.style.left=`${event.clientX}px`;tooltip.style.top=`${event.clientY-10}px`;}
  if(!target){tooltip.style.left='0px';tooltip.style.top='0px';}
 }
 function pick(event){const bounds=canvas.getBoundingClientRect();pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(interactives,true)[0];if(!hit)return null;let object=hit.object;while(object&&!interactives.includes(object))object=object.parent;return object;}
 canvas.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||busy||focusRig.mix>.05)return;desiredX=reduced?0:(event.clientX/innerWidth-.5)*.26;desiredY=reduced?0:(event.clientY/innerHeight-.5)*.10;setHover(pick(event),event);});
 canvas.addEventListener('pointerleave',()=>{desiredX=0;desiredY=0;setHover(null);});
 canvas.addEventListener('pointerdown',event=>{startPoint=[event.clientX,event.clientY];if(pick(event)===monitor)greeting?.wake();});
 canvas.addEventListener('pointerup',event=>{if(!startPoint||Math.hypot(event.clientX-startPoint[0],event.clientY-startPoint[1])>9)return;const target=pick(event);startPoint=null;if(target)document.dispatchEvent(new CustomEvent('workspace:open',{detail:{id:target.userData.id,source:target.userData.action||target.userData.id,photoIndex:target.userData.photoIndex}}));});
 function resize(){setHover(null);const w=canvas.parentElement.clientWidth,h=canvas.parentElement.clientHeight;renderer.setSize(w,h,false);const aspect=w/h;const viewWidth=w<600?11.6:w<1000?12.0:11.2;const vh=viewWidth/aspect;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=vh/2;camera.bottom=-vh/2;camera.zoom=1;cameraTarget.set(0,w<600?4.12:4.35,0);camera.updateProjectionMatrix();updateCamera();}
 function updateCamera(){const target=cameraTarget.clone().lerp(new THREE.Vector3(focusRig.x,focusRig.y,0),focusRig.mix);camera.position.set(target.x+viewX*(1-focusRig.mix),target.y+3.1+viewY*(1-focusRig.mix),18);camera.lookAt(target);if(camera.zoom!==focusRig.zoom){camera.zoom=focusRig.zoom;camera.updateProjectionMatrix();}camera.updateMatrixWorld();}
 resize();updateCamera();window.addEventListener('resize',resize);
 greeting=createMonitorGreeting();greetingTexture=new THREE.CanvasTexture(greeting.canvas);greetingTexture.colorSpace=THREE.SRGBColorSpace;greetingTexture.anisotropy=4;computer.screen.material.map=greetingTexture;
 const onMonitorPointer=event=>{if(event.pointerType!=='touch')monitorPointer={x:event.clientX,y:event.clientY};};
 const onMonitorLeave=()=>{monitorPointer=null;greeting.proximity(false);};
 window.addEventListener('pointermove',onMonitorPointer,{passive:true});document.documentElement.addEventListener('pointerleave',onMonitorLeave);
 let previous=0,frame=0,lastElapsed=0;const clock=new THREE.Clock();let visible=!document.hidden;
 function onVisibility(){visible=!document.hidden;const state={suspended:!visible||busy||focusRig.mix>.005||!!document.querySelector('dialog[open]'),night};greeting.update(performance.now(),state);deskClock.update(performance.now(),state);}
 document.addEventListener('visibilitychange',onVisibility);
 onVisibility();
 function animate(time){frame=requestAnimationFrame(animate);if(!visible||time-previous<1000/45)return;previous=time;const elapsed=clock.getElapsedTime();const delta=lastElapsed?elapsed-lastElapsed:0;lastElapsed=elapsed;if(reduced){viewX=viewY=desiredX=desiredY=0;}else{viewX+=(desiredX-viewX)*.04;viewY+=(desiredY-viewY)*.04;}updateCamera();
  for(const object of interactives){if(reduced)object.userData.hover=0;object.position.y=object.userData.baseY-(1-(object.userData.reveal??1))*.16;}
  const badgeHover=badge.userData.hover||0;badge.rotation.z=-.035+(reduced?0:Math.sin(elapsed*1.6)*.008+badgeHover*.07);
  eyes.update(pointer.x,pointer.y,elapsed,reduced);
  gamePhone.rotation.y=reduced?0:(gamePhone.userData.hover||0)*.025;
  screenGlow.intensity=(night?.7:.11)+(monitor.userData.hover||0)*.16;
  for(const photo of boardPhotos)photo.rotation.x=-(photo.userData.hover||0)*.14;
  player.rotation.y=reduced?0:-(player.userData.hover||0)*.035;
  turntable.update(delta,reduced);
  const suspended=busy||focusRig.mix>.005||!!document.querySelector('dialog[open]');
  if(!suspended&&monitorPointer){const b=projectedBounds(computer.screen),r=canvas.getBoundingClientRect(),p=Math.max(22,Math.min(65,b.width*.12)),x=monitorPointer.x-r.left,y=monitorPointer.y-r.top;greeting.proximity(x>=b.x-p&&x<=b.x+b.width+p&&y>=b.y-p&&y<=b.y+b.height+p);}
  if(greeting.update(time,{suspended,night}))greetingTexture.needsUpdate=true;
  deskClock.update(time,{suspended,night});
  phone.update(time,{suspended});
  renderer.render(scene,camera);
 }
 requestAnimationFrame(animate);

 function setNight(value){
  night=value;lightingTimeline?.kill();const d=duration(.85),color=new THREE.Color(night?0x273334:0xf6f1eb),wallColor=new THREE.Color(night?0x52635e:0xfffaf4);
  lightingTimeline=gsap.timeline({defaults:{duration:d,ease:'sine.inOut'},onUpdate(){scene.fog.color.copy(scene.background);floorMaterial.color.copy(scene.background);}});
  lightingTimeline.to(scene.background,{r:color.r,g:color.g,b:color.b},0).to(wallMat.color,{r:wallColor.r,g:wallColor.g,b:wallColor.b},0)
   .to(hemi,{intensity:night?.55:1.6},0).to(sun,{intensity:night?.12:2.4},0).to(fill,{intensity:night?.22:.65},0)
   .to(lampLight,{intensity:night?5:0},0).to(shadeGlow,{emissiveIntensity:night?2:.15},0).to(scene,{environmentIntensity:night?.28:.6},0);
  wallLight.visible=!night;
 }
 function focus(id,options={}){
  if(id==='work')greeting?.wake();
  focusTimeline?.kill();setHover(null);busy=true;desiredX=desiredY=0;
  const target=interactives.find(object=>object.userData.id===id)||monitor;
  const point=(id==='about'?identity.card:id==='game'?phone.screen:target).getWorldPosition(new THREE.Vector3());
  return new Promise(resolve=>{
   focusTimeline=gsap.timeline({defaults:{ease:'power3.inOut'},onUpdate(){if(id==='about'||id.startsWith('photo-'))renderer.shadowMap.needsUpdate=true;},onComplete(){busy=false;resolve(true);},onInterrupt(){busy=false;resolve(false);}});
   const zoom=innerWidth<600?1.65:1.34;
   focusTimeline.to(focusRig,{x:point.x,y:point.y,zoom,mix:1,duration:duration(.62)},0);
   if(id==='about'||id.startsWith('photo-'))focusTimeline.to(target.position,{z:(target.userData.baseZ??target.position.z)+.16,duration:duration(.45),ease:'power2.out'},0);
  });
 }
 function reset(){
  focusTimeline?.kill();busy=false;desiredX=desiredY=0;
  for(const object of interactives)if(object.userData.baseZ!==undefined)gsap.to(object.position,{z:object.userData.baseZ,duration:duration(.55),ease:'power2.out',overwrite:'auto'});
  return new Promise(resolve=>{focusTimeline=gsap.timeline({onComplete(){renderer.shadowMap.needsUpdate=true;resolve(true);},onInterrupt:()=>resolve(false)}).to(focusRig,{zoom:1,mix:0,duration:duration(.65),ease:'power3.inOut'});});
 }
 function projectedBounds(object){
  const bounds=new THREE.Box3().setFromObject(object),min=new THREE.Vector2(Infinity,Infinity),max=new THREE.Vector2(-Infinity,-Infinity);
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);min.x=Math.min(min.x,p.x);max.x=Math.max(max.x,p.x);min.y=Math.min(min.y,p.y);max.y=Math.max(max.y,p.y);}
  return{x:(min.x+1)/2*canvas.clientWidth,y:(1-max.y)/2*canvas.clientHeight,width:(max.x-min.x)/2*canvas.clientWidth,height:(max.y-min.y)/2*canvas.clientHeight};
 }
 const api={setNight,focus,reset,monitorState:()=>greeting.inspect(),
  setEyesSticker(value){eyes.root.visible=!value;},
  layoutState(){return{badge:projectedBounds(identity.card),board:projectedBounds(board),monitor:projectedBounds(computer.root),turntable:projectedBounds(turntable.root),phone:projectedBounds(gamePhone),game:projectedBounds(phone.screen),clock:projectedBounds(deskClock.root),eyes:projectedBounds(eyes.root),eyesSticker:!eyes.root.visible,photoCount:boardPhotos.length};},
  reveal(){if(reduced)return;gsap.fromTo(interactives.filter(o=>!o.userData.grounded).map(o=>o.userData),{reveal:0},{reveal:1,duration:.8,stagger:.045,ease:'power3.out',onComplete(){renderer.shadowMap.needsUpdate=true;}});},
  setPlaying(value){playing=value;turntable.setPlaying(value);},
  setVolume(value){turntable.setVolume(value);},
  deviceState(){return{computer:computer.state(),turntable:turntable.state(),phone:phone.state(),clock:deskClock.state()};},
  contactState(){
   scene.updateMatrixWorld(true);
   const bounds=node=>{const b=new THREE.Box3().setFromObject(node);return {min:b.min.toArray(),max:b.max.toArray()};};
   const feet=[];turntable.root.traverse(node=>{if(node.userData.support)feet.push(bounds(node));});
   return{desk:bounds(deskSurface),sketch:bounds(sketch),phoneBase:bounds(phone.root.getObjectByName('stand-base')),turntableFeet:feet,turntableCase:bounds(turntable.root.getObjectByName('turntable-case'))};
  },
  motionState(){return{busy,x:focusRig.x,y:focusRig.y,zoom:focusRig.zoom,mix:focusRig.mix};},
  boardParts(){return Object.entries(pinboard.userData.sculptRuntime.meshes).map(([id,m])=>({name:id,uuid:m.uuid,kind:'part',triangles:m.geometry.index?m.geometry.index.count/3:m.geometry.attributes.position.count/3}));},
  hotspots(){return interactives.map(g=>{(g===badge?identity.card:g===gamePhone?phone.screen:g).getWorldPosition(projectAnchor);projectAnchor.project(camera);return{id:g.userData.id,x:(projectAnchor.x+1)/2*innerWidth,y:(1-projectAnchor.y)/2*innerHeight};});},
  dispose(){window.removeEventListener('pointermove',onMonitorPointer);document.documentElement.removeEventListener('pointerleave',onMonitorLeave);document.removeEventListener('visibilitychange',onVisibility);greeting.dispose();greetingTexture.dispose();screenTexture.dispose();phone.dispose();deskClock.dispose();turntable.dispose();cancelAnimationFrame(frame);focusTimeline?.kill();lightingTimeline?.kill();environmentTarget.dispose();renderer.dispose();}
 };
 canvas.dataset.ready='true';return api;
}
