import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {asset, formatTime, type DemoRun, type Energy} from './demo';
import './history-screen.css';

type HistorySort='All runs'|'Longest'|'Fastest pace';
const sortChoices:HistorySort[]=['All runs','Longest','Fastest pace'];
const NATIVE_WIDTH=720/1.625;
const postLabels={Low:'Spent',Moderate:'Feeling Good',High:'Powered Up'};
const effortNames:Record<number,string>={0:'Rest',1:'Very, very easy',2:'Easy',3:'Moderate',4:'Somewhat hard',5:'Hard',7:'Very hard',10:'Maximal'};
function dateLabel(value:string){
  const date=new Date(value);
  return `${date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · ${date.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`;
}
function energyLabel(run:DemoRun){return run.postEnergy?postLabels[run.postEnergy]:run.reflection?'Not sure':'Not recorded';}
function effortLabel(run:DemoRun){return run.effort===null?'Not recorded':`${run.effort} / 10${effortNames[run.effort]?` · ${effortNames[run.effort]}`:''}`;}
function paceSeconds(run:DemoRun){const [minutes,seconds]=run.averagePace.split(':').map(Number);return minutes*60+seconds;}
function recentRuns(runs:DemoRun[]){return [...runs].sort((a,b)=>new Date(b.completedAt).getTime()-new Date(a.completedAt).getTime()).slice(0,20);}

// Mirrors native RunnerStateInsight: three paired answers in the SAME starting-Energy
// group are needed. The three distinct starter examples do not establish a pattern.
function energyFoundation(runs:DemoRun[]){
  const recent=recentRuns(runs),paired=recent.filter(item=>item.preEnergy&&item.postEnergy);
  const groups=new Map<Exclude<Energy,null>,DemoRun[]>();
  for(const item of paired){const key=item.preEnergy!;groups.set(key,[...(groups.get(key)||[]),item]);}
  const group=[...groups.entries()].find(([,items])=>items.length>=3);
  let heading='Your check-ins are taking shape',description:string|null=null;
  if(group){
    const [starting,items]=group;
    heading=`After starting ${starting}`;
    const counts=(['Low','Moderate','High'] as const).map(key=>({label:postLabels[key],count:items.filter(item=>item.postEnergy===key).length})).filter(item=>item.count>0).sort((a,b)=>b.count-a.count);
    description=counts[0].count*2>items.length
      ? `You finished ${counts[0].label} in ${counts[0].count} of ${items.length} runs you logged with ${starting} starting Energy.`
      : `Your finishes varied: ${counts.map(item=>`${item.label} in ${item.count} of ${items.length} runs`).join('; ')}.`;
  }
  const coverage=recent.length
    ? `${paired.length} of ${recent.length} recent runs with the current questions have both Energy answers; ${recent.filter(item=>item.effort!==null).length} have Effort.`
    : 'No runs with the current questions yet. Your earlier answers stay as recorded.';
  return {recent,heading,description,coverage};
}

