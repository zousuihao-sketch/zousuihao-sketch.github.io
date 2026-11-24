// Canvas bridge for the user's Originkit Signature, so it remains inside the 3D glass.
// The original outlines, per-letter masks, pen lead and constant writing speed are retained.
import {layout,STROKES,EM,REVEAL,PEN_LEAD} from './signature-data.js';

const clamp=n=>Math.max(0,Math.min(1,n));
function centerline(d){
 const node=document.createElementNS('http://www.w3.org/2000/svg','path');node.setAttribute('d',d);
 const length=node.getTotalLength(),steps=Math.max(2,Math.ceil(length/1.5)),points=[];
 for(let i=0;i<=steps;i++){const p=node.getPointAtLength(length*i/steps);points.push([p.x,p.y]);}
 return points;
}
function line(ctx,stroke,t,width){
 if(t<=0)return;
 ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...stroke.points[0]);
 const index=t*(stroke.points.length-1),end=Math.floor(index);
 for(let i=1;i<=end;i++)ctx.lineTo(...stroke.points[i]);
 if(end<stroke.points.length-1){const a=stroke.points[end],b=stroke.points[end+1],f=index-end;ctx.lineTo(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f);}
 ctx.stroke();
}
export function createSignatureRenderer(){
 const cache=new Map(),mask=document.createElement('canvas'),pen=document.createElement('canvas');
 const mc=mask.getContext('2d'),pc=pen.getContext('2d');
 function plan(text){
  if(cache.has(text))return cache.get(text);
  const {placed,box}=layout(text);let total=0;
  const letters=placed.map(g=>{
   const strokes=(STROKES[g.ch]||[]).map(([w,len,d])=>{const s={w,len,d,at:total,points:centerline(d)};total+=len;return s;});
   return {...g,path:new Path2D(g.d),strokes,end:total};
  });
  const result={text,letters,box,total:Math.max(1,total)};cache.set(text,result);return result;
 }
 function draw(ctx,p,{x=220,y=185,width=760,height=290,progress=0,duration=3,stagger=0,delay=0,ink='#52665b',outline=true}={}){
  const pad=EM*REVEAL*.5,b=p.box,scale=Math.min(width/(b.w+2*pad),height/(b.h+2*pad));
  const ox=x+(width-b.w*scale)/2-b.x*scale,oy=y+(height-b.h*scale)/2-b.y*scale;
  const elapsed=clamp(progress)*duration,speed=p.total/Math.max(.05,duration),complete=progress>=1;
  function transform(c,g){c.translate(ox,oy);c.scale(scale,scale);c.translate(g.x,0);c.lineCap='round';c.lineJoin='round';}
  function timing(s,i,lead=0){const start=Math.max(0,delay+s.at/speed+i*stagger-lead);return complete?1:clamp((elapsed-start)/Math.max(.001,s.len/speed));}
  function finished(g,i,lead=0){return complete||elapsed>=Math.max(0,delay+g.end/speed+i*stagger-lead);}
  if(outline){
   if(mask.width!==ctx.canvas.width||mask.height!==ctx.canvas.height){mask.width=pen.width=ctx.canvas.width;mask.height=pen.height=ctx.canvas.height;}
   for(let i=0;i<p.letters.length;i++){
    const g=p.letters[i];
    if(finished(g,i,PEN_LEAD)){ctx.save();transform(ctx,g);ctx.strokeStyle=ink;ctx.lineWidth=1.5/scale;ctx.stroke(g.path);ctx.restore();continue;}
    if(!g.strokes.some(s=>timing(s,i,PEN_LEAD)>0))continue;
    mc.clearRect(0,0,mask.width,mask.height);pc.clearRect(0,0,pen.width,pen.height);
    mc.save();transform(mc,g);mc.strokeStyle='#fff';for(const s of g.strokes)line(mc,s,timing(s,i,PEN_LEAD),s.w+8);mc.restore();
    pc.save();transform(pc,g);pc.strokeStyle=ink;pc.lineWidth=1.5/scale;pc.stroke(g.path);pc.restore();
    pc.save();pc.globalCompositeOperation='destination-in';pc.drawImage(mask,0,0);pc.restore();ctx.drawImage(pen,0,0);
   }
  }
  // Each glyph clips only its own ink, matching the component's separate SVG masks.
  for(let i=0;i<p.letters.length;i++){
   const g=p.letters[i];ctx.save();transform(ctx,g);ctx.fillStyle=ctx.strokeStyle=ink;
   if(finished(g,i)){ctx.fill(g.path);}else{ctx.clip(g.path);for(const s of g.strokes)line(ctx,s,timing(s,i),s.w);}
   ctx.restore();
  }
 }
 return {plan,draw,dispose(){cache.clear();mask.width=pen.width=1;mask.height=pen.height=1;}};
}
