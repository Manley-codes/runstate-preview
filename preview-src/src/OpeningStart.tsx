import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { asset } from './demo';
import type { Energy } from './demo';
import './opening-start.css';
import { NativeAgentRing } from './NativeAgentRing';
import { GoalPanel, goalLabel } from './GoalPanel';
import type { PreviewGoal } from './GoalPanel';
import { ShoePicker } from './ShoePicker';
import type { DemoShoe } from './ShoePicker';
import { TrailBrowser } from './TrailPreview';
import openingFirstFrame from './opening-first-frame.webp?inline';

type Tile = { id: string; width: number; position?: string };
const openingRows: Tile[][] = [
  [{id:'pick-23',width:114},{id:'city-stride',width:114},{id:'track-partners',width:126,position:'center 76%'},{id:'motion-city',width:114},{id:'pick-11',width:114},{id:'motion-green',width:114}],
  [{id:'pick-06',width:114},{id:'pick-03',width:240},{id:'forest-run',width:114},{id:'pick-14',width:240},{id:'pick-10',width:240},{id:'orange-bottle',width:115}],
  [{id:'headphone-runner',width:114,position:'center 70%'},{id:'pick-13',width:114},{id:'pick-19',width:136},{id:'race-celebration',width:244},{id:'pick-21',width:124}],
  [{id:'pick-22',width:114},{id:'pick-07',width:114},{id:'purple-sneakers',width:230,position:'center bottom'},{id:'pick-12',width:114},{id:'pick-04',width:114},{id:'pick-24',width:114}],
  [{id:'pick-01',width:244},{id:'pick-02',width:242},{id:'pick-25',width:114},{id:'blue-shoes',width:208}],
  [{id:'pick-15',width:240},{id:'pick-20',width:114},{id:'hydration',width:190},{id:'run-friends',width:238},{id:'pick-09',width:114},{id:'motion-street',width:114}],
];
const rowPhases = [5,2,2,2,3,3];
const rowSpeeds = [51.75,56.0625,53.1875,57.5,52.46875,56.0625];
function openingRowTransform(index:number,seconds:number) {
  const width=openingRows[index].reduce((sum,tile)=>sum+tile.width+6,0);
  const travel=(rowSpeeds[index]*(seconds+rowPhases[index]))%width;
  return `translateX(${index%2?travel-width:-travel}px)`;
}

function Canvas({children,className}:{children:ReactNode;className:string}) {
  const host = useRef<HTMLDivElement>(null);
  const [scale,setScale] = useState(1);
  useLayoutEffect(() => {
    const element=host.current;
    if(!element) return;
    const measure=()=>setScale(Math.min(element.clientWidth / 393, element.clientHeight / 794));
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(element);
    return ()=>observer.disconnect();
  },[]);
  return <div ref={host} className={`rs-source-canvas ${className}`}><div className="rs-source-canvas-inner" style={{transform:`translate(-50%,-50%) scale(${scale})`}}>{children}</div></div>;
}