function EnergyEvidence({runs,onClose}:{runs:DemoRun[];onClose:()=>void}){
  const [comparing,setComparing]=useState(false);
  const sheet=useRef<HTMLElement>(null);
  const foundation=energyFoundation(runs);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    sheet.current?.focus();
    return()=>previous?.focus();
  },[]);
  return <div className="nh-modal-shade" onClick={onClose} onKeyDown={event=>{
    if(event.key==='Escape'){event.stopPropagation();onClose();}
    if(event.key==='Tab'){
      const targets=sheet.current?.querySelectorAll<HTMLElement>('button,[tabindex="0"]');
      if(targets?.length){const first=targets[0],last=targets[targets.length-1];
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===sheet.current)){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    }
  }}>
    <section className="nh-energy-sheet" id="history-energy-sheet" role="dialog" aria-modal="true" aria-labelledby="history-energy-title" tabIndex={-1} ref={sheet} onClick={event=>event.stopPropagation()}>
      <button className="nh-sheet-handle" aria-label="Close check-ins" onClick={onClose}><span/></button>
      <div className="nh-sheet-content">
        <h2 id="history-energy-title">Your Energy</h2>
        <div className="nh-evidence-tabs" role="group" aria-label="Energy evidence view"><button aria-pressed={!comparing} onClick={()=>setComparing(false)}>Check-ins</button><button aria-pressed={comparing} onClick={()=>setComparing(true)}>Similar easy runs</button></div>
        {comparing?<p className="nh-evidence-intro">A comparison begins with a saved Keep it easy run, a route name and complete GPS distance and active time.</p>:<>
          <section className="nh-energy-summary"><h3>{foundation.heading}</h3>{foundation.description&&<p>{foundation.description}</p>}<p>{foundation.coverage}</p><p>{foundation.description?'Early observations':'Collecting check-ins'}</p></section>
          <p className="nh-evidence-small">From your latest {foundation.recent.length} GPS runs.</p>
          <p className="nh-evidence-span">Saved dates shown with each run</p>
          {foundation.recent.map(item=><article className="nh-evidence-row" key={item.id}>
            <h3>{dateLabel(item.completedAt)}</h3>
            <p className="nh-evidence-small">{item.distance.toFixed(2)} mi · {formatTime(item.activeSeconds)} active · {item.averagePace} /mi</p>
            <p>Start · {item.preEnergy||'Not recorded'} &nbsp; Finish · {energyLabel(item)}</p><p>Effort · {effortLabel(item)}</p>
            <p className="nh-evidence-small">Intention · Not recorded<br/>Route · Not recorded<br/>Shoes · Not recorded</p><p className="nh-evidence-small">Weather · Not recorded</p>
          </article>)}
        </>}
        <p className="nh-sheet-footer">From your saved check-ins</p>
      </div>
    </section>
  </div>;
}

