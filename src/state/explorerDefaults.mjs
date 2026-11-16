// Pure reusable explorer initialization; never assumes four scenarios, three checkpoints or fixture IDs.
export function initialExplorerState(suite) {
  const checkpointId=suite.scenarioSuite.checkpoints[0]?.checkpointId??'';
  const leftScenarioId=suite.scenarios[0]?.id??'';
  const rightScenarioId=suite.scenarios[1]?.id??leftScenarioId;
  const cell=suite.scenarioCheckpointStates.find(c=>c.scenarioId===leftScenarioId&&c.checkpointId===checkpointId);
  const selectedEntityId=cell?.milestoneIds?.[0]??cell?.id??'';
  return {checkpointId,leftScenarioId,rightScenarioId,selectedEntityId};
}
