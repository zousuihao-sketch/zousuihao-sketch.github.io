export const gsap=window.gsap;
if(!gsap)throw new Error('GSAP did not load.');
const query=matchMedia('(prefers-reduced-motion: reduce)');
export const duration=value=>query.matches?0:value;
export function revealContent(root){
 const children=[...root.children];gsap.killTweensOf(children);
 gsap.fromTo(children,{autoAlpha:0,y:duration(16)},{autoAlpha:1,y:0,duration:duration(.42),stagger:duration(.045),ease:'power2.out',clearProps:'opacity,visibility,transform'});
}
export function openDialog(dialog){
 gsap.killTweensOf(dialog);
 gsap.fromTo(dialog,{autoAlpha:0,y:duration(22),scale:query.matches?1:.96},{autoAlpha:1,y:0,scale:1,duration:duration(.38),ease:'power3.out',clearProps:'opacity,visibility,transform'});
}
export function dismissDialog(dialog,done){
 gsap.killTweensOf(dialog);
 gsap.to(dialog,{autoAlpha:0,y:duration(12),scale:query.matches?1:.985,duration:duration(.18),ease:'power2.in',onComplete:()=>{done();gsap.set(dialog,{clearProps:'opacity,visibility,transform'});}});
}
export function introducePage(){
 let played=false;const mm=gsap.matchMedia();
 mm.add({all:'(min-width: 0px)',reduce:'(prefers-reduced-motion: reduce)'},context=>{
  if(played)return;played=true;
  if(context.conditions.reduce)return;
  gsap.timeline({defaults:{ease:'power2.out'}})
   .fromTo('.header',{y:-10},{y:0,duration:.55,clearProps:'transform'},0)
   .fromTo('.intro > *',{autoAlpha:0,y:14},{autoAlpha:1,y:0,duration:.65,stagger:.1,clearProps:'all'},.15)
   .fromTo('.footer',{y:12},{y:0,duration:.6,clearProps:'transform'},.55);
 });
 return()=>mm.revert();
}
document.addEventListener('workspace:camera-shutter',()=>{
 const flash=document.getElementById('camera-flash');if(!flash||query.matches)return;
 gsap.timeline().fromTo(flash,{autoAlpha:0},{autoAlpha:.9,duration:.045}).to(flash,{autoAlpha:0,duration:.24,ease:'power2.out'});
});
