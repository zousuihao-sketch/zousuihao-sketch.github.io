import {mountBadgeInteraction} from './badge-interaction.js';
import {mountQRCodeAssemble} from './qr-assemble.js';
import {gsap,duration} from './motion.js';

export function mountProfileContact(root,{onFlip}){
 const badge=root.querySelector('#flip-profile-badge'),stage=root.querySelector('#profile-qr-stage'),toggle=root.querySelector('#toggle-profile-qr');
 let alive=true,revision=0,desiredQR=false,badgeEffect=null,qrEffect=null;
 const contact=fetch('./assets/profile/contact.json').then(r=>{if(!r.ok)throw Error('contact');return r.json();}).then(v=>typeof v.text==='string'&&v.text?v.text:null).catch(()=>null);
 const staticFlip=()=>onFlip(badge.getAttribute('aria-pressed')!=='true');
 function fallback(){badge.dataset.badgeReady='fallback';badge.removeEventListener('click',staticFlip);badge.addEventListener('click',staticFlip);}
 badge.addEventListener('badge:fallback',fallback);
 try{badgeEffect=mountBadgeInteraction(badge,{onFlip});}catch{fallback();}
 root.dataset.mode='badge';
 function fadeBadge(visible){return new Promise(resolve=>{gsap.killTweensOf(badge);gsap.to(badge,{autoAlpha:visible?1:0,duration:duration(.18),ease:'power2.out',onComplete:()=>resolve(true),onInterrupt:()=>resolve(false)});});}
 function clearQR(){qrEffect?.dispose();qrEffect=null;stage.replaceChildren();stage.dataset.qrReady='false';}
 async function showQR(token){
  root.dataset.mode='opening';badge.inert=true;badge.setAttribute('aria-hidden','true');badgeEffect?.setVisible(false);
  stage.hidden=false;stage.inert=true;gsap.set(stage,{autoAlpha:0});clearQR();
  const faded=await fadeBadge(false);if(!faded||!alive||token!==revision)return;
  const text=await contact;if(!alive||token!==revision)return;
  if(text){try{qrEffect=mountQRCodeAssemble(stage,{text});}catch{qrEffect=null;}}
  if(!qrEffect){const image=new Image();image.src='./assets/profile/contact-qr.svg';image.alt='微信联系二维码';image.className='profile-qr-fallback';stage.append(image);stage.dataset.qrReady='true';stage.dataset.engine='original-contact-image';}
  gsap.set(stage,{autoAlpha:1});stage.inert=false;stage.setAttribute('aria-hidden','false');root.dataset.mode='qr';stage.focus({preventScroll:true});
 }
 async function showBadge(token){
  root.dataset.mode='closing';stage.inert=true;
  if(qrEffect)await qrEffect.close();if(!alive||token!==revision)return;
  clearQR();stage.hidden=true;stage.setAttribute('aria-hidden','true');badge.inert=false;badge.setAttribute('aria-hidden','false');badgeEffect?.setVisible(true);
  const faded=await fadeBadge(true);if(!faded||!alive||token!==revision)return;
  root.dataset.mode='badge';toggle.focus({preventScroll:true});
 }
 function setQR(value){
  if(!alive||value===desiredQR)return;desiredQR=value;const token=++revision;
  toggle.setAttribute('aria-expanded',String(value));toggle.setAttribute('aria-label',value?'返回工牌':'显示微信二维码');
  if(value)void showQR(token);else void showBadge(token);
 }
 const onToggle=()=>setQR(!desiredQR),onQRClick=()=>setQR(false);
 toggle.addEventListener('click',onToggle);stage.addEventListener('click',onQRClick);
 return {dispose(){if(!alive)return;alive=false;revision++;gsap.killTweensOf(badge);gsap.killTweensOf(stage);clearQR();badgeEffect?.dispose();badgeEffect=null;toggle.removeEventListener('click',onToggle);stage.removeEventListener('click',onQRClick);badge.removeEventListener('badge:fallback',fallback);badge.removeEventListener('click',staticFlip);}};
}
