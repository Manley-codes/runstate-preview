import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cubicBezier, useReducedMotion } from 'motion/react';
import { PauseIcon, PlayIcon, StopwatchIcon, Crosshair1Icon, TrackPreviousIcon, TrackNextIcon, Cross2Icon } from '@radix-ui/react-icons';
import { asset, formatTime, type Appearance, type DemoRun } from './demo';
import './active.css';

type Version = 'type' | 'frame' | 'pieces';
type Box = { x:number; y:number; w:number; h:number };
const tileColors = {
  night:{canvas:'#101113',pace:'#1b1d20',music:'#bfc2c2',split:'#1b1d20',grid:'184,186,204'},
  day:{canvas:'rgba(255,255,255,0)',pace:'rgba(255,255,255,0)',music:'rgba(255,255,255,0)',split:'rgba(255,255,255,0)',grid:'78,126,143'},
};
const finalBoxes:Record<string,Box> = {
  pause:{x:25,y:103,w:78,h:89}, time:{x:116,y:103,w:252,h:89},
  pace:{x:22,y:546,w:174.5,h:104}, paceRight:{x:196.5,y:546,w:174.5,h:104},
  split:{x:22,y:662,w:174.5,h:92}, music:{x:196.5,y:662,w:174.5,h:92},
};
const destinations = ['pace','music','split','paceRight','time','pause'];
const arrangement = ['time','pace','split','pause','music','paceRight'];
const digitSegments:Record<string,number[]> = {
  '0':[0,1,2,4,5,6], '1':[2,5], '2':[0,2,3,4,6], '3':[0,2,3,5,6],
  '4':[1,2,3,5], '5':[0,1,3,5,6], '6':[0,1,3,4,5,6],
  '7':[0,2,5], '8':[0,1,2,3,4,5,6], '9':[0,1,2,3,5,6],
};
const segments = [{x:8,y:0,w:48,h:9},{x:0,y:10,w:9,h:62},{x:55,y:10,w:9,h:62},
  {x:8,y:74,w:48,h:9},{x:0,y:85,w:9,h:62},{x:55,y:85,w:9,h:62},{x:8,y:149,w:48,h:9}];
const ease = cubicBezier(.22,.85,.16,1);
const landingPull = cubicBezier(.48,.04,.85,.6);
const landingSettle = cubicBezier(.18,.75,.28,1);
const arcEase = cubicBezier(.42,0,.58,1);
const clamp = (value:number)=>Math.min(1,Math.max(0,value));
const mix = (from:number,to:number,progress:number)=>from+(to-from)*progress;
const beatPhase = (elapsed:number)=>elapsed-Math.floor(elapsed);
// One shared one-second phrase: land, articulate, clear, then land on the next count.
function beatVisibility(elapsed:number,reduced:boolean) {
  if(reduced||elapsed>=10)return 1;
  return 1-ease(clamp((beatPhase(elapsed)-.8)/.08));
}
function beatArticulation(elapsed:number,reduced:boolean) {
  if(reduced)return 0;
  return Math.sin(Math.PI*clamp((beatPhase(elapsed)-.28)/.49));
}

// Every moving value samples this same elapsed clock, including delayed handoffs.
// Pausing therefore holds the actual frame, rather than letting another animation finish.
function assemblyProgress(elapsed:number,delay:number,duration:number,reduced:boolean,easing=ease) {
  if(elapsed<10)return 0;
  return reduced?1:easing(clamp((elapsed-10-delay)/duration));
}
function numberScale(elapsed:number,reduced:boolean) {
  if(reduced||elapsed>=10)return 1;
  const withinCount=elapsed-Math.floor(elapsed);
  return withinCount<.24?mix(1.48,1.025,landingPull(withinCount/.24))
    :mix(1.025,1,landingSettle(clamp((withinCount-.24)/.06)));
}
function numberTone(elapsed:number,reduced:boolean) {
  if(reduced||elapsed>=10)return 1;
  const settle=ease(clamp((beatPhase(elapsed)-.26)/.48));
  return beatVisibility(elapsed,reduced)*mix(1,.92,settle);
}
function countdownBox(index:number,step:number,top:number):Box {
  const left=index<3;
  const row=((index%3)+(left?step%3:3-step%3))%3;
  return {x:left?22:265,y:top+row*112,w:106,h:100};
}
function mixBox(from:Box,to:Box,progress:number):Box {
  return {x:mix(from.x,to.x,progress),y:mix(from.y,to.y,progress),
    w:mix(from.w,to.w,progress),h:mix(from.h,to.h,progress)};
}
function borderTone(elapsed:number,index:number,theme:Appearance,reduced:boolean) {
  const phase=beatPhase(elapsed);
  const landing=reduced?.6:1-ease(clamp(phase/.32));
  const accent=beatArticulation(elapsed,reduced);
  const amount=reduced?.6:clamp(.16+landing*.68+accent*(index%3===1?.28:.2));
  return theme==='night'?mix(.13,.46,amount):mix(.26,.52,amount);
}
function surfaceAtOpacity(surface:string,opacity:number) {
  if(!surface.startsWith('#'))return surface;
  const color=parseInt(surface.slice(1),16);
  return `rgba(${color>>16},${(color>>8)&255},${color&255},${opacity})`;
}

