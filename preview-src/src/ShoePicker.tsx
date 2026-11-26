import {useEffect, useRef, useState} from 'react';
import catalog from './shoe-catalog.json';
import './shoe-picker.css';

export type DemoShoe = {id:string;brand:string;model:string;nickname?:string;goalMiles:number;archived?:boolean};
type Props = {onClose:()=>void;onSelect:(pair:DemoShoe)=>void;value?:DemoShoe|null;pairs:DemoShoe[];onPairsChange:(pairs:DemoShoe[])=>void};
const brands=['Nike','Adidas','Altra','ASICS','Brooks','Dynafit','HOKA','Inov-8','La Sportiva','Merrell','Mizuno','New Balance','Newton','On','Puma','Reebok','Salomon','Saucony','Scott','Skechers','The North Face','Topo Athletic','Under Armour','Vibram','Vivobarefoot','Zoot'];
function brandKey(value:string){
  const key=value.trim().toLowerCase();
  return ({'hoka one one':'hoka','on cloud':'on','on running':'on','topo':'topo athletic','inov8':'inov-8','inov 8':'inov-8'} as Record<string,string>)[key]??key;
}
function brandMatches(brand:string, query:string){
  const aliases:Record<string,string>={hoka:'hoka one one',on:'on cloud on running','topo athletic':'topo','inov-8':'inov8 inov 8'};
  return `${brand} ${aliases[brandKey(brand)]??''}`.toLowerCase().includes(query);
}
type Draft={id?:string;brand:string;model:string;nickname:string;goal:string;custom:boolean};