export function HistoryScreen({runs,onBack}:{runs:DemoRun[];onBack:()=>void}){
  const [sort,setSort]=useState<HistorySort>('All runs');
  const [expanded,setExpanded]=useState<string|null>(null);
  const [evidenceOpen,setEvidenceOpen]=useState(false);
  const [scrolled,setScrolled]=useState(false),[hasMore,setHasMore]=useState(false);
  const root=useRef<HTMLDivElement>(null),list=useRef<HTMLDivElement>(null);
  const [viewport,setViewport]=useState({scale:393/NATIVE_WIDTH,height:794*NATIVE_WIDTH/393});
  const [compact,setCompact]=useState(false);
  const sorted=[...runs].sort((a,b)=>sort==='Longest'?b.distance-a.distance:sort==='Fastest pace'?paceSeconds(a)-paceSeconds(b):new Date(b.completedAt).getTime()-new Date(a.completedAt).getTime());
  const summary=sorted.find(item=>item.id===expanded)||sorted[0];
  function updateScroll(){const node=list.current;if(node){setScrolled(node.scrollTop>1);setHasMore(node.scrollTop+node.clientHeight<node.scrollHeight-2);}}
  useLayoutEffect(()=>{
    const resize=()=>{
      if(root.current){
        const scale=root.current.clientWidth/NATIVE_WIDTH;
        const height=root.current.clientHeight/Math.max(scale,.01);
        setViewport({scale,height});setCompact(height<680);
      }
      updateScroll();
    };
    resize();
    const observer=new ResizeObserver(resize);
    if(root.current)observer.observe(root.current);
    if(list.current)observer.observe(list.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{updateScroll();},[expanded,evidenceOpen,sort,runs]);
  return <div ref={root} className="nh-viewport"><div className={`nh-screen ${compact?'nh-compact':''}`} style={{width:NATIVE_WIDTH,height:viewport.height,transform:`scale(${viewport.scale})`} as CSSProperties}>
    <img className="nh-trail-image" src={asset('history-running-trail.jpg')} alt="" aria-hidden="true"/>
    <header className="nh-header"><button onClick={onBack}>Back to run</button><h1>LOG HISTORY</h1></header>
    {summary&&<section className="nh-metrics" aria-label="Selected saved run summary">
      <div className="nh-metrics-top"><div className="nh-distance"><strong>{summary.distance.toFixed(2)} mi</strong><span>DISTANCE</span></div><div className="nh-energy-source"><span>{summary.postEnergy||summary.reflection?`ENERGY · ${energyLabel(summary).toUpperCase()}`:'ENERGY NOT RECORDED'}</span><small>GPS metrics</small></div></div>
      <p className="nh-date">{dateLabel(summary.completedAt)}</p>
      {!compact&&<div className="nh-metrics-bottom"><div><strong>{summary.averagePace} /mi</strong><span>PACE</span></div><div><strong>{formatTime(summary.activeSeconds)}</strong><span>TIME</span></div></div>}
    </section>}
    {runs.length>0&&<><div className="nh-filters" role="group" aria-label="Sort saved runs">{sortChoices.map(label=><button key={label} aria-pressed={sort===label} onClick={()=>{setSort(label);setExpanded(null);setEvidenceOpen(false);if(list.current)list.current.scrollTop=0;}}>{label}</button>)}</div><div className="nh-saved-heading"><h2>YOUR SAVED RUNS</h2><span>{sorted.length} {sorted.length===1?'activity':'activities'}</span></div></>}
    <div className={`nh-list ${scrolled?'nh-scroll-top':''} ${hasMore?'nh-scroll-bottom':''}`} ref={list} onScroll={updateScroll}>
      {runs.length>0&&<button className="nh-energy-row" aria-haspopup="dialog" aria-expanded={evidenceOpen} aria-controls="history-energy-sheet" onClick={()=>setEvidenceOpen(true)}><span>YOUR ENERGY</span><span>View check-ins<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 6 6-6 6"/></svg></span></button>}
      {sorted.map(item=>{
        const open=expanded===item.id;
        return <article className={`nh-record ${open?'nh-record-expanded':''}`} key={item.id}>
          <button className="nh-record-toggle" aria-expanded={open} aria-controls={`history-record-${item.id}`} aria-label={`${open?'Close':'Open'} run details, ${item.distance.toFixed(2)} miles, ${dateLabel(item.completedAt)}`} onClick={()=>setExpanded(open?null:item.id)}>
            <span className="nh-record-top"><i/><span className="nh-record-distance"><strong>{item.distance.toFixed(2)} mi</strong><span>{formatTime(item.activeSeconds)} time · {item.averagePace} /mi pace</span></span><span className="nh-record-date"><time dateTime={item.completedAt}>{dateLabel(item.completedAt)}</time><span>{open?'CLOSE −':'OPEN +'}</span></span></span>
            <span className="nh-record-source"><span>GPS metrics</span>{open&&<strong>{item.reflection?'Reflection saved':'Saved run'}</strong>}</span>
          </button>
          {open&&<div className="nh-record-content" id={`history-record-${item.id}`}>
            <h3>RUNSTATE</h3><p className="nh-reflection">{item.reflection||'No reflection saved for this run.'}</p>
            <div className="nh-no-music"><p>Music wasn’t recorded for this run.</p><p>Enable Observe music before a future run to save available song details.</p></div>
            <p className="nh-active-time">Active time · {formatTime(item.activeSeconds)}</p>
            {item.preEnergy&&<p className="nh-before-energy">Before run · {item.preEnergy}</p>}
            {item.note&&<section className="nh-note"><h3>YOUR NOTE</h3><p>{item.note}</p></section>}
            <p className="nh-after-energy">After run · {energyLabel(item)}</p>
            <p className="nh-effort">EFFORT · {effortLabel(item)}</p>
          </div>}
        </article>;
      })}
      {!runs.length&&<section className="nh-empty"><h2>Your first run starts the story.</h2><p>Complete a run and it will appear here with its saved details and reflection.</p></section>}
    </div>
    {evidenceOpen&&<EnergyEvidence runs={runs} onClose={()=>setEvidenceOpen(false)}/>}
  </div></div>;
}