const nightSpecks = [
  [23,167,1,.52],[96,183,.7,.38],[281,162,.8,.42],[369,187,1,.55],
  [15,263,.7,.4],[110,289,1,.45],[291,249,.65,.34],[378,319,.9,.56],
  [42,360,.65,.36],[327,373,.8,.4],[19,431,1,.54],[109,476,.7,.38],
  [287,451,.85,.46],[374,508,.65,.36],[31,553,.8,.48],[91,588,1,.56],
  [301,567,.7,.4],[361,597,1,.52],[14,657,.65,.33],[381,678,.8,.45],
  [23,734,.8,.47],[374,767,1,.53],[77,817,.7,.36],[144,789,.65,.3],
  [244,824,.9,.46],[322,809,.7,.38],[44,840,.8,.4],[361,841,.65,.36],
];
function NightSpecks() {
  return <svg className="night-specks" viewBox="0 0 393 794" aria-hidden="true">
    {nightSpecks.map(([x,y,r,opacity],i)=><circle key={i} cx={x} cy={y-58} r={r} opacity={opacity} fill="white"/>)}
  </svg>;
}

// Same branch and tapered-leaf geometry as StartRunScreen.RunMapTreeShadows.
function DayAtmosphere() {
  const blurId=useId();
  const leaves=[[.03,.05,-66],[.09,.08,28],[.17,.1,-42],[.22,.13,48],[.3,.16,-30],[.36,.2,62],[.43,.24,-22]];
  return <svg className="day-atmosphere" viewBox="0 0 393 794" aria-hidden="true">
    <defs><filter id={blurId} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.8"/></filter></defs>
    {['translate(425 50) rotate(115)','translate(-45 794) rotate(-36)'].map((transform,i)=><g key={i} transform={transform} filter={`url(#${blurId})`}>
      <path d="M-25.6 3.2 C12.8 22.4 89.6 35.2 156.8 92.8" fill="none" stroke="#387b68" strokeWidth="3.5" strokeLinecap="round" opacity=".045"/>
      {leaves.map(([x,y,angle],j)=>{
        const length=320*(j%2===0?.17:.14),breadth=length*.38;
        return <path key={j} transform={`translate(${x*320} ${y*320}) rotate(${angle})`}
          d={`M0 0 C${length*.28} ${-breadth} ${length*.82} ${-breadth*.55} ${length} 0 C${length*.7} ${breadth*.8} ${length*.25} ${breadth*.7} 0 0Z`}
          fill="#387b68" opacity=".075"/>;
      })}
    </g>)}
  </svg>;
}

// Exact Start energy geometry, repeated as decorative countdown motifs rather than choices.
function EnergyMark({index,elapsed,reduced,theme}:{index:number;elapsed:number;reduced:boolean;theme:Appearance}) {
  const moonMaskId=useId();
  const kind=['moon','lines','sun','sun','moon','lines'][index];
  const articulation=beatArticulation(elapsed,reduced);
  const scale=numberScale(elapsed,reduced)*(1+articulation*.07);
  const landing=reduced?0:1-ease(clamp(beatPhase(elapsed)/.3));
  const opacity=reduced?.85:beatVisibility(elapsed,reduced)*clamp((theme==='night'?.67:.76)+landing*.3+articulation*.1);
  const gap=reduced?5.28:mix(3.1,7,articulation);
  const moonTilt=reduced?0:articulation*(index<3?-13:13);
  const sunTurn=reduced?0:articulation*(index<3?35:-35);
  return <svg className={'cell-mark energy-mark energy-'+kind} viewBox="0 0 24 24" aria-hidden="true"
    style={{opacity,overflow:'visible',transform:`scale(${scale}) rotate(${kind==='moon'?moonTilt:0}deg)`,transformOrigin:'50% 50%'}}>
    {kind==='moon'&&<><defs><mask id={moonMaskId}><rect width="24" height="24" fill="white"/><circle cx="17.52" cy="8.16" r="9.36" fill="black"/></mask></defs>
      <circle cx="12" cy="12" r="10.08" fill="currentColor" mask={`url(#${moonMaskId})`}/></>}
    {kind==='lines'&&[-1,0,1].map(line=><path key={line} d={`M4.8 ${12.24+line*gap}H19.2`}
      fill="none" stroke="currentColor" strokeWidth="2.667" strokeLinecap="round"/>)}
    {kind==='sun'&&<><circle cx="12" cy="12" r="4.8" fill="currentColor"/>
      <g transform={`rotate(${sunTurn} 12 12)`}>{Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4;return <line key={i}
        x1={12+Math.cos(angle)*7.92} y1={12+Math.sin(angle)*7.92}
        x2={12+Math.cos(angle)*11.52} y2={12+Math.sin(angle)*11.52}
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>;})}</g></>}
  </svg>;
}

