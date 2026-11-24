import * as THREE from './vendor/three.module.js';
import {createWoodFramedPhotographPinboardModel,createWoodFramedPhotographPinboardEnvironment} from './board-model.generated.js';
import {createPinboard} from './board-model.js';
import {createStudioMaterials} from './materials.js';
const canvas=document.querySelector('canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x28333b);scene.environment=createWoodFramedPhotographPinboardEnvironment(renderer);scene.environmentIntensity=.55;
const pass=new URLSearchParams(location.search).get('pass')||'blockout';
const materials=await createStudioMaterials(renderer);
const model=await createPinboard({materials,pass,anisotropy:8});scene.add(model);
if(pass==='blockout'){model.traverse(object=>{if(!object.isMesh)return;const id=object.userData.sculptComponent?.id||object.name;if(id.startsWith('photo-')||id.startsWith('tape-'))object.visible=false;else if(id!=='root')object.material=new THREE.MeshStandardMaterial({color:0x7b7468,roughness:.8});});}
scene.add(new THREE.HemisphereLight(0xffffff,0xb2a891,1.8));const key=new THREE.DirectionalLight(0xfff6e7,2.3);key.position.set(-3,5,7);scene.add(key);
const lightMode=new URLSearchParams(location.search).get('light')||'reference-match';
if(lightMode==='neutral'){key.color.set(0xffffff);key.position.set(-3,4,8);scene.environmentIntensity=.7;}
if(lightMode==='grazing'){key.color.set(0xffffff);key.position.set(-5,1,1);key.intensity=3.5;scene.environmentIntensity=.18;scene.children.find(o=>o.isHemisphereLight).intensity=.4;}
if(['lighting-pass','interaction-pass','optimization-pass'].includes(pass)){
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=1.5;key.shadow.camera.bottom=-1.5;key.shadow.normalBias=.001;key.shadow.bias=-.0001;key.shadow.radius=2;
 scene.children.find(o=>o.isHemisphereLight).intensity=lightMode==='grazing'?.3:.85;scene.environmentIntensity=lightMode==='grazing'?.18:.45;
}
const angle=Number(new URLSearchParams(location.search).get('angle')||0);model.rotation.y=THREE.MathUtils.degToRad(angle);
if(new URLSearchParams(location.search).get('action')==='lift'){
 const photo=model.userData.sculptRuntime.nodes['photo-water'];photo.rotation.x=-.30;photo.position.z+=.12;
}
const camera=new THREE.OrthographicCamera(-1.535,1.535,1.0233,-1.0233,.1,30);camera.position.set(0,0,5);camera.lookAt(0,0,0);
function render(){renderer.render(scene,camera);requestAnimationFrame(render);}render();
setTimeout(()=>document.body.dataset.ready='true',800);
window.lab={model,renderer,scene,camera,parts:()=>Object.entries(model.userData.sculptRuntime.meshes).map(([id,m])=>({id,meshName:m.name,uuid:m.uuid})),explode(amount){for(const obj of Object.values(model.userData.sculptRuntime.nodes)){if(obj.userData.basePosition)obj.position.copy(obj.userData.basePosition).multiplyScalar(1+amount);}}};
