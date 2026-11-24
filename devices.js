import * as THREE from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {gsap,duration} from './motion.js';

function part(parent,name,geometry,material,position=[0,0,0]){
 const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function rounded(parent,name,size,material,position=[0,0,0],radius=.03){
 return part(parent,name,new RoundedBoxGeometry(...size,4,Math.min(radius,...size.map(v=>v/2.1))),material,position);
}
function roundedSlab(parent,name,w,h,d,material,position,radius=.16,bevel=.02){
 // Outline curvature is independent of thickness, so a thin lid follows the case corners.
 const b=Math.min(bevel,h/3),x=w/2-b,z=d/2-b,r=Math.max(.001,radius-b),shape=new THREE.Shape();
 shape.moveTo(-x+r,-z);shape.lineTo(x-r,-z);shape.quadraticCurveTo(x,-z,x,-z+r);shape.lineTo(x,z-r);shape.quadraticCurveTo(x,z,x-r,z);shape.lineTo(-x+r,z);shape.quadraticCurveTo(-x,z,-x,z-r);shape.lineTo(-x,-z+r);shape.quadraticCurveTo(-x,-z,-x+r,-z);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:h-2*b,steps:1,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,curveSegments:12});geometry.translate(0,0,-h/2+b);geometry.rotateX(-Math.PI/2);
 return part(parent,name,geometry,material,position);
}
function cylinder(parent,name,radius,height,material,position=[0,0,0],segments=64){
 return part(parent,name,new THREE.CylinderGeometry(radius,radius,height,segments),material,position);
}
function tube(parent,name,points,radius,material){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return part(parent,name,new THREE.TubeGeometry(curve,36,radius,10,false),material);
}
function canvasMap(w,h,draw){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
const physical=(color,roughness,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,metalness:0,...extra});

