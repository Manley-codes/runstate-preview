import { useEffect, useRef, useState } from 'react';
import { Cross2Icon, GearIcon, ArrowRightIcon, ResetIcon } from '@radix-ui/react-icons';
import ActiveRun from './ActiveRun';
import { Opening, StartScreen } from './OpeningStart';
import { CompleteScreen, HistoryScreen } from './CompleteHistory';
import { asset, exampleHistory, exampleRun, type Appearance, type DemoRun, type Energy } from './demo';

type Page='opening'|'start'|'countdown'|'active'|'music'|'complete'|'history';
const pages: {id:Page,label:string,detail:string}[]=[
  {id:'opening',label:'Opening',detail:'A little movement before the first step.'},
  {id:'start',label:'Set your energy',detail:'Choose how you feel, then start when you are ready.'},
  {id:'countdown',label:'Countdown',detail:'Watch the countdown settle into the run. Start now skips the wait.'},
  {id:'active',label:'Your run',detail:'Tap Spotify Music to bring your music inside the distance dial.'},
  {id:'music',label:'Music within reach',detail:'Try the player controls, then close the player to return to distance.'},
  {id:'complete',label:'Finish & reflect',detail:'Record how you feel and explore a saved example reflection.'},
  {id:'history',label:'Revisit a run',detail:'Compare the example runs and open one to revisit its details.'},
];
function initialPage():Page {
  const hash=location.hash.slice(1);
  if(pages.some(p=>p.id===hash))return hash as Page;
  if(location.pathname.endsWith('/complete.html'))return 'complete';
  if(location.pathname.endsWith('/log.html'))return 'history';
  if(location.pathname.endsWith('/start.html'))return 'start';
  return 'opening';
}
function initialAppearance():Appearance {
  try{return localStorage.getItem('runstate-public-appearance')==='day'?'day':'night';}catch{return 'night';}
}
export default function App(){
  const [page,setPage]=useState<Page>(initialPage);
  const [appearance,setAppearance]=useState<Appearance>(initialAppearance);
  const [energy,setEnergy]=useState<Energy>(null);
  const [run,setRun]=useState<DemoRun>(()=>exampleRun(null));
  const [finished,setFinished]=useState<DemoRun[]>([]);
  const [revision,setRevision]=useState(0);
  const [paused,setPaused]=useState(false);
  const [sheet,setSheet]=useState<'settings'|'music'|'map'|null>(null);
  const phone=useRef<HTMLDivElement>(null);
  const activePage=pages.find(p=>p.id===page)!;
  function navigate(next:Page){
    if(next==='countdown'||next==='active'||next==='music')setRun(exampleRun(energy));
    setPaused(false);setPage(next);setSheet(null);setRevision(v=>v+1);
    history.replaceState(null,'',`#${next}`);
  }
  useEffect(()=>{
    const onHash=()=>{const next=initialPage();if(next==='countdown'||next==='active'||next==='music')setRun(exampleRun(energy));setPaused(false);setPage(next);setSheet(null);setRevision(v=>v+1);};
    window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);
  },[energy]);
  function begin(){setRun(exampleRun(energy));navigate('countdown');}
  function finish(next:DemoRun){
    const saved={...next,id:`example-finished-${Date.now()}`};
    setRun(saved);setFinished(old=>[saved,...old]);navigate('complete');
  }
  function updateRun(next:DemoRun){
    setRun(next);setFinished(old=>old.some(r=>r.id===next.id)?old.map(r=>r.id===next.id?next:r):[next,...old]);
  }
  function reset(){setEnergy(null);setRun(exampleRun(null));setFinished([]);navigate('opening');}
  function chooseAppearance(next:Appearance){
    setAppearance(next);try{localStorage.setItem('runstate-public-appearance',next);}catch{/* Optional preference only. */}
  }
  useEffect(()=>{
    if(!sheet)return;
    const root=phone.current;
    const previous=document.activeElement as HTMLElement|null;
    const dialog=root?.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.querySelector<HTMLElement>('button')?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){setSheet(null);return;}
      if(event.key!=='Tab'||!dialog)return;
      const targets=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]'));
      const first=targets[0],last=targets.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();};
  },[sheet]);
  return <main className="showcase">
    <aside className="showcase-guide">
      <a className="showcase-wordmark" href="https://github.com/Manley-codes/RunState">RUNSTATE<span>ANDROID APP PREVIEW</span></a>
      <h1>Your run.<br/><span>Your rhythm.</span></h1>
      <p className="showcase-lede">The numbers tell part of the story.<br/>Explore what surrounds the run.</p>
      <nav aria-label="Explore app screens" className="screen-nav">{pages.map((p,i)=><button key={p.id} aria-current={page===p.id?'page':undefined} onClick={()=>navigate(p.id)}><span className="nav-number">0{i+1}</span><span>{p.label}</span><ArrowRightIcon/></button>)}</nav>
      <p className="interaction-hint">{activePage.detail}</p>
      {(page==='active'||page==='music')&&<p className="finish-hint">To finish: Pause, then hold Stop.</p>}
      <div className="showcase-tools"><button onClick={()=>setSheet('settings')}><GearIcon/>Appearance</button><button onClick={reset}><ResetIcon/>Restart</button></div>
      <p className="demo-disclosure">Interactive browser demo · example run data.<br/>Music controls are silent. Reflections are scripted examples. No live GPS or Spotify connection.</p>
      <footer><a href="https://github.com/Manley-codes/RunState">Explore the project ↗</a><a href="https://github.com/Manley-codes/runstate-preview/tree/28a974a73c10a7cdec03acc21c6efd5e7eb1c6ba">Earlier designs ↗</a><span>Designed & built by Manley Johnson</span></footer>
    </aside>
    <section className="preview-stage" aria-label="RunState interactive phone preview">
      <div className="mobile-preview-toolbar"><span>RUNSTATE <small>DEMO</small></span><label className="sr-only" htmlFor="jump-screen">Choose a screen</label><select id="jump-screen" value={page} onChange={e=>navigate(e.target.value as Page)}>{pages.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select><button onClick={()=>setSheet('settings')} aria-label="Preview appearance"><GearIcon/></button></div>
      <div className={'phone-frame '+((page==='countdown'||page==='active'||page==='music')&&appearance==='night'?'phone-dark':'')}>
        <div ref={phone} className="phone-screen" data-screen={page}>
          <div className="screen-content" inert={sheet!==null}>
            {page==='opening'&&<Opening key={revision} onContinue={()=>navigate('start')}/>}
            {page==='start'&&<StartScreen key={revision} energy={energy} onEnergy={setEnergy} onStart={begin} onHistory={()=>navigate('history')} onSettings={()=>setSheet('settings')} onMusic={()=>setSheet('music')} onMap={()=>setSheet('map')}/>}
            {(page==='countdown'||page==='active'||page==='music')&&<ActiveRun key={revision} appearance={appearance} initialMode={page} run={run} onFinish={finish} onCancel={()=>navigate('start')} onMap={()=>setSheet('map')} onStarted={()=>{setPage('active');history.replaceState(null,'','#active');}} onPausedChange={setPaused}/>}
            {page==='complete'&&<CompleteScreen key={revision} run={run} onChange={updateRun} onHistory={()=>{updateRun(run);navigate('history');}} onNewRun={()=>navigate('start')}/>}
            {page==='history'&&<HistoryScreen key={revision} runs={[...finished,...exampleHistory]} onBack={()=>navigate('start')}/>}
          </div>
          {sheet&&<div className="preview-sheet-backdrop" onClick={()=>setSheet(null)}><section className="preview-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={e=>e.stopPropagation()}><button className="sheet-close" onClick={()=>setSheet(null)} aria-label="Close"><Cross2Icon/></button>
            <span className="sheet-eyebrow">RUNSTATE PREVIEW</span>
            <h2 id="sheet-title">{sheet==='settings'?'Run appearance':sheet==='music'?'Music within reach':'A view of your route'}</h2>
            {sheet==='settings'?<><p>The countdown and Active Run screen share your choice.</p><div className="theme-choices"><button onClick={()=>chooseAppearance('night')} aria-pressed={appearance==='night'}><span className="theme-swatch dark-swatch"/>Dark</button><button onClick={()=>chooseAppearance('day')} aria-pressed={appearance==='day'}><span className="theme-swatch light-swatch"/>Light</button></div><button className="sheet-primary" onClick={()=>setSheet(null)}>Done</button></>
            :sheet==='music'?<><img className="sheet-music-art" src={asset('start-music.jpg')} alt="RunState headphones artwork"/><p>During a run, tap Spotify Music to switch from distance to the player. Try the silent example controls here.</p><button className="sheet-primary" onClick={()=>navigate('music')}>Explore the player <ArrowRightIcon/></button></>
            :<><div className="map-demo-graphic" aria-hidden="true"><svg viewBox="0 0 300 200"><path d="M0 72H300M0 140H300M75 0V200M210 0V200" stroke="#cfdbcb" strokeWidth="12"/><path d="M60 159Q70 32 150 61T247 155" stroke="#71896b" strokeWidth="5" fill="none" strokeLinecap="round"/><circle cx="60" cy="159" r="8" fill="#7353ef"/><circle cx="247" cy="155" r="8" fill="#315b45"/></svg></div><p>The Android app can show your recorded route. This illustration is fictional; the preview does not request your location.</p><button className="sheet-primary" onClick={()=>setSheet(null)}>Back to the screen</button></>}
          </section></div>}
        </div>
      </div>
      <div className="mobile-demo-note"><span>{paused?'Hold Stop to finish · example run':'Example data · silent music · scripted reflection'}</span><button onClick={reset}>Restart</button></div>
    </section>
  </main>;
}
