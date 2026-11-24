import * as THREE from './vendor/three.module.js';
import {createPhoneStandby} from './phone-standby.js';

// Body dimensions follow the iPhone 15 Pro's ~1:2.08 silhouette.
export function createDeskPhone({materials:M}){
 const root=new THREE.Group();root.name='iphone-titanium-with-stand';
 const width=.92,height=1.91,depth=.108,phoneScale=.76;
 const physical=(color,roughness,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,...extra});
 const titanium=M.aluminum.clone();titanium.color.set('#c5c4bf');titanium.roughness=.36;titanium.envMapIntensity=.8;
 const edge=physical('#e3e1db',.24,{metalness:1,envMapIntensity:.7});
 const black=physical('#101316',.25,{clearcoat:.9,clearcoatRoughness:.13});
 const back=physical('#dfded8',.48,{clearcoat:.32,clearcoatRoughness:.28});
 const cream=physical('#f2eee3',.48,{clearcoat:.14,clearcoatRoughness:.45});
 const rubber=physical('#827d70',.9),orange=physical('#d98446',.5);
 const standMetal=physical('#c8c5ba',.41,{metalness:.55,envMapIntensity:.65});
 function outline(w,h,r){
  const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
 }
 function slab(parent,name,w,h,d,r,material,position=[0,0,0],bevel=.003){
  const g=new THREE.ExtrudeGeometry(outline(w,h,r),{depth:d,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:12});g.translate(0,0,-d/2);
  const m=new THREE.Mesh(g,material);m.name=name;m.position.set(...position);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
 }
 const base=slab(root,'stand-base',1.0,.76,.075,.16,cream,[0,.045,.03],.012);base.rotation.x=-Math.PI/2;
 const pad=slab(root,'stand-base-pad',.86,.62,.014,.13,rubber,[0,.006,.03]);pad.rotation.x=-Math.PI/2;
 // Expose the stem beneath the smaller handset instead of hiding it behind the glass.
 slab(root,'stand-upright',.19,.32,.11,.045,standMetal,[0,.24,-.07],.007);
 const cradle=slab(root,'stand-cradle',.67,.08,.31,.035,cream,[0,.38,.055],.008);
 slab(root,'stand-contact-pad',.53,.014,.24,.007,rubber,[0,.427,.06],.002);
 const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.058,.058,.032,32),standMetal);hinge.name='stand-hinge';hinge.rotation.x=Math.PI/2;hinge.position.set(0,.31,.011);hinge.castShadow=true;root.add(hinge);
 slab(root,'stand-orange-detail',.13,.026,.008,.009,orange,[0,.09,.412],.002);
 const phone=new THREE.Group();phone.name='iphone-body';phone.scale.setScalar(phoneScale);phone.position.set(0,.435+height*phoneScale/2,-.015);phone.rotation.set(-.10,-.17,0);root.add(phone);
 slab(phone,'titanium-frame',width,height,depth,.135,titanium,[0,0,0],.006);
 slab(phone,'rear-matte-glass',width-.035,height-.035,.014,.124,back,[0,0,-depth/2-.003],.004);
 slab(phone,'glass-polished-edge',width-.012,height-.012,.008,.134,edge,[0,0,depth/2-.003],.003);
 slab(phone,'front-black-glass',width-.025,height-.025,.012,.130,black,[0,0,depth/2+.004],.003);
 const standby=createPhoneStandby();
 const texture=new THREE.CanvasTexture(standby.canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const displayMaterial=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
 const screenW=.852,screenH=screenW*1624/750;
 const geometry=new THREE.ShapeGeometry(outline(screenW,screenH,.112),24);
 const uv=geometry.getAttribute('uv'),positions=geometry.getAttribute('position');for(let i=0;i<uv.count;i++)uv.setXY(i,positions.getX(i)/screenW+.5,positions.getY(i)/screenH+.5);
 const screen=new THREE.Mesh(geometry,displayMaterial);screen.name='phone-display';screen.position.z=depth/2+.019;phone.add(screen);
 // A restrained fixed window reflection, separate from the lit display artwork.
 const sheen=document.createElement('canvas');sheen.width=256;sheen.height=512;const sc=sheen.getContext('2d'),g=sc.createLinearGradient(0,0,256,512);g.addColorStop(0,'rgba(255,255,255,.13)');g.addColorStop(.36,'rgba(255,255,255,.02)');g.addColorStop(1,'rgba(255,255,255,0)');sc.fillStyle=g;sc.fillRect(0,0,256,512);
 const sheenTexture=new THREE.CanvasTexture(sheen);const reflection=new THREE.Mesh(geometry.clone(),new THREE.MeshBasicMaterial({map:sheenTexture,transparent:true,depthWrite:false,toneMapped:false}));reflection.name='phone-screen-reflection';reflection.position.z=depth/2+.020;phone.add(reflection);
 slab(phone,'dynamic-island',.277,.071,.005,.035,black,[0,screenH/2-.069,depth/2+.023],.001);
 slab(phone,'power-button',.027,.20,.043,.009,titanium,[width/2+.008,.23,0],.002);
 slab(phone,'volume-up',.027,.115,.04,.009,titanium,[-width/2-.008,.35,0],.002);
 slab(phone,'volume-down',.027,.115,.04,.009,titanium,[-width/2-.008,.18,0],.002);
 slab(phone,'action-button',.026,.066,.04,.008,titanium,[-width/2-.008,.56,0],.002);
 for(const x of [-1,1])for(const y of [-.74,.74])slab(phone,'antenna-band',.013,.022,.108,.003,back,[x*(width/2-.005),y,0],0);
 const parts=[];root.traverse(node=>{if(node.isMesh)parts.push(node.name);});
 return {root,screen,update(now,options){if(standby.update(now,options))texture.needsUpdate=true;},state:()=>({model:root.name,body:{width:width*phoneScale,height:height*phoneScale,depth:depth*phoneScale},phoneScale,stand:{stemHeight:.32,cradleHeight:.38,bodyBottom:.435},parts,previewLoaded:standby.state().artLoaded,standby:standby.state()}),dispose(){standby.dispose();texture.dispose();sheenTexture.dispose();}};
}
