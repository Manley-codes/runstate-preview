import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { asset } from './demo';
import type { Energy } from './demo';
import './opening-start.css';
import { NativeAgentRing } from './NativeAgentRing';

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

function Canvas({children,className}:{children:ReactNode;className:string}) {
  const host = useRef<HTMLDivElement>(null);
  const [scale,setScale] = useState(1);
  useEffect(() => {
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
  const continueRef=useRef(onContinue);
  const finished=useRef(false);
  const [startPhase]=useState(()=>Math.random()*30);
  continueRef.current=onContinue;
  const finish=()=>{if(!finished.current){finished.current=true;continueRef.current();}};
  useEffect(()=>{
    let frame=0, elapsed=0, last=performance.now();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate=(now:number)=>{
      const delta=Math.min((now-last)/1000,.1);last=now;
      if(!document.hidden) elapsed+=delta;
      rows.current.forEach((row,index)=>{
        if(!row)return;
        const width=openingRows[index].reduce((sum,tile)=>sum+tile.width+6,0);
        const travel=(rowSpeeds[index]*(startPhase+rowPhases[index]+(reduced?0:elapsed)))%width;
        row.style.transform=`translateX(${index%2?travel-width:-travel}px)`;
      });
      if(elapsed>=4.8){if(!finished.current){finished.current=true;continueRef.current();}return;}
      frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    return()=>cancelAnimationFrame(frame);
  },[startPhase]);
  return <Canvas className="rs-opening" ><button className="rs-opening-skip" onClick={finish} aria-label="Enter RunState; skip opening animation">
    <div className="rs-opening-collage" aria-hidden="true">{openingRows.map((row,index)=><div className="rs-opening-row" key={index}><div className="rs-opening-track" ref={el=>{rows.current[index]=el;}}>{[...row,...row].map((tile,tileIndex)=><img key={`${tile.id}-${tileIndex}`} src={asset(`opening/${tile.id}.webp`)} alt="" draggable={false} style={{width:tile.width,objectPosition:tile.position}}/>)}</div></div>)}</div>
    <div className="rs-opening-shade" />
    <span className="rs-opening-wordmark" aria-hidden="true"><span>R</span><span>u</span><span>n</span><span>St</span><span>a</span><span>te</span></span>
    <span className="rs-opening-enter">Tap to enter</span>
  </button></Canvas>;
}


/** Current Moto content: 720×1456 at 260dpi, excluding Android system bars. */
const START_WIDTH=720/1.625, START_HEIGHT=1456/1.625, START_RING=128;
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
  return <svg viewBox="0 0 18 18" aria-hidden="true">{energy==='Low'?<><circle cx="9" cy="9" r="7.56" fill="currentColor"/><circle cx="13.14" cy="6.12" r="7.02" fill="#293326"/></>:energy==='Moderate'?<g stroke="currentColor" strokeWidth="2" strokeLinecap="round">{[0,1,2].map(i=><line key={i} x1="3.6" x2="14.4" y1={18*(.29+i*.22)} y2={18*(.29+i*.22)}/>)}</g>:<><circle cx="9" cy="9" r="3.6" fill="currentColor"/><g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <line key={i} x1={9+Math.cos(a)*5.94} y1={9+Math.sin(a)*5.94} x2={9+Math.cos(a)*8.64} y2={9+Math.sin(a)*8.64}/>;})}</g></>}</svg>;
}
/*! Unmodified Google Material outlined paths from StartRunScreen.kt.
 * Copyright 2014 Google Inc. All Rights Reserved. Licensed under Apache-2.0.
 * https://www.apache.org/licenses/LICENSE-2.0
 */
const nativeUtilityPaths={"history":"M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z","map":"M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.16V6.46zm14 11.08l-3 1.01V6.86l3-1.16v11.84z","settings":"M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"};
function UtilityIcon({kind}:{kind:'map'|'history'|'settings'}){return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={nativeUtilityPaths[kind]}/></svg>;}

