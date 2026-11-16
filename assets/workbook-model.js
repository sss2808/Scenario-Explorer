(function (global) {
  'use strict';
  const STORAGE = 'scenarioExplorer.radial.v1';
  const VERSION = 'scenario-explorer.radial.v1';
  const STEEP = ['Social','Technological','Economic','Environmental','Political'];
  const CLASSES = ['Emerging signal','Structural driver','Decision practice'];
  const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
  const TABS = ['Project','Domains','Signals','Links','Scenarios','Checkpoints'];
  const HEADER = {
    Project:['Project title','Focal question','Reference date','Distribution status','Evidence note'],
    Domains:['Domain ID','Name','Angle','Lead','Subtitle','Paragraphs','Risk','Response','Question'],
    Signals:['Signal ID','Name','Primary domain ID','STEEP','Time window ID','Classification','Description'],
    Links:['Link ID','From ID','To ID','Relation type'],
    Scenarios:['Scenario ID','Name','Kind','Subtitle','Lead','Narrative','Risk','Response','Watch','Focus domain IDs'],
    Checkpoints:['Window ID','Label','Order']
  };
  function diagnostic(sheet,row,column,message){return {sheet,row,column,message};}
  function clean(value){return value === null || value === undefined ? '' : String(value).trim();}
  function unsafe(value){return value.length>4000 || /<\s*\/?\s*(script|iframe)|javascript:|data:text\/html/i.test(value);}
  function toList(value){return clean(value).split(',').map(x=>x.trim()).filter(Boolean);}
  function normalizeRows(tabs) {
    const errors=[];
    for(const tab of TABS)if(!Array.isArray(tabs[tab]))errors.push(diagnostic(tab,1,'A','Required sheet missing'));
    if(errors.length)return {errors};
    function field(sheet,row,col,required){
      const value=clean(row[col]);
      if(required&&!value)errors.push(diagnostic(sheet,row.__row||2,col,'Required value missing'));
      if(unsafe(value))errors.push(diagnostic(sheet,row.__row||2,col,'Unsafe or oversized text'));
      return value;
    }
    const projects=tabs.Project;
    if(projects.length!==1)errors.push(diagnostic('Project',2,'A','Enter exactly one project row'));
    const p=projects[0]||{__row:2};
    const project={
      title:field('Project',p,'Project title',true),
      focalQuestion:field('Project',p,'Focal question',true),
      referenceDate:field('Project',p,'Reference date',true),
      distribution:field('Project',p,'Distribution status',true).toLowerCase(),
      evidenceNote:field('Project',p,'Evidence note',false)
    };
    if(project.distribution!=='synthetic')errors.push(diagnostic('Project',p.__row||2,'Distribution status','Only synthetic fictional imports are permitted'));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(project.referenceDate))errors.push(diagnostic('Project',p.__row||2,'Reference date','Use YYYY-MM-DD'));
    function idField(sheet,row,key) {
      const id=field(sheet,row,key,true);
      if(id&&!ID.test(id))errors.push(diagnostic(sheet,row.__row||2,key,'ID must begin with a letter and use letters, numbers, hyphen or underscore'));
      return id;
    }
    const domains=tabs.Domains.map((r,i)=>{
      const angleText=field('Domains',r,'Angle',false),angle=angleText?Number(angleText):(-90+i*360/Math.max(1,tabs.Domains.length));
      if(!Number.isFinite(angle)||angle < -360 || angle>360)errors.push(diagnostic('Domains',r.__row||i+2,'Angle','Expected angle between -360 and 360'));
      return {id:idField('Domains',r,'Domain ID'),name:field('Domains',r,'Name',true),angle,
        lead:field('Domains',r,'Lead',true),subtitle:field('Domains',r,'Subtitle',false),
        paragraphs:field('Domains',r,'Paragraphs',false).split(/\n+/).filter(Boolean),
        risk:field('Domains',r,'Risk',false),response:field('Domains',r,'Response',false),
        question:field('Domains',r,'Question',false)};
    });
    const checkpoints=tabs.Checkpoints.map((r,i)=>({
      id:idField('Checkpoints',r,'Window ID'),
      label:field('Checkpoints',r,'Label',true),
      order:Number(field('Checkpoints',r,'Order',true))
    }));
    for(const [i,c] of checkpoints.entries())if(!Number.isInteger(c.order)||c.order<1)errors.push(diagnostic('Checkpoints',tabs.Checkpoints[i].__row||i+2,'Order','Use a positive whole number'));
    const signals=tabs.Signals.map(r=>({
      id:idField('Signals',r,'Signal ID'),name:field('Signals',r,'Name',true),
      primary:field('Signals',r,'Primary domain ID',true),
      steep:field('Signals',r,'STEEP',true),
      windowId:field('Signals',r,'Time window ID',true),
      classification:field('Signals',r,'Classification',true),
      description:field('Signals',r,'Description',false)
    }));
    const links=tabs.Links.map(r=>({
      id:idField('Links',r,'Link ID'),from:field('Links',r,'From ID',true),to:field('Links',r,'To ID',true),
      type:field('Links',r,'Relation type',true)
    }));
    const scenarios=tabs.Scenarios.map(r=>({
      id:idField('Scenarios',r,'Scenario ID'),name:field('Scenarios',r,'Name',true),
      kind:field('Scenarios',r,'Kind',true).toLowerCase(),
      subtitle:field('Scenarios',r,'Subtitle',false),
      lead:field('Scenarios',r,'Lead',true),
      paragraphs:field('Scenarios',r,'Narrative',true).split(/\n+/).filter(Boolean),
      risk:field('Scenarios',r,'Risk',false),response:field('Scenarios',r,'Response',false),
      watch:field('Scenarios',r,'Watch',false),focus:toList(field('Scenarios',r,'Focus domain IDs',true))
    }));
    const packet={schemaVersion:VERSION,distributionClass:'synthetic',syntheticExample:true,project,domains,signals,links,scenarios,checkpoints};
    errors.push(...validatePacket(packet,tabs));
    return {errors,packet:errors.length?null:packet};
  }
  function validatePacket(packet,tabs) {
    const issues=[];
    if(!packet || typeof packet!=='object' || packet.schemaVersion!==VERSION || packet.distributionClass!=='synthetic'||packet.syntheticExample!==true)
      return [diagnostic('Project',2,'Distribution status','Unsupported format, synthetic data required')];
    const domains=packet.domains||[],signals=packet.signals||[],links=packet.links||[],
      scenarios=packet.scenarios||[],windows=packet.checkpoints||[];
    function cell(sheet,i,col){return tabs&&tabs[sheet]&&tabs[sheet][i]?(tabs[sheet][i].__row||i+2):i+2;}
    for(const [name,arr] of [['Domains',domains],['Signals',signals],['Scenarios',scenarios],['Checkpoints',windows]]) {
      if(!Array.isArray(arr)||!arr.length)issues.push(diagnostic(name,2,'A','At least one record required'));
      const seen=new Set();
      (arr||[]).forEach((obj,i)=>{if(!ID.test(obj.id||''))issues.push(diagnostic(name,cell(name,i),'ID','Invalid stable ID'));
        if(seen.has(obj.id))issues.push(diagnostic(name,cell(name,i),'ID','Duplicate ID: '+obj.id));
        seen.add(obj.id);
      });
    }
    if(links.length>1500||signals.length>800||domains.length>80||scenarios.length>30||windows.length>30)
      issues.push(diagnostic('Project',2,'A','Workbook exceeds bounded local-import limits'));
    const allIds=new Set();
    for(const [name,arr] of [['Domains',domains],['Signals',signals],['Links',links],['Scenarios',scenarios],['Checkpoints',windows]]){
      (arr||[]).forEach((o,i)=>{if(allIds.has(o.id))issues.push(diagnostic(name,cell(name,i),'ID','ID duplicates another sheet: '+o.id));allIds.add(o.id);});
    }
    const dom=new Set(domains.map(x=>x.id)),sig=new Set(signals.map(x=>x.id)),win=new Map(windows.map(x=>[x.id,x]));
    const known=new Set(),order=new Set();
    for(const [i,w] of windows.entries()){
      if(known.has(w.label))issues.push(diagnostic('Checkpoints',cell('Checkpoints',i),'Label','Duplicate time-window label'));
      if(order.has(w.order)||!Number.isInteger(w.order)||w.order<1)issues.push(diagnostic('Checkpoints',cell('Checkpoints',i),'Order','Order must be a unique positive integer'));
      known.add(w.label);order.add(w.order);
    }
    for(const [i,d] of domains.entries()){
      if(!Number.isFinite(d.angle))issues.push(diagnostic('Domains',cell('Domains',i),'Angle','Invalid radial angle'));
      if(!d.name||!d.lead)issues.push(diagnostic('Domains',cell('Domains',i),'Name / Lead','Domain needs a name and lead'));
    }
    for(const [i,s] of signals.entries()){
      if(!dom.has(s.primary))issues.push(diagnostic('Signals',cell('Signals',i),'Primary domain ID','Unknown domain: '+s.primary));
      if(!win.has(s.windowId))issues.push(diagnostic('Signals',cell('Signals',i),'Time window ID','Unknown window: '+s.windowId));
      if(!STEEP.includes(s.steep))issues.push(diagnostic('Signals',cell('Signals',i),'STEEP','Choose a valid STEEP dimension'));
      if(!CLASSES.includes(s.classification))issues.push(diagnostic('Signals',cell('Signals',i),'Classification','Unknown classification'));
      if(!s.name)issues.push(diagnostic('Signals',cell('Signals',i),'Name','Signal name required'));
    }
    for(const [i,l] of links.entries()){
      const fromOk=(l.type==='signal-domain'&&sig.has(l.from))||(l.type==='domain-domain'&&dom.has(l.from));
      if(!fromOk)issues.push(diagnostic('Links',cell('Links',i),'From ID','Unknown source ID or invalid relation type'));
      if(!dom.has(l.to))issues.push(diagnostic('Links',cell('Links',i),'To ID','Unknown destination domain'));
      if(!['signal-domain','domain-domain'].includes(l.type))issues.push(diagnostic('Links',cell('Links',i),'Relation type','Use signal-domain or domain-domain'));
      if(l.from===l.to)issues.push(diagnostic('Links',cell('Links',i),'To ID','Self-link is not valid'));
    }
    for(const [i,s] of scenarios.entries()){
      if(!['plausible','preferred'].includes(s.kind))issues.push(diagnostic('Scenarios',cell('Scenarios',i),'Kind','Use plausible or preferred'));
      if(!s.name||!s.lead)issues.push(diagnostic('Scenarios',cell('Scenarios',i),'Name / Lead','Scenario needs name and lead'));
      if(!s.focus.length)issues.push(diagnostic('Scenarios',cell('Scenarios',i),'Focus domain IDs','At least one domain ID required'));
      for(const id of s.focus)if(!dom.has(id))issues.push(diagnostic('Scenarios',cell('Scenarios',i),'Focus domain IDs','Unknown domain: '+id));
    }
    const json=JSON.stringify(packet);
    if(json.length>524288)issues.push(diagnostic('Project',2,'A','Dataset exceeds 512 KB local limit'));
    if(/<\s*\/?\s*script|javascript:|data:text\/html/i.test(json))issues.push(diagnostic('Project',2,'A','Unsafe markup or URL in dataset'));
    return issues;
  }
  function toSource(packet) {
    const windowById=new Map(packet.checkpoints.map(w=>[w.id,w]));
    const related=new Map(packet.signals.map(s=>[s.id,[]]));
    for(const link of packet.links)if(link.type==='signal-domain')related.get(link.from).push(link.to);
    return {
      project:packet.project.title,meta:packet.project,
      themes:packet.domains.map(d=>({id:d.id,name:d.name,angle:d.angle,lead:d.lead,subtitle:d.subtitle,
        paragraphs:d.paragraphs,risk:d.risk,response:d.response,question:d.question})),
      signals:packet.signals.map(s=>({id:s.id,name:s.name,primary:s.primary,related:related.get(s.id)||[],
        steep:s.steep,horizon:windowById.get(s.windowId).label,classification:s.classification,description:s.description})),
      links:packet.links.filter(l=>l.type==='domain-domain').map(l=>[l.from,l.to]),
      scenarios:packet.scenarios,checkpoints:[...packet.checkpoints].sort((a,b)=>a.order-b.order),
      steepDimensions:STEEP.filter(d=>packet.signals.some(s=>s.steep===d)),
      classifications:CLASSES.filter(c=>packet.signals.some(s=>s.classification===c))
    };
  }
  function resolveScenarios(imported,fallback) {
    if(!bridge.active) return fallback;
    return imported.map((s,i)=>{
      const image=fallback.find(x=>x.id===s.id)||fallback[i%fallback.length];
      return {id:s.id,name:s.name,kind:s.kind,label:s.kind==='preferred'?'Preferred future · backcasting':'Plausible future',
        subtitle:s.subtitle,lead:s.lead,paragraphs:s.paragraphs,risk:s.risk,response:s.response,
        watch:s.watch,focus:s.focus,
        image:image.image,imageAlt:'Illustrative photo, not evidence for this fictional scenario',
        imageCredit:image.imageCredit,imagePage:image.imagePage};
    });
  }
  const bridge={version:VERSION,active:false,current:null,error:null,headers:HEADER,normalizeRows,validatePacket,toSource,resolveScenarios};
  global.ScenarioWorkbookModel=bridge;
  try {
    const stored=global.sessionStorage && global.sessionStorage.getItem(STORAGE);
    if(stored){
      const parsed=JSON.parse(stored),errors=validatePacket(parsed);
      if(errors.length){bridge.error=errors;global.sessionStorage.removeItem(STORAGE);}
      else {bridge.current=parsed;bridge.active=true;global.SCENARIO_EXPLORER_DATA=toSource(parsed);}
    }
  } catch(error){bridge.error=[diagnostic('Project',2,'A','Saved dataset could not be loaded')];}
  bridge.apply=function(packet){const errors=validatePacket(packet);if(errors.length)return errors;
    global.sessionStorage.setItem(STORAGE,JSON.stringify(packet));global.location.reload();return [];
  };
  bridge.reset=function(){global.sessionStorage.removeItem(STORAGE);global.location.reload();};
})(typeof window!=='undefined'?window:globalThis);
