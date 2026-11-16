import test from 'node:test';
import assert from 'node:assert/strict';
import suite from '../../src/fixtures/synthetic-suite.v0.2.json' with {type:'json'};
import {scenarioAt} from '../../src/selectors/scenarioAt.mjs';

test('uses linked milestone signposts, never a hardcoded fixture ID',()=>{
  const p=structuredClone(suite);
  p.signposts.push({...p.signposts[0],id:'sign-independent',observableDescription:'A different fictional signal'});
  const milestone=p.milestones.find(m=>m.scenarioId==='sc-baseline'&&m.checkpointId==='cp3');
  milestone.signpostIds=['sign-independent'];
  const d=scenarioAt(p,'sc-baseline','cp3');
  assert.deepEqual(d.signpostIds,['sign-independent']);
  assert.equal(d.signpost,'A different fictional signal');
});
test('explicit missing milestone state with no hardcoded scenario assumptions',()=>{
  const c=scenarioAt(suite,'sc-collapse','cp5');
  assert.equal(c.milestoneId,null);
  assert.match(c.change,/No milestone/);
  const p=structuredClone(suite);
  p.scenarioSuite.profileId='generic';
  p.scenarioSuite.checkpoints=[p.scenarioSuite.checkpoints[0]];
  p.scenarioCheckpointStates=p.scenarioCheckpointStates.filter(c=>c.checkpointId==='cp3');
  const d=scenarioAt(p,p.scenarios[0].id,p.scenarioSuite.checkpoints[0].checkpointId);
  assert.equal(d.scenario,'Baseline');
});

test('generic single-checkpoint defaults derive from IDs, not GSA positions',async()=>{
  const {initialExplorerState}=await import('../../src/state/explorerDefaults.mjs');
  const p=structuredClone(suite);
  p.scenarioSuite.profileId='fictional-generic';
  p.scenarioSuite.checkpoints=[p.scenarioSuite.checkpoints[0]];
  p.scenarioCheckpointStates=p.scenarioCheckpointStates.filter(c=>c.checkpointId==='cp3');
  const init=initialExplorerState(p);
  assert.equal(init.checkpointId,'cp3');
  assert.equal(init.leftScenarioId,p.scenarios[0].id);
  assert.equal(init.selectedEntityId,p.scenarioCheckpointStates[0].milestoneIds[0]);
  p.scenarios=p.scenarios.slice(0,1);
  const one=initialExplorerState(p);
  assert.equal(one.leftScenarioId,one.rightScenarioId);
});