function blendHex(from:string,to:string,amount:number) {
  const a=parseInt(from.slice(1),16),b=parseInt(to.slice(1),16);
  const channel=(shift:number)=>Math.round(mix((a>>shift)&255,(b>>shift)&255,amount));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}
function visualizerColor(index:number,amplitude:number,theme:Appearance) {
  if(theme==='night')return blendHex('#8996a2','#f3f6f8',.3+.7*amplitude);
  // Linger near each clear hue, then merge softly into the next, including the seam.
  const position=(index-12+76)%76;
  const stops:Array<[number,string]>=[[0,'#699e78'],[24,'#a080c2'],[50,'#c6a044'],[76,'#699e78']];
  const upper=stops.findIndex(stop=>stop[0]>position);
  const [start,from]=stops[upper-1], [end,to]=stops[upper];
  const blend=.5-.5*Math.cos(Math.PI*(position-start)/(end-start));
  return blendHex(from,to,blend);
}

function Instrument({version,count,elapsed,reduced,theme,visualizerFinish}:{version:Version;count:number;elapsed:number;reduced:boolean;theme:Appearance;visualizerFinish:boolean}) {
  const assembled=elapsed>=10;
  const handoff=reduced?1:clamp((elapsed-10-.47)/.16);
  const turn=visualizerFinish?360*assemblyProgress(elapsed,.45,.62,reduced):0;
  const morph=visualizerFinish?assemblyProgress(elapsed,.91,.28,reduced,arcEase):0;
  // The Start ring's 76 fixed-angle bars and three-lobed traveling wave, adapted outward.
  // This is ambient design motion, not a measurement or a connection to playing music.
  const waveTime=reduced?0:Math.max(0,elapsed-11.19);
  const phase=2*Math.PI*waveTime/5.464;
  return <svg className="instrument" viewBox="0 0 310 310" aria-hidden="true">
    <g data-number-landing="pieces" opacity={assembled?1:numberTone(elapsed,reduced)}
      transform={`translate(155 155) scale(${numberScale(elapsed,reduced)}) translate(-155 -155)`}>
    {Array.from({length:14},(_,i)=>{
      const angle=(i/14)*Math.PI*2-Math.PI/2;
      const s=segments[i%7];
      const text=String(count).padStart(2,' ');
      const slot=Math.floor(i/7);
      const offset=count===10 ? (slot===0?77:168):123;
      const lit=digitSegments[text[slot]]?.includes(i%7) ?? false;
      const progress=assemblyProgress(elapsed,(i%7)*.012,.52,reduced);
      const x=mix(offset+s.x,155+Math.cos(angle)*146-24,progress);
      const y=mix(76+s.y,155+Math.sin(angle)*146-2,progress);
      const width=mix(s.w,48,progress),height=mix(s.h,4,progress);
      const opacity=mix(!assembled&&version==='pieces'&&lit?1:0,.76,progress)*(assembled?1-handoff:1);
      return <rect key={i} data-assembly-segment={i} rx={assembled?0:1}
        x={x} y={y} width={width} height={height} opacity={opacity}
        transform={`rotate(${mix(0,i/14*360,progress)} ${x+width/2} ${y+height/2})`}
        fill={assembled?'var(--ring)':'var(--ink)'} />;
    })}
    </g>
    <g data-ring-turn={turn.toFixed(3)} data-ring-morph={morph.toFixed(4)} transform={`rotate(${turn} 155 155)`}>
    {Array.from({length:14},(_,i)=>{
      const start=(i/14)*Math.PI*2-Math.PI/2-.163;
      const end=start+.326;
      const d=`M ${155+Math.cos(start)*146} ${155+Math.sin(start)*146} A 146 146 0 0 1 ${155+Math.cos(end)*146} ${155+Math.sin(end)*146}`;
      return <path key={'arc'+i} d={d} fill="none" stroke="var(--ring)" strokeWidth="4.5"
        opacity={.82*assemblyProgress(elapsed,.45,.18,reduced,arcEase)*(1-morph)}/>;
    })}
    {visualizerFinish&&Array.from({length:76},(_,index)=>{
      const angle=index/76*Math.PI*2-Math.PI/2;
      const amplitude=.5+.5*Math.sin(angle*3-phase);
      // Uneven neighboring bars share a slow ripple; deterministic texture avoids jitter.
      const texture=.7*(.5+.5*Math.sin(index*5.31))+.3*(.5+.5*Math.sin(angle*11+phase));
      const inner=mix(146,134,morph);
      const length=mix(2,8+16*amplitude+7*texture,morph);
      return <line key={'bar'+index} data-visualizer-bar={index}
        x1={155+Math.cos(angle)*inner} y1={155+Math.sin(angle)*inner}
        x2={155+Math.cos(angle)*(inner+length)} y2={155+Math.sin(angle)*(inner+length)}
        stroke={visualizerColor(index,amplitude,theme)} strokeWidth="3.2" strokeLinecap="round"
        opacity={morph*(.9+.08*amplitude)}/>;
    })}
    </g>
  </svg>;
}

