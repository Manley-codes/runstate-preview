import { useEffect, useRef } from 'react';

type Props = { size?: number; intakeElapsed?: number | null; className?: string };

/** Direct port of ui/RunAgentVisualizer.kt. Motion is decorative, not audio analysis. */
export function NativeAgentRing({size=104,intakeElapsed=null,className}:Props) {
  const lines=useRef<(SVGLineElement|null)[]>([]);
  const receipt=useRef(intakeElapsed);
  receipt.current=intakeElapsed;
  const barWidth=Math.max(1,Math.min(1.4,size*.014));
  const units=(size-barWidth)/(2*(264+79.8*1.8));
  const radius=264*units;
  const values=(index:number,phase:number,time:number|null)=>{
    const theta=index*2*Math.PI/76,angle=theta-Math.PI/2;
    const fraction=time===null?null:(time-1010)/620;
    const swell=fraction!==null&&fraction>=0&&fraction<=1?Math.pow(Math.sin(Math.PI*Math.pow(fraction,.62)),1.4):0;
    const wave=.5+.5*Math.sin(theta*3-phase);
    const response=swell*(.62+.38*(.5+.5*Math.cos(theta-Math.PI)));
    const height=(9+wave*7.5+(Math.sin(index*5.31)*.5+.5)*2.5)*4.2*(1+response*.8);
    return {x1:size/2+Math.cos(angle)*radius,y1:size/2+Math.sin(angle)*radius,
      x2:size/2+Math.cos(angle)*(radius+height*units),y2:size/2+Math.sin(angle)*(radius+height*units),
      opacity:Math.min(1,.84+wave*.12+response*.04)};
  };
  useEffect(()=>{
    let frame=0,elapsed=0,last=performance.now();
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const draw=(now:number)=>{
      const delta=Math.min(now-last,100);last=now;
      if(!document.hidden&&!media.matches)elapsed+=delta;
      const phase=media.matches?0:(elapsed%5464)/5464*2*Math.PI;
      lines.current.forEach((line,index)=>{
        if(!line)return;
        const v=values(index,phase,media.matches?null:receipt.current);
        line.setAttribute('x2',String(v.x2));line.setAttribute('y2',String(v.y2));
        line.setAttribute('stroke-opacity',String(v.opacity));
      });
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(frame);
  },[size]);
  return <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">{Array.from({length:76},(_,index)=>{
    const v=values(index,0,null),band=Math.floor(index*56/76);
    return <line key={index} ref={el=>{lines.current[index]=el;}} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2} stroke={band<=17?'#849b80':band<=34?'#a390b3':'#aca473'} strokeOpacity={v.opacity} strokeWidth={barWidth} strokeLinecap="round"/>;
  })}</svg>;
}
