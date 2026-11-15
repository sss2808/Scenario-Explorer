import React from 'react';
import {entityIndex} from './contracts/semantic.mjs';

type Scenario = {id:string;label:string;archetypeId:string;conditionalProposition:string;assumptionIds:string[];mechanismIds:string[];criticalUncertaintyStateIds:string[];normativeGoal?:string};
type Checkpoint = {checkpointId:string;offsetYears:number;label:string};
type Cell = {id:string;scenarioId:string;checkpointId:string;milestoneIds:string[];summary:string;emptyReason?:string};
type Suite = {manifest:{packageId:string;packageRevision:number;contentSha256:string};scenarioSuite:{title:string;focalQuestion:string;referenceDate:string;checkpoints:Checkpoint[]};referenceState:{summary:string};scenarios:Scenario[];scenarioCheckpointStates:Cell[];milestones:Array<{id:string;conditionalStateChange:string}>;[key:string]:any};

function Summary({value}:{value:any}) {
  if(!value)return <p>Not supplied in the fictional package.</p>;
  if(Array.isArray(value))return <p>{value.length?value.join('; '):'No items supplied'}</p>;
  return <p>{String(value)}</p>;
}
export default function App({suite}:{suite:Suite}) {
  const scenarios=suite.scenarios;
  const checkpoints=suite.scenarioSuite.checkpoints;
  const [horizon,setHorizon]=React.useState(checkpoints[1].checkpointId);
  const [left,setLeft]=React.useState(scenarios[0].id);
  const [right,setRight]=React.useState(scenarios[1].id);
  const [selected,setSelected]=React.useState('cell-baseline-5');
  const [inspectorOpen,setInspectorOpen]=React.useState(true);
  const [showAllText,setShowAllText]=React.useState(false);
  const inspectorRef=React.useRef<HTMLElement>(null);
  const index=React.useMemo(()=>entityIndex(suite),[suite]);
  const sc=(id:string)=>scenarios.find(s=>s.id===id);
  const cell=(sid:string,cp:string)=>suite.scenarioCheckpointStates.find(c=>c.scenarioId===sid&&c.checkpointId===cp);
  const look=(id:string)=>index.get(id) as any;
  const itemLabel=(id:string)=>{const r=look(id);return r?.statement||r?.conditionalStateChange||r?.conditionalProcess||r?.observableDescription||r?.qualification||r?.alternativePremise||r?.summary||r?.label||r?.proposition||id;};
  function inspect(id:string){setSelected(id);setInspectorOpen(true);}
  const inspected=look(selected);
  const activeCp=checkpoints.find(c=>c.checkpointId===horizon)||checkpoints[0];
  const related=inspected?([...new Set([
    ...(inspected.assumptionIds||[]),...(inspected.mechanismIds||[]),...(inspected.signpostIds||[]),
    ...(inspected.counterpathIds||[]),...(inspected.criticalUncertaintyStateIds||[]),
    ...suite.relationships.filter((r:any)=>r.fromId===selected||r.toId===selected).map((r:any)=>r.id)
  ])] as string[]):[];
  const header=(s:Scenario)=>s.label+(s.archetypeId==='ideal'?' (preferred, conditional)':'');
  const details=(s:Scenario)=> {
    const c=cell(s.id,horizon),m=c?.milestoneIds[0];
    return {scenario:s.label,premise:s.conditionalProposition,change:m?itemLabel(m):c?.emptyReason||'No milestone supplied',mechanism:s.mechanismIds.map(itemLabel).join('; '),signpost:(c?.milestoneIds.length?suite.milestones.find((x:any)=>x.id===m):null)?itemLabel('sign-audit'):'No signpost attached to an event',review:'Hypothetical, not an observed future'};
  };
  const a=details(sc(left)||scenarios[0]),b=details(sc(right)||scenarios[1]);
  return <div className="shell">
    <header className="hero">
      <p className="eyebrow">Scenario Explorer</p>
      <h1>{suite.scenarioSuite.title}</h1>
      <p>{suite.scenarioSuite.focalQuestion}</p>
      <div className="synthetic" role="note"><strong>SYNTHETIC DEMONSTRATION</strong><span>Entirely fictional. Not GSA evidence, forecasts or probability estimates.</span></div>
    </header>
    <main>
      <section className="reference" aria-labelledby="reference-heading">
        <div><p className="eyebrow">Starting condition</p><h2 id="reference-heading">Reference state</h2></div>
        <p>{suite.referenceState.summary}</p><p className="reference-date">As of {suite.scenarioSuite.referenceDate}</p>
      </section>
      <section aria-labelledby="matrix-heading" className="section">
        <div className="section-head"><div><p className="eyebrow">Alternative futures</p><h2 id="matrix-heading">Four-path comparison</h2></div><p className="quiet">Assessment windows are not predicted event dates.</p></div>
        <div className="matrix-wrap">
          <table className="matrix">
            <caption>Fictional scenarios compared at three relative assessment windows. Select any cell to inspect its claims.</caption>
            <thead><tr><th scope="col">Scenario</th>{checkpoints.map(cp=><th key={cp.checkpointId} scope="col">{cp.label}</th>)}</tr></thead>
            <tbody>{scenarios.map(s=><tr key={s.id}><th scope="row">{header(s)}<span className="row-context">{s.conditionalProposition}</span></th>{checkpoints.map(cp=>{
              const c=cell(s.id,cp.checkpointId);
              if(!c)return <td key={cp.checkpointId}>Unavailable</td>;
              const active=c.id===selected || c.milestoneIds.includes(selected);
              return <td key={cp.checkpointId}><button className={'cell-button'+(active?' chosen':'')} aria-pressed={active} onClick={()=>{setHorizon(cp.checkpointId);inspect(c.milestoneIds[0]||c.id);}}>
                <span className="cell-window">{cp.label}</span><span>{c.milestoneIds.length?itemLabel(c.milestoneIds[0]):c.emptyReason}</span>
                <span className="cell-action">Inspect claim</span></button></td>;
            })}</tr>)}</tbody>
          </table>
        </div>
        <div className="mobile-cells" aria-label="Mobile scenario comparison">
          <label htmlFor="mobile-cp">Assessment window</label><select id="mobile-cp" value={horizon} onChange={e=>setHorizon(e.target.value)}>{checkpoints.map(c=><option key={c.checkpointId} value={c.checkpointId}>{c.label}</option>)}</select>
          {scenarios.map(s=>{const c=cell(s.id,horizon);return <div className="mobile-cell" key={s.id}><h3>{header(s)}</h3><p>{c?.milestoneIds[0]?itemLabel(c.milestoneIds[0]):c?.emptyReason}</p><button onClick={()=>c&&inspect(c.milestoneIds[0]||c.id)}>Inspect {s.label}</button></div>;})}
        </div>
      </section>
      <section className="section" aria-labelledby="diff-heading">
        <div className="section-head"><div><p className="eyebrow">Conditional contrast</p><h2 id="diff-heading">Compare two futures</h2></div><label>Window <select value={horizon} onChange={e=>setHorizon(e.target.value)}>{checkpoints.map(c=><option key={c.checkpointId} value={c.checkpointId}>{c.label}</option>)}</select></label></div>
        <div className="chooser"><label>First future <select value={left} onChange={e=>setLeft(e.target.value)}>{scenarios.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label><label>Second future <select value={right} onChange={e=>setRight(e.target.value)}>{scenarios.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label></div>
        {left===right?<p className="help">Choose two different futures to see their contrasting premises.</p>:<div className="diff" role="group" aria-label={'Two scenarios at '+activeCp.label}>
          {[a,b].map((d,i)=><article className="comparison-card" key={i}><h3>{d.scenario}</h3><h4>Defining premise</h4><p>{d.premise}</p><h4>Conditional checkpoint</h4><p>{d.change}</p><h4>Underlying mechanism</h4><p>{d.mechanism}</p><h4>Signpost</h4><p>{d.signpost}</p><p className="quiet">{d.review}</p></article>)}
        </div>}
      </section>
      <section className="section" aria-labelledby="inspector-section-title">
        <div className="section-head"><div><p className="eyebrow">Trace the claim</p><h2 id="inspector-section-title">Common evidence and assumption inspector</h2></div><button className="subtle" onClick={()=>setInspectorOpen(v=>!v)} aria-expanded={inspectorOpen}>{inspectorOpen?'Hide details':'Show details'}</button></div>
        {inspectorOpen&&<aside className="inspector" ref={inspectorRef} aria-label="Selected fictional claim">
          <p className="eyebrow">{inspected?.entityKind||'Record'}</p><h3>{itemLabel(selected)}</h3>
          <div className="status-row"><span>Epistemic: {inspected?.epistemicKind||'unspecified'}</span><span>Model review: {inspected?.modelReviewStatus||'unspecified'}</span><span>Rights: {inspected?.rightsStatus||'synthetic'}</span><span>Synthetic: {inspected?.syntheticExample?'Yes':'Yes, demonstration only'}</span></div>
          <p className="quiet">A model review label does not verify a claim or grant publication rights.</p>
          {inspected?.qualification&&<><h4>Relationship qualification</h4><Summary value={inspected.qualification}/></>}
          {inspected?.emptyReason&&<><h4>Missing information</h4><Summary value={inspected.emptyReason}/></>}
          {inspected?.rationale&&<><h4>Rationale</h4><Summary value={inspected.rationale}/></>}
          {related.length>0&&<><h4>Related claims and challenges</h4><ul className="related">{related.map(id=><li key={id}><button onClick={()=>inspect(id)}>{itemLabel(id)}</button></li>)}</ul></>}
          <p className="quiet">Package {suite.manifest.packageId}, revision {suite.manifest.packageRevision}. No real source references.</p>
        </aside>}
      </section>
      <section className="section" aria-labelledby="text-heading">
        <div className="section-head"><h2 id="text-heading">Structured text alternative</h2><button className="subtle" onClick={()=>setShowAllText(v=>!v)} aria-expanded={showAllText}>{showAllText?'Collapse all states':'List every scenario and window'}</button></div>
        {showAllText&&<div className="all-text">{scenarios.map(s=><article key={s.id}><h3>{header(s)}</h3><ol>{checkpoints.map(c=>{const q=cell(s.id,c.checkpointId);return <li key={c.checkpointId}><strong>{c.label}:</strong> {q?.milestoneIds[0]?itemLabel(q.milestoneIds[0]):q?.emptyReason||'Not supplied'}</li>;})}</ol></article>)}</div>}
      </section>
    </main>
    <footer>Scenario Explorer P1-SYN-01 | No live source integration | No probability or forecast claims</footer>
  </div>;
}