/** The six native opening rows, including their original image order and alternating travel. */
export function Opening({onContinue}:{onContinue:()=>void}) {
  const rows=useRef<(HTMLDivElement|null)[]>([]);
  const [photosReady,setPhotosReady]=useState(false);
  const continueRef=useRef(onContinue);
  const finished=useRef(false);
  const [startPhase]=useState(()=>Math.random()*30);
  continueRef.current=onContinue;
  const finish=()=>{if(!finished.current){finished.current=true;continueRef.current();}};
  useEffect(()=>{
    let mounted=true;
    // Loading and decoding are separate: reveal the whole wall only when every
    // displayed tile can paint. A slow/failed photo keeps the complete native still.
    const images=rows.current.flatMap(row=>Array.from(row?.querySelectorAll('img')??[]));
    Promise.all(images.map(image=>image.decode())).then(()=>{
      if(mounted&&images.length===openingRows.flat().length*2&&images.every(image=>image.naturalWidth>0))setPhotosReady(true);
    }).catch(()=>{/* Keep the complete wall; Skip and the original 4.8s timer still work. */});
    return()=>{mounted=false;};
  },[]);
  useEffect(()=>{
    let frame=0, elapsed=0, last=performance.now();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate=(now:number)=>{
      const delta=Math.min((now-last)/1000,.1);last=now;
      if(!document.hidden) elapsed+=delta;
      rows.current.forEach((row,index)=>{
        if(!row)return;
        row.style.transform=openingRowTransform(index,startPhase+(reduced?0:elapsed));
      });
      if(elapsed>=4.8){if(!finished.current){finished.current=true;continueRef.current();}return;}
      frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    return()=>cancelAnimationFrame(frame);
  },[startPhase]);
  return <Canvas className="rs-opening" ><button className="rs-opening-skip" onClick={finish} aria-label="Enter RunState; skip opening animation">
    <img className="rs-opening-first-frame" src={openingFirstFrame} alt="" draggable={false}/>
    <div className={`rs-opening-live${photosReady?' is-ready':''}`} aria-hidden="true">
      <div className="rs-opening-collage">{openingRows.map((row,index)=><div className="rs-opening-row" key={index}><div className="rs-opening-track" ref={el=>{rows.current[index]=el;}} style={{transform:openingRowTransform(index,startPhase)}}>{[...row,...row].map((tile,tileIndex)=><img key={`${tile.id}-${tileIndex}`} src={asset(`opening/${tile.id}.webp`)} alt="" draggable={false} style={{width:tile.width,objectPosition:tile.position}}/>)}</div></div>)}</div>
      <div className="rs-opening-shade" />
    </div>
    <span className="rs-opening-wordmark" aria-hidden="true"><span>R</span><span>u</span><span>n</span><span>St</span><span>a</span><span>te</span></span>
    <span className="rs-opening-enter">Tap to enter</span>
  </button></Canvas>;
}


/** Current Moto content: 720×1456 at 260dpi, excluding Android system bars. */
const START_WIDTH=720/1.625, START_HEIGHT=1456/1.625, START_RING=264;
function StartCanvas({children}:{children:ReactNode}){
  const host=useRef<HTMLDivElement>(null);
  const [scale,setScale]=useState(1);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const measure=()=>setScale(Math.min(el.clientWidth/START_WIDTH,el.clientHeight/START_HEIGHT));
    measure();const observer=new ResizeObserver(measure);observer.observe(el);
    return()=>observer.disconnect();
  },[]);
  return <div ref={host} className="rs-source-canvas rs-start"><div className="rs-start-native-canvas" style={{width:START_WIDTH,height:START_HEIGHT,transform:'translate(-50%,-50%) scale('+scale+')'}}>{children}</div></div>;
}

function EnergySymbol({energy}:{energy:Exclude<Energy,null>}){
  return <svg viewBox="0 0 18 18" aria-hidden="true">{energy==='Low'?<><circle cx="9" cy="9" r="7.56" fill="currentColor"/><circle cx="13.14" cy="6.12" r="7.02" fill="#dcd1e4"/></>:energy==='Moderate'?<g stroke="currentColor" strokeWidth="2" strokeLinecap="round">{[0,1,2].map(i=><line key={i} x1="3.6" x2="14.4" y1={18*(.29+i*.22)} y2={18*(.29+i*.22)}/>)}</g>:<><circle cx="9" cy="9" r="3.6" fill="currentColor"/><g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <line key={i} x1={9+Math.cos(a)*5.94} y1={9+Math.sin(a)*5.94} x2={9+Math.cos(a)*8.64} y2={9+Math.sin(a)*8.64}/>;})}</g></>}</svg>;
}
/*! Unmodified Google Material outlined paths from StartRunScreen.kt.
 * Copyright 2014 Google Inc. All Rights Reserved. Licensed under Apache-2.0.
 * https://www.apache.org/licenses/LICENSE-2.0
 */
const nativeUtilityPaths={"history":"M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z","map":"M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.16V6.46zm14 11.08l-3 1.01V6.86l3-1.16v11.84z","settings":"M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"};
function UtilityIcon({kind}:{kind:'map'|'history'|'settings'}){return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={nativeUtilityPaths[kind]}/></svg>;}