function Tile({id,index,elapsed,reduced,theme,countdownTop,pauseAmount=0,compactPace=false,children}:{id:string;index:number;elapsed:number;reduced:boolean;theme:Appearance;countdownTop:number;pauseAmount?:number;compactPace?:boolean;children:ReactNode}) {
  const assembled=elapsed>=10;
  const step=Math.min(4,Math.floor(elapsed/2));
  const gridProgress=reduced?1:ease(clamp((elapsed-step*2)/.42));
  const countdownPosition=mixBox(countdownBox(index,Math.max(0,step-1),countdownTop),countdownBox(index,step,countdownTop),gridProgress);
  const order=destinations.indexOf(id);
  const progress=assemblyProgress(elapsed,.12+order*.055,.45,reduced);
  const contentProgress=assemblyProgress(elapsed,.37+order*.055,.19,reduced);
  const interactive=assembled&&contentProgress>=.99;
  const destination={...finalBoxes[id]};
  if(id==='pace'||id==='paceRight') {destination.y=mix(546,532,pauseAmount);destination.h=mix(104,76,pauseAmount);}
  if(compactPace&&(id==='pace'||id==='paceRight')) Object.assign(destination,{x:id==='pace'?84.5:196.5,w:112});
  if(id==='split'||id==='music') {destination.y=mix(662,620,pauseAmount);destination.h=mix(92,76,pauseAmount);}
  const box=mixBox(countdownPosition,destination,progress);
  const colors=tileColors[theme];
  const surface=id==='pace'||id==='paceRight'?colors.pace:id==='music'?colors.music:id==='split'?colors.split:colors.canvas;
  const clearMetricBorder=theme==='day'&&assembled&&id!=='pause'&&id!=='time';
  const borderOpacity=mix(borderTone(Math.min(elapsed,10),index,theme,reduced),clearMetricBorder?.3:0,progress);
  const corners=id==='music'||id==='paceRight'?[0,10,10,0]:id==='pace'||id==='split'?[10,0,0,10]:[0,0,0,0];
  return <div className={'assembly-tile tile-'+id} data-tile={id}
    style={{left:box.x,top:box.y,width:box.w,height:box.h,
      borderColor:`rgba(${colors.grid},${borderOpacity})`,
      backgroundColor:surfaceAtOpacity(surface,progress),
      borderRadius:corners.map(corner=>mix(1,corner,progress)+'px').join(' ')}}>
    {!assembled&&<EnergyMark index={index} elapsed={elapsed} reduced={reduced} theme={theme}/>}
    <div className="tile-content" aria-hidden={!interactive} inert={!interactive}
      style={{opacity:contentProgress,transform:`translateY(${mix(7,0,contentProgress)}px)`,pointerEvents:interactive?'auto':'none'}}>{children}</div>
  </div>;
}

