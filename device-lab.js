import * as THREE from './vendor/three.module.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {createStudioMaterials} from './materials.js';
import {createReferenceComputer,createReferenceTurntable} from './devices.js';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xf5f5f1);const pmrem=new THREE.PMREMGenerator(renderer),env=new RoomEnvironment();scene.environment=pmrem.fromScene(env,.04).texture;scene.environmentIntensity=.6;env.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xffffff,0xbfc6b4,1.6));const sun=new THREE.DirectionalLight(0xfffbf0,2.4);sun.position.set(-5.5,9,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-4;sun.shadow.camera.right=4;sun.shadow.camera.top=4;sun.shadow.camera.bottom=-4;sun.shadow.bias=-.0001;scene.add(sun);const fill=new THREE.DirectionalLight(0xd8e9f2,.65);fill.position.set(8,5,5);scene.add(fill);
const M=await createStudioMaterials(renderer),params=new URLSearchParams(location.search),kind=params.get('kind')||'turntable';
const screenCanvas=document.createElement('canvas');screenCanvas.width=1200;screenCanvas.height=680;const c=screenCanvas.getContext('2d');c.fillStyle='#f2f4ee';c.fillRect(0,0,1200,680);c.fillStyle='#52665b';c.font='bold 60px Microsoft YaHei';c.fillText('把想法，做成好体验。',80,280);c.font='25px Arial';c.fillText('SUIHAO / SELECTED WORK',80,100);const screenTexture=new THREE.CanvasTexture(screenCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;
const device=kind==='computer'?createReferenceComputer({materials:M,screenTexture}):createReferenceTurntable({materials:M});scene.add(device.root);device.root.rotation.y=Number(params.get('angle')||0)*Math.PI/180;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0xf1f0e9,roughness:.9}));ground.rotation.x=-Math.PI/2;ground.position.y=kind==='computer'?-1.547:-.315;ground.receiveShadow=true;scene.add(ground);
const camera=new THREE.OrthographicCamera(-2.6,2.6,1.9,-1.9,.1,30);camera.position.set(0,kind==='computer'?1.4:1.35,8);camera.lookAt(0,kind==='computer'?-.15:0,0);
if(kind==='turntable'){camera.left=-1.6;camera.right=1.6;camera.top=1.17;camera.bottom=-1.17;camera.updateProjectionMatrix();}
if(params.get('playing')==='1')device.setPlaying?.(true);
const clock=new THREE.Clock();let last=0;
function render(){const elapsed=clock.getElapsedTime();device.update?.(elapsed-last,false);last=elapsed;renderer.render(scene,camera);requestAnimationFrame(render);}render();
window.lab={device,scene,renderer,camera};document.body.dataset.ready='true';