function AgentRing({selected,onClear,intakeElapsed}:{selected:Energy;onClear:()=>void;intakeElapsed:number|null}){
  return <button className="rs-start-agent-ring" onClick={onClear} disabled={!selected} aria-label={selected?selected+' energy selected. Change energy':'Run agent ready'} title={selected?'Change energy':undefined}><NativeAgentRing size={START_RING} intakeElapsed={intakeElapsed} emphasized/></button>;
}
function StartDial({ready,entering}:{ready:boolean;entering:boolean}){
  const id=useId(),c=51,outer=102*.49,r=outer*.9;
  return <svg className="rs-start-dial" viewBox="0 0 102 102" aria-hidden="true">
    <defs>
      <radialGradient id={id+'-shadow'} gradientUnits="userSpaceOnUse" cx={c} cy={c+2} r={outer-2}><stop stopColor="#000" stopOpacity=".30"/><stop offset=".76" stopColor="#000" stopOpacity=".20"/><stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
      <radialGradient id={id+'-face'} gradientUnits="userSpaceOnUse" cx={c-r*.45} cy={c-r*.7} r={r*2.2}><stop stopColor="#3b4733"/><stop offset=".52" stopColor="#232e1e"/><stop offset="1" stopColor="#151e13"/></radialGradient>
      <radialGradient id={id+'-glow'}><stop stopColor="#b8d442" stopOpacity="0"/><stop offset=".72" stopColor="#b8d442" stopOpacity="0"/><stop offset=".9" stopColor="#b8d442" stopOpacity=".36"/><stop offset="1" stopColor="#b8d442" stopOpacity="0"/></radialGradient>
      <linearGradient id={id+'-edge'} gradientUnits="userSpaceOnUse" x1={c-r} y1={c-r} x2={c+r} y2={c-r*.3}><stop stopColor="#e4ebd7" stopOpacity="0"/><stop offset=".5" stopColor="#e4ebd7" stopOpacity=".20"/><stop offset="1" stopColor="#e4ebd7" stopOpacity="0"/></linearGradient>
    </defs>
    <circle cx={c} cy={c+2} r={outer-2} fill={'url(#'+id+'-shadow)'}/>
    {ready&&<g className="rs-start-ready-glow"><circle cx={c} cy={c} r={outer} fill={'url(#'+id+'-glow)'}/><circle cx={c} cy={c} r={r+.7} fill="none" stroke="#b8d442" strokeOpacity=".64" strokeWidth="1.4"/></g>}
    <circle cx={c} cy={c} r={r} fill={'url(#'+id+'-face)'}/>
    <path d={'M'+(c+Math.cos(205*Math.PI/180)*r)+' '+(c+Math.sin(205*Math.PI/180)*r)+' A'+r+' '+r+' 0 0 1 '+(c+Math.cos(310*Math.PI/180)*r)+' '+(c+Math.sin(310*Math.PI/180)*r)} fill="none" stroke={'url(#'+id+'-edge)'} strokeWidth="1" strokeLinecap="round"/>
    <g className={'rs-start-dial-ticks'+(entering?' is-entering':'')}>{Array.from({length:12},(_,i)=>{const a=i*Math.PI/6-Math.PI/2;return <line key={i} x1={c+Math.cos(a)*r*.68} y1={c+Math.sin(a)*r*.68} x2={c+Math.cos(a)*r*(i%3===0?.88:.83)} y2={c+Math.sin(a)*r*(i%3===0?.88:.83)} stroke="white" strokeOpacity={i%3===0?.78:.42} strokeWidth={i%3===0?1.8:1} strokeLinecap="round"/>;})}</g>
    <path d={'M'+(c-r*.23)+' '+(c-r*.36)+' L'+(c+r*.42)+' '+c+' L'+(c-r*.23)+' '+(c+r*.36)+' Z M'+(c-r*.12)+' '+(c-r*.20)+' L'+(c+r*.24)+' '+c+' L'+(c-r*.12)+' '+(c+r*.20)+' Z'} fill="white" fillRule="evenodd"/>
    <line x1={c-r*.13} y1={c} x2={c+r*.06} y2={c} stroke="#f5be37" strokeWidth="4" strokeLinecap="butt"/>
  </svg>;
}
function EnergyContents({value,labelOpacity=1}:{value:Exclude<Energy,null>;labelOpacity?:number}){
  return <><EnergySymbol energy={value}/><strong style={{opacity:labelOpacity}}>{value}</strong><small style={{opacity:labelOpacity}}>{value==='Low'?'Running low':value==='Moderate'?'Steady':'Energized'}</small></>;
}
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
function ease(x:number,x1:number,y1:number,x2:number,y2:number){
  x=clamp(x);let low=0,high=1,t=x;
  const b=(p:number,a:number,c:number)=>3*(1-p)*(1-p)*p*a+3*(1-p)*p*p*c+p*p*p;
  for(let i=0;i<20;i++){t=(low+high)/2;if(b(t,x1,x2)<x)low=t;else high=t;}
  return b(t,y1,y2);
}
type IntakeGeometry={tiles:{left:number;top:number;width:number;height:number}[];target:{x:number;y:number}};
function EnergyIntake({energy,elapsed,geometry}:{energy:Exclude<Energy,null>;elapsed:number;geometry:IntakeGeometry}){
  const values:Exclude<Energy,null>[]=['Low','Moderate','High'],chosenIndex=values.indexOf(energy);
  const {target}=geometry;
  const mark=ease(elapsed/150,.32,.72,.3,1),merge=ease((elapsed-150)/320,.4,0,.2,1),travel=ease((elapsed-470)/640,.5,.02,.28,1);
  const labels=1-clamp((elapsed-470)/200);
  return <div className="rs-start-intake-overlay" aria-hidden="true">{[...values.filter(v=>v!==energy),energy].map(value=>{
    const chosen=value===energy,index=values.indexOf(value),{left,top,width,height}=geometry.tiles[index],centerX=left+width/2,centerY=top+height/2;
    if((chosen&&elapsed>=1110)||(!chosen&&elapsed>=470))return null;
    const scale=chosen?(elapsed<150?1+mark*.015:elapsed<470?1.015+merge*.02:1.035+travel*(.13-1.035)):1-merge*.1;
    const dx=chosen?(target.x-centerX)*travel:(chosenIndex-index)*(width+8)*.62*merge;
    const dy=chosen?(target.y-centerY)*travel:0;
    const opacity=chosen?1-ease((elapsed-870)/260,.4,0,1,1):1-clamp((elapsed-150)/260);
    return <div key={value} className={'rs-start-energy-choice energy-'+value.toLowerCase()} style={{position:'absolute',left,top,width,opacity,borderRadius:17+35*travel,transform:'translate('+dx+'px,'+dy+'px) scale('+scale+')'}}><EnergyContents value={value} labelOpacity={labels}/></div>;
  })}</div>;
}
type StartProps={
  energy:Energy;onEnergy:(v:Energy)=>void;onStart:()=>void;onHistory:()=>void;
  onSettings:()=>void;onMusic:()=>void;onMap:()=>void;
  goal:PreviewGoal|null;onGoal:(goal:PreviewGoal|null)=>void;
  runnerName:string;modalOpen:boolean;
  shoe:DemoShoe|null;onShoe:(shoe:DemoShoe|null)=>void;pairs:DemoShoe[];onPairs:(pairs:DemoShoe[])=>void;
};

