import { useEffect, useRef, useState } from 'react';
import { asset } from './demo';
import './trail-preview.css';

type Trail = { id:string; name:string; description:string; website:string; credit:string; source:string; license:string; licenseUrl:string };
export const houstonTrails:Trail[] = [
  {id:'memorial',name:'Memorial Park',description:'Seymour Lieberman Trail',website:'https://www.memorialparkconservancy.org/visit/things_to_do/trails/',credit:'Beverly Moseley / USDA NRCS Texas',source:'https://commons.wikimedia.org/wiki/File:Joggers_along_the_Seymour_Lieberman_Exer-Trail_at_Memorial_Park_in_Houston.NRCS_photo_by_Beverly_Moseley._(25116673655).jpg',license:'CC BY 2.0',licenseUrl:'https://creativecommons.org/licenses/by/2.0/'},
  {id:'hermann',name:'Hermann Park',description:'Marvin Taylor Trail',website:'https://hermannpark.org/place/marvin-taylor-trail/',credit:'WhisperToMe',source:'https://commons.wikimedia.org/wiki/File:MarvinTaylorTrailHoustonTX.JPG',license:'Public domain',licenseUrl:'https://commons.wikimedia.org/wiki/File:MarvinTaylorTrailHoustonTX.JPG#Licensing'},
  {id:'buffalo_bayou',name:'Buffalo Bayou Park',description:'Trails along the bayou',website:'https://buffalobayou.org/location/buffalo-bayou-park/',credit:'Michael Barera',source:'https://commons.wikimedia.org/wiki/File:Houston_May_2022_13_(Buffalo_Bayou_Park_and_skyline).jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'},
  {id:'terry_hershey',name:'Terry Hershey Park',description:'Wooded trails along Buffalo Bayou',website:'https://cp4.harriscountytx.gov/Explore/Parks/Precinct-4-Parks/terry-hershey-park',credit:'Scott Ehardt',source:'https://commons.wikimedia.org/wiki/File:Terry_Hershey_Park_trail.jpg',license:'Public domain',licenseUrl:'https://commons.wikimedia.org/wiki/File:Terry_Hershey_Park_trail.jpg'},
];
const photo = (trail:Trail) => asset(`trails/trail_${trail.id}_photo.jpg`);
const map = (trail:Trail) => asset(`trails/trail_${trail.id}_map.png`);
const CYCLE = 4 * 116;

/** Decorative repeats have one accessible equivalent: the finite Houston trails browser. */
export function TrailBackground({onTrail,paused}:{onTrail:(id:string)=>void;paused:boolean}) {
  const host = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null);
  const offset = useRef(0), resumeAt = useRef(0), pausedRef = useRef(paused);
  const drag = useRef<{id:number;y:number;startY:number;distance:number}|null>(null);
  const paint = () => {
    offset.current = ((offset.current % CYCLE) + CYCLE) % CYCLE;
    if(track.current)track.current.style.transform=`translate3d(0,${-offset.current}px,0)`;
  };
  pausedRef.current=paused;
  useEffect(()=>{
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=performance.now();
    const animate=(now:number)=>{
      const delta=Math.min((now-last)/1000,.05);last=now;
      if(!document.hidden&&!pausedRef.current&&!reduced.matches&&!drag.current&&now>=resumeAt.current){offset.current+=delta*4;paint();}
      frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    const wheel=(event:WheelEvent)=>{
      if(pausedRef.current)return;
      event.preventDefault();
      offset.current+=event.deltaY*(event.deltaMode===1?16:1);
      resumeAt.current=performance.now()+12000;paint();
    };
    const el=host.current;el?.addEventListener('wheel',wheel,{passive:false});
    return()=>{cancelAnimationFrame(frame);el?.removeEventListener('wheel',wheel);};
  },[]);
  const open=(id:string,clientY:number)=>{
    const el=host.current;if(!el||pausedRef.current)return;
    const bounds=el.getBoundingClientRect(),styles=getComputedStyle(el);
    const y=(clientY-bounds.top)*el.clientHeight/bounds.height;
    const top=parseFloat(styles.getPropertyValue('--trail-clear-top'))||250;
    const bottom=parseFloat(styles.getPropertyValue('--trail-clear-bottom'))||510;
    if(y>=top&&y<=bottom)onTrail(id);
  };
  return <div ref={host} className="rs-trail-background" aria-hidden="true"
    onPointerDown={event=>{
      if(paused)return;
      drag.current={id:event.pointerId,y:event.clientY,startY:event.clientY,distance:0};
      event.currentTarget.setPointerCapture(event.pointerId);resumeAt.current=performance.now()+12000;
    }}
    onPointerMove={event=>{
      const current=drag.current,el=host.current;if(!current||!el||current.id!==event.pointerId)return;
      const scale=el.clientHeight/el.getBoundingClientRect().height;
      offset.current+=(current.y-event.clientY)*scale;
      current.y=event.clientY;current.distance=Math.max(current.distance,Math.abs(current.startY-event.clientY));paint();
    }}
    onPointerUp={event=>{
      const current=drag.current;drag.current=null;resumeAt.current=performance.now()+12000;
      if(!current||current.distance>6)return;
      const el=host.current;if(!el)return;
      const bounds=el.getBoundingClientRect();
      const y=(event.clientY-bounds.top)*el.clientHeight/bounds.height;
      const index=Math.floor((y+offset.current)/116)%houstonTrails.length;
      open(houstonTrails[index].id,event.clientY);
    }}
    onPointerCancel={()=>{drag.current=null;resumeAt.current=performance.now()+12000;}}>
    <div ref={track} className="rs-trail-track">{Array.from({length:4},(_,cycle)=>houstonTrails.map(trail=><div className="rs-trail-band" key={`${cycle}-${trail.id}`} data-trail={trail.id} style={{backgroundImage:`url("${map(trail)}")`}}>
      <img src={photo(trail)} alt="" draggable={false}/><span>{trail.name}</span>
    </div>))}</div>
    <div className="rs-trail-fade"/>
    <span className="rs-trail-map-credit">© OpenStreetMap contributors</span>
  </div>;
}

