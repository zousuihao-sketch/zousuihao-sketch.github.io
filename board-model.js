import * as THREE from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {createWoodFramedPhotographPinboardModel} from './board-model.generated.js';

const stages=['blockout','structural-pass','form-refinement','material-pass','surface-pass','lighting-pass','interaction-pass','optimization-pass'];
const names=['water','sky','autumn','cafe','grass'];
const titles=['水边的小发现','抬头，是一片蓝','收集一点秋天','街角的暖光','风经过的地方'];
function orientMaterial(source,vertical=false,repeat=[1,1]){
 const material=source.clone();
 for(const key of ['map','normalMap','roughnessMap'])if(source[key]){
  const t=source[key].clone();t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.repeat.set(...repeat);t.center.set(.5,.5);t.rotation=vertical?Math.PI/2:0;material[key]=t;
 }
 return material;
}
/** Refines the skill-generated component tree; each photograph remains a named part. */
export async function createPinboard({materials,pass='optimization-pass',anisotropy=4}={}){
 const level=stages.indexOf(pass),materialOverrides=level>=7&&materials?{base:new THREE.MeshBasicMaterial({visible:false}),frame:materials.oak,cork:materials.cork,photos:materials.paper,tape:materials.tape}:undefined;
 const model=createWoodFramedPhotographPinboardModel({textureSize:512,textureAnisotropy:anisotropy,materialOverrides});
 const runtime=model.userData.sculptRuntime;
 for(const [id,mesh] of Object.entries(runtime.meshes)){
  if(id==='root'){mesh.visible=false;continue;}
  const size=new THREE.Vector3();mesh.geometry.computeBoundingBox();mesh.geometry.boundingBox.getSize(size);
  if(level>=2){const old=mesh.geometry;mesh.geometry=new RoundedBoxGeometry(size.x,size.y,size.z,2,id.startsWith('rail-')?.009:id==='cork'?.006:.002);old.dispose();}
  if(level>=3&&materials){mesh.material=id.startsWith('rail-')?materials.oak:id==='cork'?materials.cork:id.startsWith('tape-')?materials.tape:materials.paper;}
  if(level>=4&&materials){
   if(id.startsWith('rail-'))mesh.material=orientMaterial(materials.oak,id==='rail-east'||id==='rail-west');
   if(id==='cork')mesh.material=orientMaterial(materials.cork,false,[3,8]);
  }
  mesh.castShadow=mesh.receiveShadow=true;
 }
 if(level>=3){
  const loader=new THREE.TextureLoader();
  await Promise.all(names.map(async(name,index)=>{
   const id='photo-'+name,node=runtime.nodes[id],paper=runtime.meshes[id],size=new THREE.Vector3();paper.geometry.computeBoundingBox();paper.geometry.boundingBox.getSize(size);
   const t=await loader.loadAsync('./assets/materials/'+id+'.webp');t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=anisotropy;
   const aspect=(size.x-.075)/(size.y-.115),imageAspect=t.image.width/t.image.height;
   if(aspect<imageAspect){t.repeat.x=aspect/imageAspect;t.offset.x=(1-t.repeat.x)/2;}else{t.repeat.y=imageAspect/aspect;t.offset.y=(1-t.repeat.y)/2;}
   const print=new THREE.Mesh(new THREE.PlaneGeometry(size.x-.075,size.y-.115),new THREE.MeshPhysicalMaterial({map:t,roughness:.39,clearcoat:.22,clearcoatRoughness:.34,side:THREE.DoubleSide}));
   print.name=id+'__print';print.position.set(0,.015,size.z/2+.001);print.userData.explodeWithParent=true;print.receiveShadow=true;node.add(print);
   node.userData.photoIndex=index;node.userData.title=titles[index];
  }));
 }
 if(level>=6){
  for(const name of names){
   const id='photo-'+name,node=runtime.nodes[id],mesh=runtime.meshes[id];mesh.geometry.computeBoundingBox();const h=mesh.geometry.boundingBox.max.y-mesh.geometry.boundingBox.min.y;
   const top=new THREE.Vector3(0,h/2,0).applyEuler(node.rotation);node.position.add(top);
   for(const child of node.children)child.position.y-=h/2;
   if(runtime.colliders[id])runtime.colliders[id].offset=[0,-h/2,0];
   node.userData={...node.userData,id,title:titles[names.indexOf(name)],baseY:node.position.y,baseZ:node.position.z,baseRotation:node.rotation.z,hover:0,reveal:1,photoIndex:names.indexOf(name)};
   node.userData.basePosition=node.position.clone();
  }
 }
 for(const node of Object.values(runtime.nodes))node.userData.basePosition=node.position.clone();
 return model;
}