function NavigationSymbol({kind}:{kind:'goal'|'run'|'activity'|'shoes'}){
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    {kind==='shoes'?<><path d="M3 7 6 9 10 8 14 13 20 15Q22 16 21 19H3Z"/><path d="m3 16 17 1M10 10l-2 2m4 0-2 2"/></>:kind==='goal'?<><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m11 13 10-10m-5 0h5v5"/></>
      :kind==='run'?<><circle cx="15.5" cy="3.5" r="2.1" fill="currentColor" stroke="none"/><path d="m13 7-2.5 6m2.5-6-4.5 1L6 11m7-4 3 3.5h4m-9.5 2.5 4.5 3-1 5m-3.5-8L7 18l-4 2"/></>
      :<><rect x="3" y="14" width="5" height="7"/><rect x="8" y="9" width="5" height="12"/><rect x="13" y="3" width="5" height="18"/></>}
  </svg>;
}

export function StartScreen({energy,onEnergy,onStart,onHistory,onSettings,onMusic,onMap,goal,onGoal,runnerName,modalOpen,shoe,onShoe,pairs,onPairs}:StartProps){
  const sceneRef=useRef<HTMLDivElement>(null),intakeGeometry=useRef<IntakeGeometry|null>(null);
  const [hour,setHour]=useState(()=>new Date().getHours());
  useEffect(()=>{
    const refresh=()=>setHour(new Date().getHours());
    const timer=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  const greeting=hour>=5&&hour<12?'Good morning':hour>=12&&hour<17?'Good afternoon':'Good evening';
  const [sheet,setSheet]=useState<'goal'|'shoes'|'trails'|null>(null);
  const [trailId,setTrailId]=useState<string|null>(null);
  const [intake,setIntake]=useState<Energy>(null),[intakeElapsed,setIntakeElapsed]=useState<number|null>(null);
  const [entering,setEntering]=useState(()=>!energy&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hidden,setHidden]=useState(document.hidden);
  useEffect(()=>{
    const visibility=()=>setHidden(document.hidden);
    document.addEventListener('visibilitychange',visibility);
    return()=>document.removeEventListener('visibilitychange',visibility);
  },[]);
  useEffect(()=>{
    if(!entering)return;
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    const settle=()=>{if(document.hidden||preference.matches)setEntering(false);};
    preference.addEventListener('change',settle);
    document.addEventListener('visibilitychange',settle);
    return ()=>{preference.removeEventListener('change',settle);document.removeEventListener('visibilitychange',settle);};
  },[entering]);
  const intakeFrame=useRef(0),sheetRef=useRef<HTMLDivElement>(null),returnFocus=useRef<HTMLElement|null>(null);
  useEffect(()=>()=>cancelAnimationFrame(intakeFrame.current),[]);
  useEffect(()=>{
    if(!sheet)return;
    returnFocus.current=document.activeElement as HTMLElement;
    sheetRef.current?.querySelector<HTMLElement>('button,input,select,a[href]')?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();setSheet(null);}
      if(e.key==='Tab'){
        const items=Array.from(sheetRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')??[]);
        if(!items.length)return;const first=items[0],last=items[items.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);if(returnFocus.current?.isConnected)returnFocus.current.focus();};
  },[sheet]);
  const selectEnergy=(value:Exclude<Energy,null>)=>{
    if(energy)return;
    const root=sceneRef.current,ring=root?.querySelector('.rs-start-agent-ring');
    if(root&&ring){
      const bounds=root.getBoundingClientRect(),ratio=START_WIDTH/bounds.width,target=ring.getBoundingClientRect();
      const tiles=Array.from(root.querySelectorAll('.rs-start-energy-choices>button')).map(tile=>{const b=tile.getBoundingClientRect();return {left:(b.left-bounds.left)*ratio,top:(b.top-bounds.top)*ratio,width:b.width*ratio,height:b.height*ratio};});
      intakeGeometry.current={tiles,target:{x:(target.left+target.width/2-bounds.left)*ratio,y:(target.top+target.height/2-bounds.top)*ratio}};
    }
    onEnergy(value);
    if(entering){setEntering(false);return;}
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    setIntake(value);setIntakeElapsed(0);
    let last=performance.now(),elapsed=0;
    const tick=(now:number)=>{const dt=Math.min(now-last,100);last=now;if(!document.hidden)elapsed+=dt;if(elapsed>=1630){setIntake(null);setIntakeElapsed(null);return;}setIntakeElapsed(elapsed);intakeFrame.current=requestAnimationFrame(tick);};
    intakeFrame.current=requestAnimationFrame(tick);
  };
  const clearEnergy=()=>{cancelAnimationFrame(intakeFrame.current);setIntake(null);setIntakeElapsed(null);onEnergy(null);};
  const openTrails=(id:string|null=null)=>{setTrailId(id);setSheet('trails');};
  const paused=hidden||sheet!==null||modalOpen;
  return <StartCanvas><div ref={sceneRef} className="rs-start-screen">
    <StartAtmosphere/>
    <div className={'rs-start-scene'+(paused?' is-paused':'')} inert={sheet!==null}>
      <div className="rs-start-body" onScroll={()=>{cancelAnimationFrame(intakeFrame.current);setIntake(null);setIntakeElapsed(null);}}>
        <header className="rs-start-header"><img src={asset('start-runstate-wordmark.png')} alt="RunState"/><span>GPS Ready</span></header>
        <button className="rs-start-trails-card" onClick={()=>openTrails()} aria-label="Explore trails">
          <img src={asset('trails/trail_terry_hershey_photo.jpg')} alt=""/>
          <span><strong>Explore trails</strong><small>Find your next route</small></span><b aria-hidden="true">›</b>
        </button>
        <div className="rs-start-visualizer-space"><div className="rs-start-visualizer">
          <div className="rs-start-headphones"><img src={asset('start-music.jpg')} alt=""/></div>
          <AgentRing selected={energy} onClear={clearEnergy} intakeElapsed={intakeElapsed}/>
          <button className="rs-start-music" onClick={onMusic} aria-label="Spotify music"><img src={asset('spotify-icon-white.svg')} alt=""/></button>
        </div></div>
        <h1 className="rs-start-greeting">{greeting}{runnerName?', '+runnerName:''}</h1>
        <p className="rs-start-energy-question" style={{opacity:energy?0:1}} aria-hidden={!!energy}>How’s your energy today?</p>
        <div className={'rs-start-energy-choices'+(entering?' is-entering':'')} style={{opacity:energy?0:1}} aria-hidden={!!energy}
          onAnimationEnd={event=>{if(event.animationName==='rs-start-entry-travel'&&event.target===event.currentTarget.lastElementChild)setEntering(false);}}>
          {(['Low','Moderate','High'] as const).map(value=><button key={value} className={'rs-start-energy-choice energy-'+value.toLowerCase()} onClick={()=>selectEnergy(value)} disabled={!!energy} aria-label={value+' pre-run energy'}><EnergyContents value={value}/></button>)}
        </div>
        <div className="rs-start-footer"><button className="rs-start-run" onClick={onStart} aria-label="Start run"><StartDial ready={!!energy} entering={entering}/></button><span>Start Run</span></div>
      </div>
      {intake&&intakeElapsed!==null&&intakeGeometry.current&&<EnergyIntake energy={intake} elapsed={intakeElapsed} geometry={intakeGeometry.current}/>}
      <nav className="rs-start-navigation" aria-label="Run options">
        <button className="rs-start-shoes" onClick={()=>setSheet('shoes')} aria-label="Choose shoes" title={shoe?[shoe.brand,shoe.nickname||shoe.model].join(' '):undefined}><NavigationSymbol kind="shoes"/><span>Shoes</span></button>
        <button onClick={()=>setSheet('goal')} aria-label="Set a goal" title={goalLabel(goal)}><NavigationSymbol kind="goal"/><span>Goal</span></button>
        <button aria-current="page" aria-label="Run"><NavigationSymbol kind="run"/><span>Run</span></button>
        <button onClick={onSettings} aria-label="Run settings"><UtilityIcon kind="settings"/><span>Settings</span></button>
        <button onClick={onHistory} aria-label="Log History"><NavigationSymbol kind="activity"/><span>Activity</span></button>
      </nav>
    </div>
    {sheet&&<div className="rs-start-sheet-scrim" onClick={()=>setSheet(null)}><div ref={sheetRef} className={'rs-start-sheet rs-start-'+sheet+'-sheet'} role="dialog" aria-modal="true" aria-label={sheet==='goal'?'Set a goal':sheet==='shoes'?'Select shoes':'Houston trails'} onClick={e=>e.stopPropagation()}>
      <span className="rs-start-sheet-handle" aria-hidden="true"/>
      {sheet==='goal'?<GoalPanel value={goal} onSave={value=>{onGoal(value);setSheet(null);}} onClose={()=>setSheet(null)}/>
        :sheet==='shoes'?<ShoePicker value={shoe} pairs={pairs} onPairsChange={onPairs} onSelect={pair=>{onShoe(pair);setSheet(null);}} onClose={()=>setSheet(null)}/>
        :<TrailBrowser initialTrail={trailId} onClose={()=>setSheet(null)} onMap={()=>{setSheet(null);onMap();}}/>}
    </div></div>}
  </div></StartCanvas>;
}

function StartAtmosphere(){
  const u=START_WIDTH/393;
  return <svg className="rs-start-atmosphere" viewBox={'0 0 '+START_WIDTH+' '+START_HEIGHT} aria-hidden="true">
    {[{x:START_WIDTH+25*u,y:20*u,angle:115},{x:-45*u,y:START_HEIGHT-20*u,angle:-36}].map((branch,index)=><g key={index} transform={'translate('+branch.x+' '+branch.y+') rotate('+branch.angle+') scale('+u+')'}>
      <path d="M0 0C38 19 115 32 182 90" fill="none" stroke="#387b68" strokeOpacity=".045" strokeWidth="3.5" strokeLinecap="round"/>
      {Array.from({length:7},(_,i)=>{const length=i%2===0?54:45,width=length*.38;return <path key={i} transform={'translate('+(24+i*20)+' '+(10+i*8)+') rotate('+(i%2===0?-45:40)+')'} d={'M0 0C'+length*.28+' '+(-width)+' '+length*.82+' '+(-width*.55)+' '+length+' 0C'+length*.7+' '+width*.8+' '+length*.25+' '+width*.7+' 0 0Z'} fill="#387b68" fillOpacity=".055"/>;})}
    </g>)}
  </svg>;
}
