// Pure package-derived comparison selector. No scenario, milestone or signpost IDs are fixed.
export function scenarioAt(suite,scenarioId,checkpointId){
  const scenario=suite.scenarios.find(s=>s.id===scenarioId);
  const cell=suite.scenarioCheckpointStates.find(c=>c.scenarioId===scenarioId&&c.checkpointId===checkpointId);
  if(!scenario||!cell)return null;
  const firstId=cell.milestoneIds?.[0];
  const milestone=suite.milestones.find(m=>m.id===firstId);
  const mechanismLabels=(scenario.mechanismIds||[]).map(id=>suite.mechanisms.find(m=>m.id===id)?.conditionalProcess||'[Missing mechanism]');
  const signpostIds=milestone ? milestone.signpostIds||[] : cell.signpostIds||[];
  const signpostLabels=signpostIds.map(id=>suite.signposts.find(s=>s.id===id)?.observableDescription||'[Missing signpost]');
  return {
    scenario:scenario.label,
    premise:scenario.conditionalProposition,
    change:milestone?.conditionalStateChange||cell.emptyReason||'No milestone supplied',
    mechanism:mechanismLabels.join('; ')||'No mechanism supplied',
    signpost:signpostLabels.join('; ')||'No linked signpost supplied',
    signpostIds,
    milestoneId:milestone?.id||null,
    review:'Hypothetical, not an observed future'
  };
}