function StartNowDial({elapsed,reduced,onStart,top}:{elapsed:number;reduced:boolean;onStart:()=>void;top:number}) {
  const a=beatArticulation(elapsed,reduced);
  const landing=reduced?0:1-ease(clamp(beatPhase(elapsed)/.3));
  const visibility=beatVisibility(elapsed,reduced);
  const r=40.48;
  return <button className="countdown-start-now" style={{top}} onClick={onStart} aria-label="Start now">
    <svg viewBox="0 0 88 88" aria-hidden="true">
      <circle cx="44" cy="44" r={r} className="start-dial-face"/>
      <g transform={`rotate(${a*12} 44 44)`}>
        {Array.from({length:12},(_,i)=>{
          const major=i%3===0,angle=i*Math.PI/6-Math.PI/2;
          const outer=r*((major?.85:.81)+landing*.07-a*.035),inner=r*(.66-a*.10+landing*.07);
          return <line key={i} data-start-mark={i} x1={44+Math.cos(angle)*inner} y1={44+Math.sin(angle)*inner}
            x2={44+Math.cos(angle)*outer} y2={44+Math.sin(angle)*outer} stroke="var(--start-ink)"
            strokeWidth={major?1.7:1.1} opacity={major?.4+.5*visibility:.2+.4*visibility} strokeLinecap="round"/>;
        })}
      </g>
      <path d={`M${44-r*.23} ${44-r*.36}L${44+r*.42} 44L${44-r*.23} ${44+r*.36}Z M${44-r*.12} ${44-r*.20}L${44+r*.24} 44L${44-r*.12} ${44+r*.20}Z`}
        fill="var(--start-ink)" fillRule="evenodd"/>
      <path d={`M${44-r*.05} 44H${44+r*.12}`} stroke="var(--start-accent)" strokeWidth={r*.10}/>
    </svg>
    <span>Start now</span>
  </button>;
}