function ShoeArt({withBacking=true}:{withBacking?:boolean}={}){
  const id=useId();
  return <svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id={id} x1=".15" y1="0" x2=".85" y2="1"><stop stopColor="#b7ce72"/><stop offset="1" stopColor="#718a48"/></linearGradient></defs><path fill={`url(#${id})`} opacity={withBacking?1:0} d="M47 4.5C72 0 97 22 94 47 98 75 72 96 48 94 20 97 2.5 74 5 48 2 22 22 7 47 4.5Z"/><path fill="#d7e2ac" opacity={withBacking?.55:0} d="M49 15C70 11 86 29 85 49 87 69 67 86 46 84 24 86 13 66 15 46 16 27 29 17 49 15Z"/><g transform="rotate(-12 50 54)"><path fill="#e9edd8" d="M13 63C30 63 64 69 88 63 91 69 84 76 72 76L21 73C14 72 12 68 13 63Z"/><path fill="#fafbf1" d="m14 63 3-24c5-5 7 9 14 7l9-14 6 2c2 9 12 19 23 21 12 1 18 2 19 8-22 6-58 0-74 0Z"/><path fill="#95a67a" d="m22 48 11 3 12-10 13 14c-11 1-19 7-35 5Z"/><path d="m17 64 39 3" stroke="#b7d948" strokeWidth="4.5" strokeLinecap="round"/><path d="m19 72 53 3" stroke="#53673b" strokeWidth="2.6" strokeLinecap="round"/><path d="m39 40-7 3.5m11.5 1-7 3.5m11.5 1-7 3.5" stroke="#59684b" strokeWidth="1.7" strokeLinecap="round"/><path d="M62 58c10 1 17 1 21 4" fill="none" stroke="#b6c1a5" strokeWidth="1.2"/><path d="m18 39-1-7" stroke="#53673b" strokeWidth="2.7" strokeLinecap="round"/></g></svg>;
}



