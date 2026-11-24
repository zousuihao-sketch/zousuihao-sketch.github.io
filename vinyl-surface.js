// One cached, high-resolution surface. Groove texture rotates; lighting stays in the room.
let cached;
export function vinylSurface(){
 if(cached)return cached;
 const size=1536,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const context=canvas.getContext('2d');if(!context)return null;
 const pixels=context.createImageData(size,size),data=pixels.data,center=(size-1)/2;
 let seed=17463;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const p=(y*size+x)*4,r=Math.hypot(x-center,y-center)/center;
  if(r>1)continue;
  const radius=r*center;
  let value=21+(random()-.5)*4;
  if(r>.365&&r<.978){
   // Fine, low-contrast pressing grooves with irregular spacing and quieter track bands.
   value+=Math.sin(radius*1.55+Math.sin(radius*.021)*.4)*4+Math.sin(radius*2.13)*1.2;
   value+=Math.sin(radius*.066)*.7;
   for(const band of [.475,.643,.812,.951])value-=3.2*Math.exp(-Math.pow((r-band)/.0014,2));
  }else if(r>.3&&r<.365){value=12+(random()-.5)*1.8;}
  value-=5*Math.exp(-Math.pow((r-.35)/.003,2));
  value+=28*Math.exp(-Math.pow((r-.994)/.0028,2));
  value-=8*Math.exp(-Math.pow((r-.984)/.004,2));
  data[p]=data[p+1]=data[p+2]=Math.max(0,Math.min(255,Math.round(value)));data[p+3]=255;
 }
 context.putImageData(pixels,0,0);
 const surface=canvas.toDataURL('image/png');
 const paper=document.createElement('canvas');paper.width=paper.height=160;
 const paperContext=paper.getContext('2d');if(!paperContext){cached={surface,paper:null};return cached;}
 const grain=paperContext.createImageData(160,160);
 for(let p=0;p<grain.data.length;p+=4){const v=35+Math.round((random()-.5)*9);grain.data[p]=grain.data[p+1]=grain.data[p+2]=v;grain.data[p+3]=255;}
 paperContext.putImageData(grain,0,0);cached={surface,paper:paper.toDataURL('image/png')};return cached;
}