/** Silver chin, glass bezel and a continuous bent sheet stand, adapted from the supplied reference. */
export function createReferenceComputer({materials,screenTexture}){
 const root=new THREE.Group();root.name='silver-all-in-one';root.userData.model='silver-all-in-one';
 const aluminum=materials.aluminum.clone();aluminum.color.set(0xcdd1d1);aluminum.metalness=.65;aluminum.roughness=.41;aluminum.envMapIntensity=.75;
 const edge=physical(0x9ba1a5,.34,{metalness:1,envMapIntensity:.65});
 const bezel=physical(0x1e2428,.27,{clearcoat:.45,clearcoatRoughness:.27});
 const glass=physical(0x182026,.20,{clearcoat:.75,clearcoatRoughness:.16});
 // A tapered rear shell leaves a thin machined edge in the frontal view.
 rounded(root,'computer-back-shell',[3.55,2.22,.12],aluminum,[0,0,-.045],.11);
 rounded(root,'computer-machined-edge',[3.68,2.32,.045],edge,[0,0,.014],.09);
 rounded(root,'computer-aluminum-front',[3.66,2.30,.055],aluminum,[0,0,.043],.085);
 rounded(root,'computer-black-bezel',[3.58,1.99,.021],bezel,[0,.135,.078],.053);
 rounded(root,'computer-display-glass',[3.45,1.86,.008],glass,[0,.135,.093],.025);
 const screen=part(root,'portfolio-display',new THREE.PlaneGeometry(3.39,1.81),new THREE.MeshBasicMaterial({map:screenTexture,toneMapped:false}),[0,.135,.099]);screen.castShadow=false;
 // Very restrained edge reflection; no photographic lighting is baked onto the case.
 const reflection=canvasMap(256,64,(c,w,h)=>{const gradient=c.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'rgba(255,255,255,.11)');gradient.addColorStop(.5,'rgba(255,255,255,0)');c.fillStyle=gradient;c.fillRect(0,0,w,h);});
 const glint=part(root,'glass-edge-reflection',new THREE.PlaneGeometry(3.39,1.81),new THREE.MeshBasicMaterial({map:reflection,transparent:true,depthWrite:false,toneMapped:false}),[0,.135,.100]);glint.castShadow=false;
 // The side profile is a bent sheet, extruded across its width, rather than a cylinder under the screen.
 const shape=new THREE.Shape();
 shape.moveTo(.095,-.79);shape.lineTo(.115,-1.15);shape.bezierCurveTo(.115,-1.37,.13,-1.47,-.20,-1.48);shape.lineTo(-.47,-1.48);shape.lineTo(-.47,-1.525);shape.lineTo(-.17,-1.525);shape.bezierCurveTo(.20,-1.525,.18,-1.34,.16,-1.13);shape.lineTo(.14,-.79);shape.closePath();
 const standGeometry=new THREE.ExtrudeGeometry(shape,{depth:.52,steps:1,bevelEnabled:true,bevelThickness:.009,bevelSize:.009,bevelSegments:3,curveSegments:20});standGeometry.translate(0,0,-.26);standGeometry.rotateY(Math.PI/2);
 part(root,'curved-aluminum-stand',standGeometry,aluminum);
 rounded(root,'stand-foot',[1.02,.033,.68],aluminum,[0,-1.51,.17],.026);
 rounded(root,'stand-foot-rubber',[.87,.015,.55],materials.rubber,[0,-1.53,.17],.006);
 const markTexture=canvasMap(256,64,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#707a7d';c.font='500 26px Georgia';c.textAlign='center';c.fillText('sh.',w/2,43);});
 const mark=part(root,'chin-designer-mark',new THREE.PlaneGeometry(.21,.053),new THREE.MeshBasicMaterial({map:markTexture,transparent:true,toneMapped:false}),[0,-1.005,.075]);mark.castShadow=false;
 // Small webcam is part of the reference computer's silhouette.
 rounded(root,'webcam-mount',[.17,.055,.12],materials.graphite,[0,1.17,-.008],.015);
 rounded(root,'webcam-body',[.47,.135,.12],bezel,[0,1.25,.015],.056);
 const webcamRim=cylinder(root,'webcam-lens-ring',.043,.013,edge,[0,1.25,.083]);webcamRim.rotation.x=Math.PI/2;
 const webcamLens=cylinder(root,'webcam-lens',.030,.015,materials.lens,[0,1.25,.086]);webcamLens.rotation.x=Math.PI/2;
 for(const x of [-.13,-.10,.10,.13]){const aperture=cylinder(root,'webcam-microphone-'+x,.006,.005,materials.rubber,[x,1.25,.077],12);aperture.rotation.x=Math.PI/2;}
 const glow=new THREE.PointLight(0xdceaf7,.11,2.5);glow.position.set(0,.14,.45);root.add(glow);
 root.userData.parts=[];root.traverse(node=>{if(node.isMesh)root.userData.parts.push(node.name);});
 return{root,screen,glow,state:()=>({model:root.userData.model,parts:root.userData.parts})};
}