export function TrailBrowser({initialTrail=null,onClose}:{initialTrail?:string|null;onClose:()=>void}) {
  const [selected,setSelected]=useState<string|null>(initialTrail);
  const trail=houstonTrails.find(item=>item.id===selected);
  const scroll=useRef<HTMLDivElement>(null),header=useRef<HTMLElement>(null),previousSelected=useRef(selected);
  useEffect(()=>{
    scroll.current?.scrollTo(0,0);
    // A list row unmounts on drilldown. Keep keyboard focus inside the dialog;
    // initial focus/return-to-trigger remain owned by the parent modal.
    if(previousSelected.current!==selected)header.current?.querySelector<HTMLButtonElement>('button')?.focus();
    previousSelected.current=selected;
  },[selected]);
  return <div className="rs-trail-browser">
    <header ref={header}>{trail&&<button onClick={()=>setSelected(null)} aria-label="Back to Houston trails">‹</button>}<h2 id="trail-browser-title">{trail?trail.name:'Houston trails'}</h2><button onClick={onClose}>Close</button></header>
    <div ref={scroll} className="rs-trail-browser-scroll">
      {trail?<article className="rs-trail-detail">
        <img className="rs-trail-detail-photo" src={photo(trail)} alt={`${trail.name}: ${trail.description}`}/>
        <h3>{trail.description}</h3>
        <img className="rs-trail-detail-map" src={map(trail)} alt={`Static area map of ${trail.name}`}/>
        <p>Park-area overview · not a recorded route or navigation.</p>
        <a className="rs-trail-park-link" href={trail.website} target="_blank" rel="noreferrer">Visit park website ↗</a>
        <div className="rs-trail-credits"><p>Photo: {trail.credit} · <a href={trail.source} target="_blank" rel="noreferrer">Original photograph</a> · <a href={trail.licenseUrl} target="_blank" rel="noreferrer">{trail.license}</a>. Resized at source and cropped to fit.{trail.id==='buffalo_bayou'?' This photo and display crop remain under CC BY-SA 4.0.':''}</p>
        <p>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, ODbL. RunState cartography, November 2026.</p></div>
      </article>:<><div className="rs-trail-list">{houstonTrails.map(item=><button key={item.id} onClick={()=>setSelected(item.id)}><img src={photo(item)} alt=""/><span><strong>{item.name}</strong><small>{item.description}</small></span><b aria-hidden="true">›</b></button>)}</div><a className="rs-trail-more" href="https://www.visithoustontexas.com/blog/post/healthy-in-houston/" target="_blank" rel="noreferrer">More places around Houston ↗</a><p className="rs-trail-browser-note">Explore the parks. Viewing a trail does not start a run.</p></>}
    </div>
  </div>;
}