/** Session-only examples. The public catalog intentionally excludes private product photos. */
export function ShoePicker({onClose,onSelect,value,pairs,onPairsChange}:Props){
  const [selectedBrand,setSelectedBrand]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [draft,setDraft]=useState<Draft|null>(null);
  const [archivedOpen,setArchivedOpen]=useState(false);
  const [undo,setUndo]=useState<DemoShoe|null>(null);
  const list=useRef<HTMLDivElement>(null);
  const search=query.trim().toLowerCase();
  const matches=(text:string)=>text.toLowerCase().includes(search);
  const allBrands=[...brands,...pairs.map(p=>p.brand).filter((brand,index,all)=>all.findIndex(other=>brandKey(brand)===brandKey(other))===index&&!brands.some(other=>brandKey(other)===brandKey(brand)))];
  const shownBrands=allBrands.filter(brand=>!search||brandMatches(brand,search)||catalog.some(p=>brandKey(p.brand)===brandKey(brand)&&matches(p.model))||pairs.some(p=>brandKey(p.brand)===brandKey(brand)&&matches(`${p.model} ${p.nickname??''}`)));
  const inBrand=pairs.filter(p=>brandKey(p.brand)===brandKey(selectedBrand??'')&&matches(`${p.brand} ${p.model} ${p.nickname??''}`));
  const choices=catalog.filter(p=>brandKey(p.brand)===brandKey(selectedBrand??'')&&(matches(p.model)||brandMatches(p.brand,search))&&!pairs.some(saved=>brandKey(saved.brand)===brandKey(p.brand)&&saved.model.toLowerCase()===p.model.toLowerCase()));
  const goal=Number(draft?.goal.trim().replace(',','.'));
  const validGoal=Number.isFinite(goal)&&goal>0&&goal<=100000;
  const valid=!!draft?.brand.trim()&&!!draft?.model.trim()&&validGoal;
  const goalError=!!draft?.goal.trim()&&!validGoal;
  const openPair=(brand:string,model:string,pair?:DemoShoe,custom=false)=>setDraft({id:pair?.id,brand,model,nickname:pair?.nickname??'',goal:pair?String(pair.goalMiles):'',custom});
  const back=()=>{if(draft)setDraft(null);else{setSelectedBrand(null);setQuery('');setArchivedOpen(false);}};
  useEffect(()=>{list.current?.scrollTo(0,0);},[selectedBrand,!!draft]);
  function save(){
    if(!draft||!valid)return;
    const pair:DemoShoe={id:draft.id??`example-shoe-${crypto.randomUUID()}`,brand:draft.brand.trim(),model:draft.model.trim(),nickname:draft.nickname.trim()||undefined,goalMiles:goal};
    onPairsChange(draft.id?pairs.map(p=>p.id===draft.id?pair:p):[...pairs,pair]);
    onSelect(pair);
  }
  function archive(pair:DemoShoe){setUndo(pair);onPairsChange(pairs.map(p=>p.id===pair.id?{...p,archived:true}:p));}
  return <div className="rs-shoe-picker">
    <header className="rs-shoe-picker-heading">
      {(selectedBrand||draft)&&<button onClick={back}>Back</button>}
      <h2 id="shoe-picker-title">Add Shoes</h2><button onClick={onClose}>Close</button>
    </header>
    {!draft&&<label className="rs-shoe-picker-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg><input aria-label={selectedBrand?`Search ${selectedBrand}`:'Search brands or shoes'} placeholder={selectedBrand?`Search ${selectedBrand}`:'Search brands or shoes'} value={query} onChange={e=>setQuery(e.target.value)}/></label>}
    {undo&&<div className="rs-shoe-picker-undo" role="status"><span>{undo.nickname||undo.model} archived</span><button onClick={()=>{onPairsChange(pairs.map(p=>p.id===undo.id?{...p,archived:false}:p));setUndo(null);}}>Undo</button></div>}
    <div className="rs-shoe-picker-list" ref={list}>
      {draft?<form className="rs-shoe-picker-form" onSubmit={e=>{e.preventDefault();save();}}>
        {draft.custom?<><h3>Add different shoes</h3><label>Brand<input autoComplete="off" maxLength={60} value={draft.brand} onChange={e=>setDraft({...draft,brand:e.target.value})}/></label><label>Model<input autoComplete="off" maxLength={80} value={draft.model} onChange={e=>setDraft({...draft,model:e.target.value})}/></label></>:<div className="rs-shoe-picker-model-heading"><span>{draft.brand}</span><h3>{draft.model}</h3>{draft.id&&<small>0.0 MI</small>}</div>}
        <label className={goalError?'has-error':''}>Mileage goal (required)<div className="rs-shoe-picker-input-unit"><input aria-label="Mileage goal (required)" aria-invalid={goalError} aria-describedby="shoe-goal-help" inputMode="decimal" autoComplete="off" maxLength={12} value={draft.goal} onChange={e=>setDraft({...draft,goal:e.target.value})}/><span>mi</span></div></label>
        <p id="shoe-goal-help" className={goalError?'is-error':''}>{goalError?'Enter more than 0 and up to 100,000 miles.':'Your total-mileage target for this pair.'}</p>
        {!draft.id&&<label>Pair nickname (optional)<input autoComplete="off" maxLength={40} value={draft.nickname} onChange={e=>setDraft({...draft,nickname:e.target.value})}/></label>}
        <button className="rs-shoe-picker-save" disabled={!valid} type="submit">{draft.id?'Save and select':'Add and select'}</button>
      </form>:selectedBrand===null?<>
        <h3>Select Your Brand</h3>
        {shownBrands.map(brand=><button className="rs-shoe-picker-brand" key={brand} onClick={()=>{setSelectedBrand(brand);setQuery('');}}><span>{brand}</span><span aria-hidden="true">›</span></button>)}
        {!shownBrands.length&&<p className="rs-shoe-picker-empty">No matching brands or shoes.</p>}
      </>:<>
        <h3>{selectedBrand}</h3>
        {inBrand.filter(p=>!p.archived).map(pair=><div className="rs-shoe-picker-saved" key={pair.id}><button onClick={()=>openPair(pair.brand,pair.model,pair)} aria-label={`Select ${pair.nickname||pair.model}`}><strong>{pair.nickname||pair.model}</strong>{pair.nickname&&<small>{pair.model}</small>}<small>0.0 MI{value?.id===pair.id?' · Selected':''}</small></button><button className="rs-shoe-picker-archive" onClick={()=>archive(pair)}>Archive</button></div>)}
        {choices.map(pair=><button className="rs-shoe-picker-model" key={`${pair.brand}:${pair.model}`} onClick={()=>openPair(pair.brand,pair.model)}>{pair.model}</button>)}
        {!choices.length&&!inBrand.some(p=>!p.archived)&&<p className="rs-shoe-picker-empty">{search?'No matching shoes.':'Add your model below.'}</p>}
        {pairs.some(p=>brandKey(p.brand)===brandKey(selectedBrand)&&p.archived)&&<button className="rs-shoe-picker-text" onClick={()=>setArchivedOpen(!archivedOpen)}>{archivedOpen?'Hide':'Show'} archived shoes</button>}
        {archivedOpen&&inBrand.filter(p=>p.archived).map(pair=><div className="rs-shoe-picker-archived" key={pair.id}><span>{pair.nickname||pair.model}<small>0.0 MI</small></span><button onClick={()=>onPairsChange(pairs.map(p=>p.id===pair.id?{...p,archived:false}:p))}>Restore</button></div>)}
      </>}
      {!draft&&<button className="rs-shoe-picker-text" onClick={()=>openPair(selectedBrand??'','',undefined,true)}>Add different shoes</button>}
    </div>
  </div>;
}