/** Separate chassis, rotating platter, top hinge, cartridge and volume dial. */
export function createReferenceTurntable({materials}){
 const root=new THREE.Group();root.name='cream-vinyl-turntable';root.userData.model='cream-vinyl-turntable';
 // The display cradle tips the machine slightly toward the frontal camera; support feet reach the desk.
 const deck=new THREE.Group();deck.name='turntable-case';deck.rotation.set(.18,-.08,0);root.add(deck);
 const cream=physical(0xeee4ce,.43,{clearcoat:.25,clearcoatRoughness:.35});
 const topCream=physical(0xf6eedb,.39,{clearcoat:.3,clearcoatRoughness:.3});
 const orange=physical(0xd36d2c,.36,{clearcoat:.25,clearcoatRoughness:.3});
 const seam=physical(0xb4aa92,.78),charcoal=physical(0x171d21,.34,{clearcoat:.4,clearcoatRoughness:.2});
 const armMetal=materials.aluminum.clone();armMetal.color.set(0xa59d8b);armMetal.roughness=.34;armMetal.envMapIntensity=.8;
 roundedSlab(deck,'orange-lower-shell',2.22,.12,1.55,orange,[0,-.13,0],.17,.025);
 roundedSlab(deck,'case-shadow-seam',2.19,.018,1.51,seam,[0,-.067,0],.16,.005);
 roundedSlab(deck,'cream-rounded-chassis',2.20,.30,1.53,cream,[0,.065,0],.17,.04);
 roundedSlab(deck,'cream-top-inset',2.10,.018,1.44,topCream,[0,.218,0],.13,.004);
 // Keep every corner of the tipped shell above the common foot contact plane.
 const supportFloor=Math.min(-.31,new THREE.Box3().setFromObject(deck).min.y-.018);
 for(const [ix,x] of [-.83,.83].entries())for(const [iz,z] of [-.53,.53].entries()){
  const underside=new THREE.Vector3(x,-.19,z).applyEuler(deck.rotation),height=underside.y-supportFloor;
  const foot=cylinder(root,`support-foot-${ix}-${iz}`,.085,height,materials.rubber,[underside.x,supportFloor+height/2,underside.z],24);foot.userData.support=true;
 }
 cylinder(deck,'platter-bearing',.79,.035,charcoal,[-.18,.246,-.045],96);
 const platter=new THREE.Group();platter.name='rotating-vinyl';platter.position.set(-.18,.267,-.045);deck.add(platter);
 const vinyl=physical(0x070a0d,.38,{clearcoat:.25,clearcoatRoughness:.3,envMapIntensity:.25});
 cylinder(platter,'vinyl-thickness',.762,.024,charcoal,[0,0,0],128);
 // Circle UVs keep concentric grooves circular; cylinder side UVs never stretch them into stripes.
 const surface=part(platter,'vinyl-grooved-face',new THREE.CircleGeometry(.759,128),vinyl,[0,.013,0]);surface.rotation.x=-Math.PI/2;
 const outerRing=part(platter,'vinyl-outer-rim',new THREE.TorusGeometry(.758,.005,5,128),charcoal,[0,.014,0]);outerRing.rotation.x=Math.PI/2;
 const grooveMaterial=physical(0x232a2f,.38,{metalness:.15,envMapIntensity:.4});
 const grooves=new THREE.InstancedMesh(new THREE.TorusGeometry(1,.004,4,128),grooveMaterial,16),grooveMatrix=new THREE.Matrix4(),grooveRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
 grooves.name='concentric-vinyl-grooves';for(let i=0;i<16;i++){const radius=.33+i*.025;grooveMatrix.compose(new THREE.Vector3(0,.018,0),grooveRotation,new THREE.Vector3(radius,radius,radius));grooves.setMatrixAt(i,grooveMatrix);}platter.add(grooves);
 cylinder(platter,'orange-center-label',.254,.014,orange,[0,.022,0],64);
 const label=canvasMap(512,512,(c,w,h)=>{
  c.fillStyle='#d36d2c';c.fillRect(0,0,w,h);c.strokeStyle='#f7e4b8';c.lineWidth=2;c.beginPath();c.arc(256,256,215,0,Math.PI*2);c.stroke();
  c.fillStyle='#714b30';c.textAlign='center';c.font='600 31px Arial';c.fillText('SUIHAO',256,170);c.font='18px Arial';c.fillText('WORKSPACE SESSIONS',256,325);c.font='15px monospace';c.fillText('SIDE A  /  33 RPM',256,355);
 });
 const printedLabel=part(platter,'printed-center-label',new THREE.CircleGeometry(.246,64),new THREE.MeshStandardMaterial({map:label,roughness:.64}),[0,.030,0]);printedLabel.rotation.x=-Math.PI/2;
 cylinder(platter,'center-spindle',.015,.05,armMetal,[0,.05,0],24);
 // Fixed bearing and an independently hinged bent tonearm, with a small replaceable cartridge.
 cylinder(deck,'tonearm-bearing',.095,.18,topCream,[.79,.32,-.49],40);
 cylinder(deck,'tonearm-bearing-cap',.086,.018,cream,[.79,.42,-.49],40);
 const toneArm=new THREE.Group();toneArm.name='hinged-tonearm';toneArm.position.set(.79,.425,-.49);deck.add(toneArm);
 tube(toneArm,'bent-metal-tonearm',[[0,0,0],[-.005,0,.23],[-.13,0,.40],[-.24,0,.52],[-.35,0,.65]],.026,armMetal);
 const cartridge=rounded(toneArm,'ivory-cartridge',[.13,.075,.245],topCream,[-.35,-.02,.65],.035);cartridge.rotation.y=-.25;
 rounded(toneArm,'cartridge-dark-underside',[.075,.018,.14],charcoal,[-.35,-.065,.67],.006);
 tube(toneArm,'stylus-needle',[[-.35,-.074,.70],[-.35,-.12,.71],[-.36,-.13,.72]],.005,armMetal);
 rounded(deck,'tonearm-rest',[.07,.095,.06],cream,[.87,.285,.08],.013);
 rounded(deck,'top-control-cross-wide',[.17,.022,.055],orange,[-.87,.238,.61],.008);
 rounded(deck,'top-control-cross-tall',[.055,.022,.17],orange,[-.87,.238,.61],.008);
 // Front controls follow the supplied cream/orange machine rather than the former radio.
 const knob=new THREE.Group();knob.name='volume-knob';knob.position.set(-.80,.005,.79);deck.add(knob);
 const knobBase=cylinder(knob,'orange-volume-knob',.135,.080,orange,[0,0,0],48);knobBase.rotation.x=Math.PI/2;
 rounded(knob,'volume-pointer',[.018,.095,.009],topCream,[0,.017,.045],.004);
 const indicatorMaterial=physical(0x7f9779,.27,{emissive:0x719861,emissiveIntensity:.05});
 const indicator=cylinder(deck,'play-status-light',.026,.014,indicatorMaterial,[-.44,-.015,.773],24);indicator.rotation.x=Math.PI/2;
 rounded(deck,'speaker-orange-surround',[.76,.16,.023],orange,[.19,-.016,.774],.011);
 rounded(deck,'speaker-dark-inset',[.68,.115,.026],charcoal,[.19,-.016,.790],.012);
 const grilleGeometry=new RoundedBoxGeometry(.012,.083,.006,2,.002),grille=new THREE.InstancedMesh(grilleGeometry,topCream,23),matrix=new THREE.Matrix4();
 grille.name='front-speaker-grille';for(let i=0;i<23;i++){matrix.makeTranslation(-.10+i*.026,-.016,.806);grille.setMatrixAt(i,matrix);}deck.add(grille);
 // Recessed side vents are modeled parts, not a full-machine picture.
 for(let i=0;i<6;i++)rounded(deck,'side-vent-'+i,[.008,.095,.023],seam,[1.098,.02,-.26+i*.105],.003);
 const badgeTexture=canvasMap(256,100,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#827962';c.font='500 38px Georgia';c.fillText('sh.',18,52);c.font='10px monospace';c.fillText('A LITTLE MUSIC',20,79);});
 const badge=part(deck,'turntable-designer-mark',new THREE.PlaneGeometry(.25,.10),new THREE.MeshBasicMaterial({map:badgeTexture,transparent:true,toneMapped:false}),[.80,-.005,.771]);badge.castShadow=false;
 const mechanics={speed:0,arm:0,volume:.4};let isPlaying=false,lastVolume=null;
 function setPlaying(value){
  if(isPlaying===value)return;isPlaying=value;
  gsap.to(mechanics,{speed:value?1:0,arm:value?1:0,duration:duration(value?.85:.65),ease:'power2.inOut',overwrite:'auto'});
  gsap.to(indicatorMaterial,{emissiveIntensity:value?.8:.05,duration:duration(.3),overwrite:true});
 }
 function setVolume(value){if(lastVolume===value)return;lastVolume=value;mechanics.volume=value;gsap.to(knob.rotation,{z:Math.PI*(.65-value*1.3),duration:duration(.3),ease:'power2.out',overwrite:true});}
 function update(delta,reduced){
  if(!reduced)platter.rotation.y+=Math.min(delta,.08)*(33/60*Math.PI*2)*mechanics.speed;
  toneArm.rotation.y=.20*(1-mechanics.arm);toneArm.rotation.x=-.10*(1-mechanics.arm);
 }
 setVolume(.4);update(0,true);
 root.userData.parts=[];root.traverse(node=>{if(node.isMesh)root.userData.parts.push(node.name);});
 return{root,platter,toneArm,knob,setPlaying,setVolume,update,supportFloor,
  state:()=>({model:root.userData.model,playing:isPlaying,speed:mechanics.speed,arm:mechanics.arm,volume:mechanics.volume,angle:platter.rotation.y,parts:root.userData.parts}),
  dispose(){gsap.killTweensOf(mechanics);gsap.killTweensOf(knob.rotation);gsap.killTweensOf(indicatorMaterial);}
 };
}
