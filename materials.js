import * as THREE from './vendor/three.module.js';

function surface(seed,kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d'),data=c.createImageData(256,256);
 let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){let value=128+(random()-.5)*40;
  if(kind==='cloth')value+=Math.sin(x*Math.PI/2)*20+Math.sin(y*Math.PI/2)*18;
  if(kind==='brushed')value=145+Math.sin(y*2)*6+(random()-.5)*15;
  const i=(y*256+x)*4;data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=255;
 }c.putImageData(data,0,0);const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='cloth'?12:3,kind==='cloth'?12:3);return t;
}
export async function createStudioMaterials(renderer){
 const loader=new THREE.TextureLoader();const maxAnisotropy=renderer.capabilities.getMaxAnisotropy();
 async function texture(url,color=false,repeat=[1,1]){const t=await loader.loadAsync(url);if(color)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=maxAnisotropy;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);return t;}
 const [woodColor,woodRough,woodNormal,corkColor,corkRough,corkNormal,ashColor,ashHeight]=await Promise.all([
  texture('./assets/materials/wood/frame_albedo.png',true),texture('./assets/materials/wood/frame_roughness.png'),texture('./assets/materials/wood/frame_normal.png'),
  texture('./assets/materials/cork/cork_albedo.png',true,[3,8]),texture('./assets/materials/cork/cork_roughness.png',false,[3,8]),texture('./assets/materials/cork/cork_normal.png',false,[3,8]),
  texture('./assets/materials/ash-color.webp',true),texture('./assets/materials/ash-height.webp')]);
 for(const t of [woodColor,woodRough,woodNormal,corkColor,corkRough,corkNormal])t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;
 const brushed=surface(18,'brushed'),cloth=surface(57,'cloth'),rubberGrain=surface(123,'rubber'),roughness=surface(291,'roughness');
 const physical=(color,roughness,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,metalness:0,...extra});
 const M={
  aluminum:physical(0xc5cbd0,.26,{metalness:1,roughnessMap:brushed,envMapIntensity:1.2}),
  darkMetal:physical(0x3c454c,.26,{metalness:1,roughnessMap:brushed,envMapIntensity:1.25}),
  graphite:physical(0x31383e,.64,{bumpMap:rubberGrain,bumpScale:.006,roughnessMap:roughness}),
  rubber:physical(0x242c30,.91,{bumpMap:rubberGrain,bumpScale:.006}),
  powderWhite:physical(0xe9eae6,.52,{clearcoat:.14,clearcoatRoughness:.6}),
  enamelSage:physical(0x83998d,.29,{clearcoat:.75,clearcoatRoughness:.2}),
  ceramic:physical(0xe9ddc7,.18,{clearcoat:.9,clearcoatRoughness:.12}),
  blueFabric:physical(0x718b9b,.94,{bumpMap:cloth,bumpScale:.017,sheen:.7,sheenColor:0x9bafba,sheenRoughness:.9,roughnessMap:roughness}),
  deskFelt:physical(0xa9b0a6,.98,{bumpMap:cloth,bumpScale:.009,sheen:.5,sheenColor:0xe1e6d7}),
  lens:physical(0x182c3b,.07,{metalness:.2,clearcoat:1,clearcoatRoughness:.025,ior:1.52,envMapIntensity:2.5}),
  oak:physical(0xffffff,.53,{map:woodColor,roughnessMap:woodRough,normalMap:woodNormal,normalScale:new THREE.Vector2(.3,.3),clearcoat:.16,clearcoatRoughness:.7}),
  ash:physical(0xf0e8d8,.72,{map:ashColor,bumpMap:ashHeight,bumpScale:.0015}),
  cork:physical(0xe8c9a4,.96,{map:corkColor,roughnessMap:corkRough,normalMap:corkNormal,normalScale:new THREE.Vector2(.32,.32)}),
  paper:physical(0xfffcf5,.64,{clearcoat:.1,clearcoatRoughness:.42}),
  tape:physical(0xe3d7ba,.83,{transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}),
 };
 return M;
}