function AgentRing({selected,onClear,intakeElapsed}:{selected:Energy;onClear:()=>void;intakeElapsed:number|null}){
  return <button className="rs-start-agent-ring" onClick={onClear} disabled={!selected} aria-label={selected?selected+' energy selected. Change energy':'Run agent ready'} title={selected?'Change energy':undefined}><NativeAgentRing size={START_RING} intakeElapsed={intakeElapsed}/></button>;
}
function StartDial({ready}:{ready:boolean}){
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
    {Array.from({length:12},(_,i)=>{const a=i*Math.PI/6-Math.PI/2;return <line key={i} x1={c+Math.cos(a)*r*.68} y1={c+Math.sin(a)*r*.68} x2={c+Math.cos(a)*r*(i%3===0?.88:.83)} y2={c+Math.sin(a)*r*(i%3===0?.88:.83)} stroke="white" strokeOpacity={i%3===0?.78:.42} strokeWidth={i%3===0?1.8:1} strokeLinecap="round"/>;})}
    <path d={'M'+(c-r*.23)+' '+(c-r*.36)+' L'+(c+r*.42)+' '+c+' L'+(c-r*.23)+' '+(c+r*.36)+' Z M'+(c-r*.12)+' '+(c-r*.20)+' L'+(c+r*.24)+' '+c+' L'+(c-r*.12)+' '+(c+r*.20)+' Z'} fill="white" fillRule="evenodd"/>
    <line x1={c-r*.05} y1={c} x2={c+r*.12} y2={c} stroke="#f5be37" strokeWidth="5" strokeLinecap="square"/>
  </svg>;
}
function EnergyContents({value,labelOpacity=1}:{value:Exclude<Energy,null>;labelOpacity?:number}){
  return <><EnergySymbol energy={value}/><strong style={{opacity:labelOpacity}}>{value.toUpperCase()}</strong><small style={{opacity:labelOpacity}}>{value==='Low'?'Running low':value==='Moderate'?'Steady':'Energized'}</small></>;
}
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
function ease(x:number,x1:number,y1:number,x2:number,y2:number){
  x=clamp(x);let low=0,high=1,t=x;
  const b=(p:number,a:number,c:number)=>3*(1-p)*(1-p)*p*a+3*(1-p)*p*p*c+p*p*p;
  for(let i=0;i<20;i++){t=(low+high)/2;if(b(t,x1,x2)<x)low=t;else high=t;}
  return b(t,y1,y2);
}
function EnergyIntake({energy,elapsed}:{energy:Exclude<Energy,null>;elapsed:number}){
  const values:Exclude<Energy,null>[]=['Low','Moderate','High'],chosenIndex=values.indexOf(energy);
  const width=(START_WIDTH-56)/3,top=START_HEIGHT-326,target={x:START_WIDTH/2,y:94};
  const mark=ease(elapsed/150,.32,.72,.3,1),merge=ease((elapsed-150)/320,.4,0,.2,1),travel=ease((elapsed-470)/640,.5,.02,.28,1);
  const labels=1-clamp((elapsed-470)/200);
  return <div className="rs-start-intake-overlay" aria-hidden="true">{[...values.filter(v=>v!==energy),energy].map(value=>{
    const chosen=value===energy,index=values.indexOf(value),left=20+index*(width+8),centerX=left+width/2,centerY=top+41;
    if((chosen&&elapsed>=1110)||(!chosen&&elapsed>=470))return null;
    const scale=chosen?(elapsed<150?1+mark*.015:elapsed<470?1.015+merge*.02:1.035+travel*(.13-1.035)):1-merge*.1;
    const dx=chosen?(target.x-centerX)*travel:(chosenIndex-index)*(width+8)*.62*merge;
    const dy=chosen?(target.y-centerY)*travel:0;
    const opacity=chosen?1-ease((elapsed-870)/260,.4,0,1,1):1-clamp((elapsed-150)/260);
    return <div key={value} className={'rs-start-energy-choice energy-'+value.toLowerCase()} style={{position:'absolute',left,top,width,opacity,borderRadius:17+35*travel,transform:'translate('+dx+'px,'+dy+'px) scale('+scale+')'}}><EnergyContents value={value} labelOpacity={labels}/></div>;
  })}</div>;
}
type StartProps={energy:Energy;onEnergy:(v:Energy)=>void;onStart:()=>void;onHistory:()=>void;onSettings:()=>void;onMusic:()=>void;onMap:()=>void};
const intentions=['No target','Keep it easy','Steady','Hard effort'];
const shoeCatalog=[['ASICS','Novablast 6'],['Nike','Pegasus 42'],['HOKA','Clifton 11'],['Brooks','Ghost 18'],['Saucony','Ride 19'],['HOKA','Speedgoat 7']];
type DemoShoe={brand:string;model:string;nickname?:string};
export function StartScreen({energy,onEnergy,onStart,onHistory,onSettings,onMusic,onMap}:StartProps){
  const [sheet,setSheet]=useState<'plan'|'shoes'|null>(null);
  const [plan,setPlan]=useState('No target'),[draftPlan,setDraftPlan]=useState(plan);
  const [route,setRoute]=useState(''),[draftRoute,setDraftRoute]=useState('');
  const [shoe,setShoe]=useState<DemoShoe|null>(null),[savedShoes,setSavedShoes]=useState<DemoShoe[]>([]);
  const [archivedShoes,setArchivedShoes]=useState<DemoShoe[]>([]),[showArchived,setShowArchived]=useState(false);
  const [query,setQuery]=useState(''),[customOpen,setCustomOpen]=useState(false);
  const [brand,setBrand]=useState(''),[model,setModel]=useState(''),[nickname,setNickname]=useState('');
  const [intake,setIntake]=useState<Energy>(null),[intakeElapsed,setIntakeElapsed]=useState<number|null>(null);
  const intakeFrame=useRef(0),sheetRef=useRef<HTMLDivElement>(null),returnFocus=useRef<HTMLElement|null>(null);
  const id=useId();
  useEffect(()=>()=>cancelAnimationFrame(intakeFrame.current),[]);
  useEffect(()=>{
    if(!sheet)return;
    returnFocus.current=document.activeElement as HTMLElement;
    sheetRef.current?.querySelector<HTMLButtonElement>('button,input')?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();setSheet(null);}
      if(e.key==='Tab'){
        const items=Array.from(sheetRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input')??[]);
        if(!items.length)return;const first=items[0],last=items[items.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);returnFocus.current?.focus();};
  },[sheet]);
  const selectEnergy=(value:Exclude<Energy,null>)=>{
    if(energy)return;onEnergy(value);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    setIntake(value);setIntakeElapsed(0);
    let last=performance.now(),elapsed=0;
    const tick=(now:number)=>{const dt=Math.min(now-last,100);last=now;if(!document.hidden)elapsed+=dt;if(elapsed>=1630){setIntake(null);setIntakeElapsed(null);return;}setIntakeElapsed(elapsed);intakeFrame.current=requestAnimationFrame(tick);};
    intakeFrame.current=requestAnimationFrame(tick);
  };
  const clearEnergy=()=>{cancelAnimationFrame(intakeFrame.current);setIntake(null);setIntakeElapsed(null);onEnergy(null);};
  const openPlan=()=>{setDraftPlan(plan);setDraftRoute(route);setSheet('plan');};
  const addShoe=(pair:DemoShoe)=>{setSavedShoes(current=>[...current,pair]);setShoe(pair);setSheet(null);setCustomOpen(false);setQuery('');};
  const planText=plan!=='No target'?plan+' · Edit plan':route?'Route added · Edit plan':'Plan this run';
  const matches=(text:string)=>text.toLowerCase().includes(query.trim().toLowerCase());
  const available=shoeCatalog.filter(([b,m])=>matches(b+' '+m)&&![...savedShoes,...archivedShoes].some(pair=>pair.brand===b&&pair.model===m));
  const headingOpacity=!energy?1:intakeElapsed!==null?1-clamp((intakeElapsed-470)/200):0;
  return <StartCanvas><div className="rs-start-screen" style={{backgroundImage:'url("'+asset('start-map.jpg')+'")'}}>
    <div className="rs-start-map-wash"/>
    <div className="rs-start-top-card">
      <div className="rs-start-brand"><span>RUN</span><strong>STATE</strong><small>AGENT&nbsp; <b>•</b><em>&nbsp; READY</em></small></div>
      <AgentRing selected={energy} onClear={clearEnergy} intakeElapsed={intakeElapsed}/>
      <div className="rs-start-ready"><span>READY</span><strong>TO RUN</strong><small>GPS Ready</small></div>
    </div>
    <nav className="rs-start-utilities" aria-label="Run options">
      <button onClick={onMap} aria-label="Open live map"><UtilityIcon kind="map"/></button>
      <button onClick={onHistory} aria-label="Log History"><UtilityIcon kind="history"/></button>
      <button onClick={onSettings} aria-label="Run settings"><UtilityIcon kind="settings"/></button>
    </nav>
    <div className="rs-start-lower">
      <div className="rs-start-energy-section">
        <p style={{opacity:headingOpacity}} aria-hidden={!!energy}>Physical energy now · Optional</p>
        <div className="rs-start-energy-choices" style={{opacity:energy?0:1}} aria-hidden={!!energy}>{(['Low','Moderate','High'] as const).map(value=><button key={value} className={'rs-start-energy-choice energy-'+value.toLowerCase()} onClick={()=>selectEnergy(value)} disabled={!!energy} aria-label={value+' pre-run energy'}><EnergyContents value={value}/></button>)}</div>
      </div>
      <button className="rs-start-plan" onClick={openPlan}>{planText}</button>
    </div>
    {intake&&intakeElapsed!==null&&<EnergyIntake energy={intake} elapsed={intakeElapsed}/>}
    <footer className="rs-start-footer">
      <svg className="rs-start-footer-shape" viewBox={'0 0 '+START_WIDTH+' 184'} preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={id+'-footer'}><stop stopColor="#2d3827"/><stop offset="1" stopColor="#1d261b"/></linearGradient></defs><path fill={'url(#'+id+'-footer)'} d={'M0 29.44C'+START_WIDTH*.21+' 44.16 '+START_WIDTH*.37+' 11.04 '+START_WIDTH*.5+' 11.04C'+START_WIDTH*.63+' 11.04 '+START_WIDTH*.82+' 42.32 '+START_WIDTH+' 29.44V184H0Z'}/>{[0,1,2,3].map(i=><path key={i} d={'M'+START_WIDTH*(.68+i*.09)+' 184C'+START_WIDTH*.76+' '+184*(.60+i*.02)+' '+START_WIDTH*.92+' '+184*(.44+i*.02)+' '+START_WIDTH+' '+184*(.40+i*.06)} fill="none" stroke="white" strokeOpacity=".07" strokeWidth="1"/>)}</svg>
      <button className="rs-start-footer-secondary rs-start-shoes" onClick={()=>setSheet('shoes')} aria-label="Choose shoes"><ShoeArt/><strong>SHOES</strong>{shoe?<><span>{shoe.nickname||shoe.model}</span><small className="rs-start-shoe-mileage">0.0 MI</small></>:<small>ADD PAIR</small>}</button>
      <button className="rs-start-run" onClick={onStart}><StartDial ready={!!energy}/><strong>Start</strong><small>GPS run</small></button>
      <button className="rs-start-footer-secondary rs-start-music" onClick={onMusic} aria-label="Spotify music"><img src={asset('start-music.jpg')} alt=""/><strong>MUSIC</strong><small>SPOTIFY</small></button>
    </footer>
    {sheet&&<div className="rs-start-sheet-scrim" onClick={()=>setSheet(null)}><div ref={sheetRef} className={'rs-start-sheet '+(sheet==='shoes'?'rs-start-shoe-sheet':'rs-start-plan-sheet')} role="dialog" aria-modal="true" aria-labelledby={id+'-sheet-title'} onClick={e=>e.stopPropagation()}>
      <span className="rs-start-sheet-handle" aria-hidden="true"/>
      {sheet==='plan'?<div className="rs-start-plan-sheet-content"><h2 id={id+'-sheet-title'}>Plan this run</h2><p>What kind of run?</p><div className="rs-start-plan-choices">{intentions.map(value=><button key={value} onClick={()=>setDraftPlan(value)} aria-pressed={draftPlan===value}>{value}</button>)}</div><label className="rs-start-route"><span>Familiar route</span><input value={draftRoute} maxLength={80} onChange={e=>setDraftRoute(e.target.value)} placeholder="e.g. Park loop"/></label><p className="rs-start-sheet-note">Use the same name for the same route.</p><button className="rs-start-plan-save" onClick={()=>{setPlan(draftPlan);setRoute(draftRoute.trim());setSheet(null);}}>Save plan</button></div>:<>
        <div className="rs-start-shoe-heading"><h2 id={id+'-sheet-title'}>Add Shoes</h2><button onClick={()=>setSheet(null)}>Close</button></div>
        <label className="rs-start-shoe-search"><span>Search brand or model</span><input aria-label="Search brand or model" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <div className="rs-start-shoe-list"><h3>YOUR SHOES</h3>
          {!savedShoes.filter(pair=>matches(pair.brand+' '+pair.model)).length&&<p>{query?'No saved shoes match your search.':'Add your first pair below.'}</p>}
          {savedShoes.filter(pair=>matches(pair.brand+' '+pair.model)).map((pair,index)=><div className={'rs-start-shoe-row '+(shoe===pair?'selected':'')} key={index}><button className="rs-start-pair-select" onClick={()=>{setShoe(pair);setSheet(null);}}><ShoeArt withBacking={false}/><span><small>{pair.brand}</small><strong>{pair.model}</strong>{pair.nickname&&<small>{pair.nickname}</small>}<small>0.0 MI{shoe===pair?' · Selected':''}</small></span></button><button className="rs-start-archive" onClick={()=>{setSavedShoes(current=>current.filter(p=>p!==pair));setArchivedShoes(current=>[...current,pair]);if(shoe===pair)setShoe(null);}}>Archive</button></div>)}
          <button className="rs-start-shoe-text" onClick={()=>{setShoe(null);setSheet(null);}}>Run without tracking shoes</button><hr/><h3>BROWSE SHOES</h3><p className="rs-start-shoe-hint">Mileage tracking begins with your next saved GPS run.</p>
          {available.map(([b,m])=><button className="rs-start-shoe-row rs-start-catalog" key={b+m} onClick={()=>addShoe({brand:b,model:m})}><ShoeArt withBacking={false}/><span><small>{b}</small><strong>{m}</strong></span><b>+</b></button>)}
          {!available.length&&query&&<p>No catalog match. Add your pair below.</p>}
          <button className="rs-start-shoe-text" onClick={()=>setCustomOpen(!customOpen)}>{customOpen?'Close custom pair':'+ Add a different or second pair'}</button>
          {customOpen&&<div className="rs-start-custom-shoes"><label>Brand<input value={brand} onChange={e=>setBrand(e.target.value.slice(0,60))}/></label><label>Model<input value={model} onChange={e=>setModel(e.target.value.slice(0,80))}/></label><label>Pair nickname (optional)<input value={nickname} onChange={e=>setNickname(e.target.value.slice(0,40))}/></label><p>A nickname helps tell two pairs of the same model apart.</p><button disabled={!brand.trim()||!model.trim()} onClick={()=>addShoe({brand:brand.trim(),model:model.trim(),nickname:nickname.trim()||undefined})}>Add and select pair</button></div>}
          {!!archivedShoes.length&&<button className="rs-start-shoe-text" onClick={()=>setShowArchived(!showArchived)}>{showArchived?'Hide':'Show'} archived shoes</button>}
          {showArchived&&archivedShoes.filter(pair=>matches(pair.brand+' '+pair.model)).map((pair,index)=><div className="rs-start-shoe-archived" key={index}><span>{[pair.brand,pair.model,pair.nickname].filter(Boolean).join(' · ')}<small>0.0 MI</small></span><button onClick={()=>{setArchivedShoes(current=>current.filter(p=>p!==pair));setSavedShoes(current=>[...current,pair]);}}>Restore</button></div>)}
        </div>
      </>}
    </div></div>}
  </div></StartCanvas>;
}

