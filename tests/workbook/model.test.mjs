import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../../assets/workbook-model.js',import.meta.url),'utf8');
const browser={sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},location:{reload(){}}};
vm.runInNewContext(code,{window:browser},{timeout:500});
const model=browser.ScenarioWorkbookModel;

function tabs(){
  const domainIds=['access','tools','partners','flows','resilience'];
  const categories=['Decision practice','Emerging signal','Structural driver'];
  const dimensions=['Social','Technological','Economic','Environmental','Political'];
  const rows={
    Project:[{'Project title':'Imaginary Community Workshop','Focal question':'How might imaginary resource tokens circulate?','Reference date':'2026-01-01','Distribution status':'synthetic','Evidence note':'Fictional example',__row:2}],
    Domains:domainIds.map((id,i)=>({'Domain ID':id,'Name':id,'Angle':-90+i*72,'Lead':'An entirely fictional domain','Subtitle':'Fictional','Paragraphs':'Hypothetical narrative','Risk':'Imaginary risk','Response':'Imaginary action','Question':'What if?',__row:i+2})),
    Signals:Array.from({length:12},(_,i)=>({'Signal ID':'sig-'+(i+1),'Name':'Imaginary signal '+(i+1),'Primary domain ID':domainIds[i%5],'STEEP':dimensions[i%5],'Time window ID':['near','mid','far'][i%3],'Classification':categories[i%3],'Description':'Fictional example',__row:i+2})),
    Links:[...Array.from({length:6},(_,i)=>({'Link ID':'lk-'+(i+1),'From ID':'sig-'+(i+1),'To ID':domainIds[(i+1)%5],'Relation type':'signal-domain',__row:i+2})),
      ...Array.from({length:5},(_,i)=>({'Link ID':'lk-domain-'+(i+1),'From ID':domainIds[i],'To ID':domainIds[(i+1)%5],'Relation type':'domain-domain',__row:i+8}))],
    Scenarios:['steady','pooled','fragmented'].map((id,i)=>({'Scenario ID':id,'Name':'Fictional '+id,'Kind':'plausible','Subtitle':'Conditional future','Lead':'A fictional future','Narrative':'No observation claimed','Risk':'Invented risk','Response':'Invented response','Watch':'Possible signals','Focus domain IDs':i===0?'access,tools':i===1?'partners,flows':'resilience,access',__row:i+2})),
    Checkpoints:['near','mid','far'].map((id,i)=>({'Window ID':id,'Label':['2026-2028','2029-2032','2033-2038'][i],'Order':i+1,__row:i+2}))
  };
  return rows;
}
const copy=()=>JSON.parse(JSON.stringify(tabs()));
const errors=t=>model.normalizeRows(t).errors;
const requires=(t,part)=>assert.ok(errors(t).some(e=>e.column===part),part+': '+JSON.stringify(errors(t)));

test('model drives 5 radial domains, 12 stable signals, 11 links, 3 futures and 3 windows',()=>{
  const result=model.normalizeRows(tabs());
  assert.equal(result.errors.length,0,JSON.stringify(result.errors));
  const p=result.packet,source=model.toSource(p);
  assert.equal(source.themes.length,5);assert.equal(source.signals.length,12);
  assert.equal(source.scenarios.length,3);assert.equal(source.checkpoints.length,3);
  assert.equal(p.links.length,11);assert.equal(source.links.length,5);
  assert.equal(source.signals[0].id,'sig-1');
  assert.equal(source.signals[0].related.length,1);
  assert.equal(source.signals[0].horizon,'2026-2028');
});
test('imported scenario names and domain focus feed actual four-future engine',()=>{
  const p=model.normalizeRows(tabs()).packet;
  const fallback=['baseline','normal','collapse','ideal'].map((id,i)=>({id,image:'illustrative'+i,imageCredit:'Portfolio author',imagePage:'https://example.test'}));
  model.active=true;
  const scenarios=model.resolveScenarios(model.toSource(p).scenarios,fallback);
  assert.equal(scenarios.length,3);assert.equal(scenarios[1].name,'Fictional pooled');
  assert.equal(scenarios[1].focus[0],'partners');
  model.active=false;
  assert.equal(model.resolveScenarios([],fallback),fallback);
});
test('missing domain reports exact Signals column and worksheet row',()=>{
  const t=copy();t.Signals[0]['Primary domain ID']='unknown';
  assert.ok(errors(t).some(e=>e.sheet==='Signals'&&e.row===2&&e.column==='Primary domain ID'));
});
test('unknown time window rejected',()=>{const t=copy();t.Signals[0]['Time window ID']='ghost';requires(t,'Time window ID');});
test('duplicate ID rejected',()=>{const t=copy();t.Signals[1]['Signal ID']='sig-1';assert.ok(errors(t).some(e=>e.message.includes('Duplicate ID')));});
test('restricted rights rejected',()=>{const t=copy();t.Project[0]['Distribution status']='private';requires(t,'Distribution status');});
test('unsupported STEEP/type rejected',()=>{const t=copy();t.Signals[0].STEEP='Unknown';t.Signals[0].Classification='Certain';requires(t,'STEEP');requires(t,'Classification');});
test('malicious HTML rejected before network rendering',()=>{const t=copy();t.Signals[0].Description='<script>alert(1)</script>';assert.ok(errors(t).some(e=>e.message.includes('Unsafe')));});
test('unknown scenario focus and link target rejected',()=>{const t=copy();t.Scenarios[0]['Focus domain IDs']='missing';t.Links[0]['To ID']='missing';requires(t,'Focus domain IDs');requires(t,'To ID');});
test('non-fixed scenario/checkpoint counts remain valid',()=>{
  const t=copy();t.Scenarios=t.Scenarios.slice(0,1);
  t.Checkpoints=t.Checkpoints.slice(0,1);
  t.Signals.forEach(s=>{s['Time window ID']='near';});
  assert.equal(errors(t).length,0,JSON.stringify(errors(t)));
});