// Example metadata for this silent interaction demo; no connection to Spotify.
const sampleTracks = [
  {title:'Good as Hell',artist:'Lizzo',duration:159},
  {title:'Lovely Day',artist:'Bill Withers',duration:255},
  {title:'No Role Modelz',artist:'J. Cole',duration:292},
];
type SampleMusic = {index:number; position:number; playing:boolean};
const initialMusic:SampleMusic = {index:0,position:23,playing:true};
function musicTime(seconds:number) { return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`; }

function WaveProgress({music,reduced}:{music:SampleMusic;reduced:boolean}) {
  const track=sampleTracks[music.index],width=62;
  const end=width*clamp(music.position/track.duration);
  // Playback-state decoration, not a measured audio waveform. Music owns its own
  // position independently of run pause; music pause presents a straight line.
  const phase=reduced?0:music.position*Math.PI*1.5;
  const amplitude=music.playing?1.6:0;
  const points=Array.from({length:Math.ceil(end)+1},(_,i)=>{
    const x=Math.min(i,end),edge=Math.min(1,x/4,(end-x)/4);
    return `${i?'L':'M'}${x.toFixed(2)} ${(6+Math.sin(x*Math.PI/8-phase)*amplitude*edge).toFixed(2)}`;
  }).join(' ');
  return <div className="player-progress" role="progressbar" aria-label="Sample song progress" aria-valuemin={0} aria-valuemax={Math.floor(track.duration)} aria-valuenow={Math.floor(music.position)} aria-valuetext={`${musicTime(music.position)} of ${musicTime(track.duration)}`}>
    <svg viewBox={`0 0 ${width} 12`} aria-hidden="true"><path className="player-progress-remaining" d={`M${Math.min(width,end+4)} 6H${width}`}/><path className="player-progress-played" d={points}/></svg>
  </div>;
}

function CirclePlayer({music,reduced,onToggle,onSkip,onClose}:{music:SampleMusic;reduced:boolean;onToggle:()=>void;onSkip:(direction:number)=>void;onClose:()=>void}) {
  const track=sampleTracks[music.index];
  const closeButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{closeButton.current?.focus({preventScroll:true});},[]);
  return <section className="circle-player" data-player-layout="headphones" id="circle-player" aria-label="Example Spotify music controls"
    onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}}}>
    <div className="player-surface" aria-hidden="true">
      <img className="player-background-art" src={asset('start-music.jpg')} alt="" draggable={false}/>
      <div className="player-background-scrim"/>
    </div>
    <span className="player-service"><img src={asset('spotify-icon-white.svg')} alt="Spotify"/></span>
    <button ref={closeButton} className="player-close" onClick={onClose} aria-label="Close music player"><Cross2Icon/></button>
    <div className="player-metadata" aria-live="polite" aria-atomic="true"><strong>{track.title}</strong><span>{track.artist}</span></div>
    <button className={'player-play '+(music.playing?'is-playing':'')} onClick={onToggle} aria-label={music.playing?'Pause sample music':'Play sample music'}>{music.playing?<PauseIcon/>:<PlayIcon/>}</button>
    <div className="player-transport" role="group" aria-label="Sample music controls">
      <button className="player-skip" onClick={()=>onSkip(-1)} aria-label="Previous sample song"><TrackPreviousIcon/></button>
      <WaveProgress music={music} reduced={reduced}/>
      <button className="player-skip" onClick={()=>onSkip(1)} aria-label="Next sample song"><TrackNextIcon/></button>
    </div>
  </section>;
}

// A local hold rehearsal only: no device, persistence, Spotify or run-completion request.
function FinishPanel({disabled,finished,circular=false,onFinish}:{disabled:boolean;finished:boolean;circular?:boolean;onFinish:()=>void}) {
  const [progress,setProgress]=useState(0);
  const start=useRef<number|null>(null), frame=useRef(0), pointer=useRef<number|null>(null);
  const complete=useRef(onFinish);complete.current=onFinish;
  function cancel() {start.current=null;pointer.current=null;cancelAnimationFrame(frame.current);setProgress(0);}
  function begin() {
    if(disabled||finished||start.current!==null)return;
    start.current=performance.now();setProgress(.001);
    const tick=(now:number)=>{
      if(start.current===null)return;
      const next=clamp((now-start.current)/1500);setProgress(next);
      if(next===1){start.current=null;complete.current();return;}
      frame.current=requestAnimationFrame(tick);
    };
    frame.current=requestAnimationFrame(tick);
  }
  useEffect(()=>{if(disabled)cancel();},[disabled]);
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)cancel();};
    window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',hidden);
    return()=>{cancelAnimationFrame(frame.current);start.current=null;window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',hidden);};
  },[]);
  const amount=finished?1:progress;
  return <button className={'finish-panel'+(circular?' finish-circle':'')+(progress>0?' is-holding':'')+(finished?' is-finished':'')}
    disabled={disabled||finished} aria-label={finished?'Sample run finished':'Hold to finish sample run'}
    data-hold-progress={amount.toFixed(3)}
    onPointerDown={event=>{if(!event.isPrimary||event.button!==0)return;event.preventDefault();pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);begin();}}
    onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel}
    onPointerMove={event=>{if(pointer.current!==event.pointerId)return;const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)cancel();}}
    onKeyDown={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();if(!event.repeat)begin();}}}
    onKeyUp={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();cancel();}}} onBlur={cancel}
    onContextMenu={event=>event.preventDefault()}>
    <span className="finish-emblem" aria-hidden="true"><svg viewBox="0 0 44 44">
      <circle className="finish-orbit" cx="22" cy="22" r={circular?21:19}/>
      <circle className="finish-orbit-fill" cx="22" cy="22" r={circular?21:19} pathLength="100" strokeDasharray="100 100" strokeDashoffset={100-amount*100} transform="rotate(-90 22 22)"/>
      {finished?<path className="finish-check" d="M15 22l5 5 10-11"/>:<rect className="finish-stop" x="16" y="16" width="12" height="12" rx="2"/>}
    </svg></span>
    <span className="finish-copy"><strong>{circular?(finished?'Finished':'Stop'):(finished?'Run finished':'Finish run')}</strong></span>
    {!circular&&<span className="finish-edge" aria-hidden="true" style={{transform:`scaleX(${amount})`}}/>}
  </button>;
}


export type ActiveRunProps = {
  appearance: Appearance;
  initialMode: 'countdown' | 'active' | 'music';
  run: DemoRun;
  onFinish: (run: DemoRun) => void;
  onCancel: () => void;
  onMap: () => void;
  onStarted?: () => void;
  onPausedChange?: (paused: boolean) => void;
};

export default function ActiveRun({appearance:theme,initialMode,run,onFinish,onCancel,onMap,onStarted,onPausedChange}:ActiveRunProps) {
  const [elapsed,setElapsed]=useState(initialMode==='countdown'?0:11.3);
  const [runSeconds,setRunSeconds]=useState(0);
  const [runPaused,setRunPaused]=useState(false);
  const [runFinished,setRunFinished]=useState(false);
  const [pauseLayout,setPauseLayout]=useState(0);
  const [musicOpen,setMusicOpen]=useState(initialMode==='music');
  const [music,setMusic]=useState<SampleMusic>({...initialMusic});
  const musicButton=useRef<HTMLButtonElement>(null);
  const viewport=useRef<HTMLDivElement>(null);
  const [scale,setScale]=useState(1);
  const reduced=!!useReducedMotion();
  const done=useRef(false);
  const beganWithCountdown=useRef(initialMode==='countdown');
  const started=useRef(false);
  const startedCallback=useRef(onStarted);
  const pausedCallback=useRef(onPausedChange);
  startedCallback.current=onStarted;
  pausedCallback.current=onPausedChange;
  const assembled=elapsed>=10;
  const pauseAmount=ease(pauseLayout);
  const countdownTop=226;
  const designHeight=assembled?794:774;
  const count=Math.max(1,10-Math.floor(elapsed));
  const activeSeconds=run.activeSeconds+Math.floor(runSeconds);
  const paceParts=run.averagePace.split(':').map(Number);
  const secondsPerMile=paceParts[0]*60+paceParts[1];
  const distance=run.distance+runSeconds/(secondsPerMile||600);
  const frameProgress=assemblyProgress(elapsed,0,.51,reduced);
  const distanceProgress=assemblyProgress(elapsed,.3,.26,reduced);
  const frameTone=reduced?.6:clamp(.28+(1-ease(clamp(beatPhase(Math.min(elapsed,9.999))/.32)))*.6+beatArticulation(elapsed,reduced)*.12);
  const frameOpacity=(theme==='night'?mix(.32,.46,frameTone):mix(.4,.52,frameTone))*(1-frameProgress);

  useEffect(()=>{
    if(assembled&&beganWithCountdown.current&&!started.current) {
      started.current=true;
      startedCallback.current?.();
    }
  },[assembled]);
  useEffect(()=>{pausedCallback.current?.(runPaused);},[runPaused]);
  useEffect(()=>{
    const element=viewport.current;if(!element)return;
    const observer=new ResizeObserver(([entry])=>setScale(Math.min(entry.contentRect.width/393,entry.contentRect.height/designHeight)));
    observer.observe(element);return()=>observer.disconnect();
  },[designHeight]);
  useEffect(()=>{
    if(reduced)setPauseLayout(runPaused?1:0);
  },[reduced,runPaused]);
  useEffect(()=>{
    let request=0,last=performance.now();
    const tick=(now:number)=>{
      const dt=Math.min((now-last)/1000,.1);last=now;
      if(!document.hidden&&!runFinished) {
        setPauseLayout(previous=>runPaused?Math.min(1,previous+dt/.38):Math.max(0,previous-dt/.38));
        if(!runPaused) {
          setElapsed(previous=>previous+dt);
          if(assembled)setRunSeconds(previous=>previous+dt);
        }
        // Music playback is independent of the run's pause/resume state.
        if(assembled)setMusic(previous=>{
          if(!previous.playing)return previous;
          const position=previous.position+dt,duration=sampleTracks[previous.index].duration;
          return position>=duration?{...previous,index:(previous.index+1)%sampleTracks.length,position:position-duration}:{...previous,position};
        });
      }
      request=requestAnimationFrame(tick);
    };
    request=requestAnimationFrame(tick);return()=>cancelAnimationFrame(request);
  },[assembled,runPaused,runFinished]);

  function closeMusic() {setMusicOpen(false);musicButton.current?.focus({preventScroll:true});}
  function skipMusic(direction:number) {setMusic(previous=>({...previous,index:(previous.index+direction+sampleTracks.length)%sampleTracks.length,position:0}));}
  function toggleRun() {if(runFinished)return;if(!runPaused)setElapsed(previous=>Math.max(previous,11.3));setRunPaused(previous=>!previous);}
  function finishRun() {
    if(done.current)return;
    done.current=true;setRunFinished(true);setMusicOpen(false);
    onFinish({...run,activeSeconds,distance:Number(distance.toFixed(2))});
  }
  const tileContents:Record<string,ReactNode>={
    pause:<button disabled={!assembled||runFinished} className={'run-pause '+(runPaused?'is-paused':'')} onClick={toggleRun} aria-label={runPaused?'Resume run':'Pause run'}>
      {runPaused?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4L21 12L8 20Z" fill="currentColor"/></svg>:<PauseIcon/>}<span>{runPaused?'Resume':'Pause'}</span></button>,
    time:<div className="time-content"><div className="time-reading"><StopwatchIcon/><strong data-reading="time">{formatTime(activeSeconds)}</strong></div><span className="metric-label">ACTIVE TIME</span></div>,
    music:<button ref={musicButton} disabled={!assembled} className="music-content" onClick={()=>musicOpen?closeMusic():setMusicOpen(true)} aria-expanded={musicOpen} aria-controls={musicOpen?'circle-player':undefined} aria-label={musicOpen?'Close Spotify Music':'Open Spotify Music'}><img src={asset('start-music.jpg')} alt=""/><strong>Spotify<br/>Music</strong></button>,
    split:<div className="small-content"><div className="small-value">{run.splitPace}<span>/mi</span></div><span className="metric-label">This mile</span></div>,
  };
  return <div ref={viewport} className="assembly-app" data-phase={assembled?(runPaused?'Paused':'Running'):'Counting down'} data-theme={theme} data-finish-layout="circle" data-run-paused={runPaused} data-elapsed={elapsed.toFixed(3)}>
    <div className={'run-canvas '+(assembled?'assembled':'counting')+(count<=3&&!assembled?' final-counts':'')}
      style={{height:designHeight,transform:`translate(-50%, -50%) scale(${scale})`}}>
      {theme==='night'?<NightSpecks/>:<DayAtmosphere/>}
      <header className="run-header"><div className="brand-name">RUNSTATE</div>
        <div className="session-status"><span className="status-dot"/><span>{assembled?(runPaused?'Paused':'Running'):'Ready to run'}</span><span className="status-divider"/><span className="gps-status">Sample run</span></div>
        {assembled&&<button className="map-reference" onClick={onMap} aria-label="View example route"><Crosshair1Icon/><span>Map</span></button>}
      </header>
      <div className="number-carrier" data-tile="distance"
        style={{left:mix(141,42,frameProgress),top:mix(countdownTop,214,frameProgress),width:mix(112,309,frameProgress),height:mix(324,309,frameProgress),
          borderRadius:mix(1,155,frameProgress),borderColor:`rgba(${tileColors[theme].grid},${frameOpacity})`,backgroundColor:'transparent'}}/>
      {arrangement.map((id,index)=><Tile key={id} id={id} index={index} elapsed={elapsed} reduced={reduced} theme={theme} countdownTop={countdownTop} pauseAmount={pauseAmount} compactPace>{tileContents[id]}</Tile>)}
      {assembled&&<div className="pace-content full-pace" style={{top:mix(546,532,pauseAmount),height:mix(104,76,pauseAmount),opacity:assemblyProgress(elapsed,.38,.19,reduced)}}>
        <span className="metric-label">Average pace</span><div className="compact-value" style={{fontSize:mix(49,43,pauseAmount)}}>{run.averagePace}<span>/mi</span></div>
      </div>}
      <div className="hero-instrument" style={{left:42,top:mix(countdownTop+7,mix(214,207,pauseAmount),frameProgress),transform:`scale(${mix(1,.94,pauseAmount*frameProgress)})`,transformOrigin:'50% 50%'}}>
        <Instrument version="frame" count={count} elapsed={elapsed} reduced={reduced} theme={theme} visualizerFinish/>
        {!assembled&&<div className={'count-number '+(count===10?'two-digits':'')} data-number-landing="type" aria-live="off"
          style={{transform:`scale(${numberScale(elapsed,reduced)})`,transformOrigin:'50% 50%',opacity:numberTone(elapsed,reduced)}}>{count}</div>}
        {assembled&&musicOpen?<CirclePlayer music={music} reduced={reduced} onToggle={()=>setMusic(previous=>({...previous,playing:!previous.playing}))} onSkip={skipMusic} onClose={closeMusic}/>:<div className="distance-content" aria-hidden={!assembled}
          style={{opacity:distanceProgress,transform:`scale(${mix(.94,1,distanceProgress)})`}}>
          <strong data-reading="distance">{distance.toFixed(2)}</strong><span className="distance-unit">mi</span><span className="metric-label">DISTANCE</span>
        </div>}
      </div>
      {!assembled&&<>
        <span className="sr-only" role="status">Countdown: {count}</span>
        <StartNowDial elapsed={elapsed} reduced={reduced} onStart={()=>setElapsed(10)} top={574}/>
        <button className="cancel-preview" style={{top:704}} onClick={onCancel}>Cancel</button>
      </>}
      {assembled&&pauseLayout>0&&<div className="finish-placement circular-placement" style={{opacity:clamp((pauseAmount-.45)/.55),transform:`translateY(${8*(1-pauseAmount)}px)`,pointerEvents:runPaused&&pauseLayout>.95?'auto':'none'}}>
        <FinishPanel circular disabled={!runPaused||pauseLayout<=.95} finished={runFinished} onFinish={finishRun}/>
      </div>}
    </div>
  </div>;
}
