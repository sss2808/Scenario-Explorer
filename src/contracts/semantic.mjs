export const COLLECTIONS = ['conditions','scenarios','scenarioCheckpointStates','drivers','criticalUncertainties','actors','assumptions','mechanisms','transitions','milestones','outcomes','signposts','counterpaths','relationships','references','reviewEvents','revisions'];
export const PREDICATES = ['supports','depends_on','enables','constrains','may_contribute_to','amplifies','dampens','interacts_with','challenges','qualifies','contradicts','alternative_to','affects','signals'];
export function entityIndex(pkg) {
  const index=new Map();
  for (const kind of COLLECTIONS) for (const row of pkg[kind]||[]) {
    index.set(row.id,{...row,entityKind:kind});
    if(kind==='criticalUncertainties') for(const state of row.states||[]) index.set(state.id,{...state,entityKind:'uncertaintyState'});
  }
  return index;
}
export function semanticErrors(pkg) {
  const faults=new Set(),bad=code=>faults.add(code);
  if(!pkg?.manifest || !pkg?.scenarioSuite || !pkg?.referenceState)return ['MISSING_PACKAGE'];
  if(new TextEncoder().encode(JSON.stringify(pkg)).length>1048576)bad('MAX_BYTES');
  function scan(x,d=0) {
    if(d>20){bad('MAX_DEPTH');return;}
    if(typeof x==='string'){
      const v=x.toLowerCase();
      if(x.length>4000||v.includes('<script')||v.includes('javascript:')||v.includes('data:text/html'))bad('UNSAFE_TEXT');
    } else if (Array.isArray(x)) for(const v of x)scan(v,d+1);
    else if(x&&typeof x==='object') for(const v of Object.values(x))scan(v,d+1);
  }
  scan(pkg);
  if(pkg.manifest.schemaVersion!=='0.2.0')bad('SCHEMA_VERSION');
  if(pkg.manifest.distributionClass!=='synthetic'||pkg.manifest.releaseEpoch!==0||pkg.manifest.releaseDecisionRef)bad('UNAUTHORIZED_DISTRIBUTION');
  if(!/^[a-f0-9]{64}$/.test(pkg.manifest.contentSha256||''))bad('DIGEST_FORMAT');
  for(const key of COLLECTIONS)if(!Array.isArray(pkg[key]))bad('MISSING_ARRAY');
  if(faults.has('MISSING_ARRAY'))return [...faults];
  const index=new Map(),seenIds=new Set();
  for(const kind of COLLECTIONS)for(const row of pkg[kind]){
    const nested=kind==='criticalUncertainties'?[row,...(row.states||[])]:[row];
    for(const item of nested){
      if(typeof item.id!=='string'||!item.id||item.id.length>128)bad('INVALID_ID');
      if(seenIds.has(item.id))bad('DUPLICATE_ID');seenIds.add(item.id);
      index.set(item.id,{...item,entityKind:item===row?kind:'uncertaintyState'});
    }
  }
  const ref=(id,type)=>{const r=index.get(id);if(!r)bad('DANGLING_ID');else if(type&&r.entityKind!==type)bad('WRONG_REFERENCE_TYPE');};
  const ep=['observed','reported','interpretation','hypothesis','assumption','projection','preference'];
  const review=['draft','challenged','accepted_for_model','rejected','superseded'];
  for(const row of [pkg.referenceState,...index.values()]) {
    if(!ep.includes(row.epistemicKind)||!review.includes(row.modelReviewStatus)||row.rightsStatus!=='synthetic'||row.syntheticExample!==true)bad('INVALID_RECORD_STATUS');
  }
  if(pkg.referenceState.asOfDate!==pkg.scenarioSuite.referenceDate)bad('REFERENCE_DATE');
  for(const id of pkg.referenceState.conditionIds||[])ref(id,'conditions');
  const cp=pkg.scenarioSuite.checkpoints||[],arch=pkg.scenarioSuite.archetypeProfile||[];
  if(pkg.scenarioSuite.profileId==='gsa-four-paths-demo'&&(arch.map(x=>x.archetypeId).join('|')!=='baseline|new_normal|collapse|ideal'||cp.map(x=>x.offsetYears).join('|')!=='3|5|10'))bad('GSA_PROFILE');
  const checkpoints=new Set(cp.map(x=>x.checkpointId)),scenarioIds=new Set(pkg.scenarios.map(x=>x.id));
  if(pkg.scenarios.length!==arch.length||new Set(pkg.scenarios.map(x=>x.archetypeId)).size!==arch.length)bad('SCENARIO_PROFILE');
  for(const sc of pkg.scenarios){
    for(const id of sc.criticalUncertaintyStateIds||[])ref(id,'uncertaintyState');
    for(const id of sc.assumptionIds||[])ref(id,'assumptions');
    for(const id of sc.mechanismIds||[])ref(id,'mechanisms');
  }
  for(const u of pkg.criticalUncertainties){
    if((u.states||[]).length<2)bad('UNDETERMINED_UNCERTAINTY');
    for(const id of u.dependencyIds||[])ref(id,'criticalUncertainties');
  }
  const pairs=new Set();
  for(const c of pkg.scenarioCheckpointStates){
    ref(c.scenarioId,'scenarios');if(!checkpoints.has(c.checkpointId))bad('INVALID_CHECKPOINT');
    const pair=c.scenarioId+'/'+c.checkpointId;if(pairs.has(pair))bad('DUPLICATE_CELL');pairs.add(pair);
    if(!Array.isArray(c.milestoneIds)||(!c.milestoneIds.length&&!c.emptyReason))bad('EMPTY_CELL_UNEXPLAINED');
    for(const mid of c.milestoneIds||[]){
      ref(mid,'milestones');const m=index.get(mid);if(m&&(m.scenarioId!==c.scenarioId||m.checkpointId!==c.checkpointId))bad('MILESTONE_CELL_MISMATCH');
    }
  }
  if(pairs.size!==pkg.scenarios.length*cp.length)bad('MISSING_CELL');
  for(const m of pkg.milestones){
    ref(m.scenarioId,'scenarios');if(!checkpoints.has(m.checkpointId))bad('MILESTONE_WINDOW');
    for(const id of [...(m.assumptionIds||[]),...(m.mechanismIds||[]),...(m.actorIds||[]),...(m.outcomeIds||[]),...(m.signpostIds||[]),...(m.counterpathIds||[])])ref(id);
  }
  for(const c of pkg.counterpaths){ref(c.challengesEntityId);for(const id of c.alternativeMechanismIds||[])ref(id,'mechanisms');}
  for(const t of pkg.transitions){ref(t.scenarioId,'scenarios');if(t.fromCheckpointId&&!checkpoints.has(t.fromCheckpointId))bad('TRANSITION_WINDOW');if(t.toCheckpointId&&!checkpoints.has(t.toCheckpointId))bad('TRANSITION_WINDOW');}
  for(const r of pkg.references)if(r.url)bad('C0_REMOTE_REFERENCE');
  const dependencies=new Map();
  for(const r of pkg.relationships){
    ref(r.fromId);ref(r.toId);
    if(!PREDICATES.includes(r.predicate))bad('UNKNOWN_RELATIONSHIP');
    for(const id of r.scenarioIds||[])if(!scenarioIds.has(id))bad('RELATIONSHIP_SCOPE');
    if(r.predicate==='depends_on'){const edges=dependencies.get(r.fromId)||[];edges.push(r.toId);dependencies.set(r.fromId,edges);}
  }
  const visited=new Set(),active=new Set();
  function traverse(id){if(active.has(id)){bad('DEPENDENCY_CYCLE');return;}if(visited.has(id))return;visited.add(id);active.add(id);for(const n of dependencies.get(id)||[])traverse(n);active.delete(id);}
  for(const id of dependencies.keys())traverse(id);
  if(seenIds.size>2000||pkg.relationships.length+pkg.references.length>5000)bad('MAX_RECORDS');
  return [...faults];
}
