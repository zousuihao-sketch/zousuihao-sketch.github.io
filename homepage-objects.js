import * as THREE from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {photographs,pinboardPhotographs} from './photographs.js';

function slab(parent,name,w,h,d,material,x=0,y=0,z=0,r=.025){
 const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,d/3)),material);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
function print(parent,name,w,h,texture,x=0,y=0,z=0){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false}));m.name=name;m.position.set(x,y,z);parent.add(m);return m;
}
function textureFromCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
// Crop by texture UV: keep the approved portrait and original contact code intact.
function cropTexture(source,x,y,w,h){const t=source.clone();t.repeat.set(w/source.image.width,h/source.image.height);t.offset.set(x/source.image.width,1-(y+h)/source.image.height);t.needsUpdate=true;return t;}

export async function createPortraitBadge({materials:M,loadTexture}){
 const root=new THREE.Group();root.name='portrait-badge';
 const [front,back]=await Promise.all([loadTexture('./assets/profile/badge-front.png'),loadTexture('./assets/profile/badge-back.png')]);
 if(!front||!back)throw Error('Approved badge artwork could not load');
 const frontPrint=cropTexture(front,137,414,763,1052),backPrint=cropTexture(back,110,401,836,1017);
 const white=M.paper.clone();white.color.set(0xffffff);
 const strap=M.blueFabric.clone();strap.color.set(0xe9e4db);strap.sheenColor.set(0xffffff);
 slab(root,'white-woven-lanyard',.115,.40,.015,strap,0,-.20,0);
 const mark=textureFromCanvas(256,96,c=>{c.fillStyle='#202421';c.font='bold 45px Arial';c.textAlign='center';c.fillText('suihao.',128,67);});
 print(root,'lanyard-wordmark',.09,.034,mark,0,-.23,.009);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.072,.009,8,36),M.aluminum);ring.position.set(0,-.42,.015);root.add(ring);
 slab(root,'silver-clip',.035,.12,.028,M.aluminum,0,-.52,.025);
 const card=slab(root,'small-id-card',.57,.78,.024,white,0,-.95,.018,.035);
 const face=print(root,'approved-badge-front',.57,.78,frontPrint,0,-.95,.032);
 const reverse=print(root,'approved-badge-back',.57,.78,backPrint,0,-.95,.004);reverse.rotation.y=Math.PI;
 return{root,card,face,reverse};
}

export function createMonitorEyes(){
 const root=new THREE.Group();root.name='curious-monitor-eyes';root.rotation.z=-.16;
 const pupils=[],lids=[];
 for(const [x,y] of [[-.075,-.018],[.075,.018]]){
  const eye=new THREE.Group();eye.position.set(x,y,0);root.add(eye);lids.push(eye);
  for(const [r,color,z,sx,sy] of [[.13,0x343b34,0,.64,1],[.122,0xfff7de,.012,.64,1]]){
   const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,20),new THREE.MeshBasicMaterial({color}));m.scale.set(sx,sy,.14);m.position.z=z;eye.add(m);
  }
  const pupil=new THREE.Mesh(new THREE.SphereGeometry(.046,20,16),new THREE.MeshBasicMaterial({color:0x263540}));pupil.scale.set(.78,1,.3);pupil.position.set(.015,-.023,.037);eye.add(pupil);pupils.push(pupil);
 }
 return{root,update(x,y,elapsed,reduced){
  const phase=elapsed%6.7,blink=!reduced&&phase>6.45?Math.max(.12,Math.abs(phase-6.575)/.125):1;
  for(const lid of lids)lid.scale.y=blink;
  for(const pupil of pupils){pupil.position.x=reduced?.009:THREE.MathUtils.clamp(x*.024,-.024,.024);pupil.position.y=reduced?-.012:THREE.MathUtils.clamp(y*.034,-.035,.025);}
 }};
}

export async function createCompactPinboard({materials:M,loadTexture}){
 const root=new THREE.Group();root.name='three-photo-board';const meshes={},nodes={},photos=[];
 const add=(name,w,h,d,mat,x,y,z)=>meshes[name]=slab(root,name,w,h,d,mat,x,y,z);
 add('cork',2.02,1.22,.05,M.cork,0,0,.02);
 add('rail-north',2.2,.075,.10,M.ash,0,.66,.025);add('rail-south',2.2,.075,.10,M.ash,0,-.66,.025);
 add('rail-west',.075,1.25,.10,M.ash,-1.0625,0,.025);add('rail-east',.075,1.25,.10,M.ash,1.0625,0,.025);
 const config=[{x:-.66,y:.11,r:.07},{x:0,y:.16,r:-.04},{x:.66,y:.07,r:.055}];
 await Promise.all(config.map(async({x,y,r},slot)=>{
  const photograph=pinboardPhotographs[slot],name=photograph.file,index=photographs.indexOf(photograph);
  const t=await loadTexture('./assets/photos/'+name+'.webp');if(!t)throw Error('Photo could not load: '+name);
  const node=new THREE.Group();node.position.set(x,y+.46,.075);node.rotation.z=r;root.add(node);
  node.userData={id:'photo-'+name,title:photograph.title,baseY:node.position.y,baseZ:node.position.z,baseRotation:r,hover:0,reveal:1,photoIndex:index};
  const paper=slab(node,'photo-'+name,.56,.85,.012,M.paper,0,-.425,0,.006);meshes['photo-'+name]=paper;
  const iw=t.image.width,ih=t.image.height,aspect=.49/.66;let w=iw,h=ih;if(iw/ih>aspect)w=ih*aspect;else h=iw/aspect;
  const photo=print(node,'photo-'+name+'__print',.49,.66,cropTexture(t,(iw-w)/2,(ih-h)/2,w,h),0,-.38,.008);photo.receiveShadow=true;
  slab(node,'tape-'+name,.19,.12,.006,M.tape,0,-.005,.02,.003);
  nodes['photo-'+name]=node;photos.push(node);
 }));
 root.userData.sculptRuntime={nodes,meshes};return{root,photos};
}

export async function createResumeSheet({materials:M,loadTexture}){
 const root=new THREE.Group();root.name='resume-sheet';const resume=await loadTexture('./assets/profile/resume.png');
 const t=textureFromCanvas(1400,810,c=>{
  c.fillStyle='#fffffb';c.fillRect(0,0,1400,810);
  if(resume){const image=resume.image,fit=Math.min(790/image.width,1380/image.height),w=image.width*fit,h=image.height*fit;c.translate(700,405);c.rotate(-Math.PI/2);c.drawImage(image,-w/2,-h/2,w,h);}
 });
 slab(root,'resume-paper',1.42,.009,.83,M.paper);
 const page=print(root,'original-resume',1.40,.81,t,0,.006,0);page.rotation.x=-Math.PI/2;root.rotation.y=-.10;
 return root;
}
