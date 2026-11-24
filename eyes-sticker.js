// The original monitor eyes, drawn into the peel component's front texture.
// Both pupils and eyelids therefore curl and travel with the paper itself.
export function createEyesArtwork() {
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=336;
  const c=canvas.getContext('2d');
  let version=0,lastX=Infinity,lastY=Infinity,lastBlink=Infinity,lid=1,lastTime=0;
  const gaze={x:0,y:0,blink:1};
  function draw(x,y,blink) {
    if(Math.abs(x-lastX)<.0002&&Math.abs(y-lastY)<.0002&&Math.abs(blink-lastBlink)<.004)return;
    lastX=x;lastY=y;lastBlink=blink;Object.assign(gaze,{x,y,blink});
    c.clearRect(0,0,canvas.width,canvas.height);
    c.save();c.translate(192,168);c.scale(1000,1000);c.rotate(.16);
    for(const [ex,ey] of [[-.075,.018],[.075,-.018]]) {
      c.save();c.translate(ex,ey);c.scale(1,blink);
      c.fillStyle='#343b34';c.beginPath();c.ellipse(0,0,.13*.64,.13,0,0,Math.PI*2);c.fill();
      c.fillStyle='#fff7de';c.beginPath();c.ellipse(0,0,.122*.64,.122,0,0,Math.PI*2);c.fill();
      c.fillStyle='#263540';c.beginPath();c.ellipse(x,-y,.046*.78,.046,0,0,Math.PI*2);c.fill();
      c.restore();
    }
    c.restore();version++;
  }
  draw(.009,-.012,1);
  return {
    canvas,
    update(now,point,center,width,reduced,sleeping=false) {
      if(!Number.isFinite(point.x+point.y+center.x+center.y+width))return;
      const dx=point.x-center.x,dy=center.y-point.y;
      const reach=Math.max(160,width*5);
      const x=reduced?.009:Math.max(-.024,Math.min(.024,dx/reach*.024));
      const y=reduced?-.012:Math.max(-.035,Math.min(.025,dy/reach*.034));
      const phase=now/1000%(sleeping?8:6.7);
      const target=reduced?1:sleeping?(.62+Math.sin(now/1900)*.055)*(phase>7.5?Math.max(.12,Math.abs(phase-7.75)/.25):1):phase>6.45?Math.max(.12,Math.abs(phase-6.575)/.125):1;
      const dt=lastTime?Math.min(.1,(now-lastTime)/1000):1/30;lastTime=now;
      lid=reduced?1:lid+(target-lid)*(1-Math.exp(-dt/(sleeping?.16:.055)));
      draw(x,y,lid);
    },
    get version(){return version;},
    inspect:()=>({...gaze,version})
  };
}
