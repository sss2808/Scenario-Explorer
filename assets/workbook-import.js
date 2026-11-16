(function (global) {
  'use strict';
  const model=global.ScenarioWorkbookModel;
  if(!model)return;
  const decoder=new TextDecoder('utf-8',{fatal:true});
  const required=['Project','Domains','Signals','Links','Scenarios','Checkpoints'];
  const limits={zip:5*1024*1024,entry:3*1024*1024,unpacked:12*1024*1024};
  function fail(message){throw new Error(message);}
  function xml(bytes,name) {
    const doc=new DOMParser().parseFromString(decoder.decode(bytes),'application/xml');
    if(doc.getElementsByTagName('parsererror').length)fail('Malformed XML: '+name);
    return doc;
  }
  function nodes(node,name){return Array.from(node.getElementsByTagNameNS('*',name));}
  function crcLocation(view,base) {
    if(view.getUint32(base,true)!==0x04034b50)fail('Invalid Excel local ZIP record');
    return base+30+view.getUint16(base+26,true)+view.getUint16(base+28,true);
  }
  async function unzipWorkbook(buffer) {
    const data=new Uint8Array(buffer);
    if(data.length>limits.zip)fail('Workbook exceeds 5 MB');
    const view=new DataView(buffer);
    let eocd=-1;
    for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--){
      if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
    }
    if(eocd<0)fail('File is not a valid .xlsx ZIP package');
    const count=view.getUint16(eocd+10,true),central=view.getUint32(eocd+16,true);
    if(count>160)fail('Too many Excel package entries');
    let offset=central,total=0;
    const entries=new Map();
    for(let i=0;i<count;i++){
      if(offset+46>data.length||view.getUint32(offset,true)!==0x02014b50)fail('Invalid ZIP central directory');
      const method=view.getUint16(offset+10,true),csize=view.getUint32(offset+20,true),usize=view.getUint32(offset+24,true);
      const nameLen=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
      const name=decoder.decode(data.slice(offset+46,offset+46+nameLen));
      if(name.includes('..')||name.startsWith('/')||name.includes('\\'))fail('Unsafe ZIP entry path');
      total+=usize;
      if(usize>limits.entry||total>limits.unpacked)fail('Decompressed Excel content too large');
      if((method!==0&&method!==8)||local>=data.length)fail('Unsupported workbook ZIP compression');
      entries.set(name,{method,csize,usize,local});
      offset+=46+nameLen+extra+comment;
    }
    async function entry(name,optional=false){
      const spec=entries.get(name);
      if(!spec){if(optional)return null;fail('Excel package missing '+name);}
      const start=crcLocation(view,spec.local);
      if(start+spec.csize>data.length)fail('Truncated Excel ZIP entry');
      const bytes=data.slice(start,start+spec.csize);
      if(spec.method===0){if(bytes.length!==spec.usize)fail('Invalid stored ZIP length');return bytes;}
      if(typeof DecompressionStream!=='function')fail('This browser cannot decompress Excel files offline');
      let stream;
      try{stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));}
      catch(e){fail('This browser does not support local XLSX decompression');}
      const inflated=new Uint8Array(await new Response(stream).arrayBuffer());
      if(inflated.length!==spec.usize||inflated.length>limits.entry)fail('Invalid decompressed ZIP entry');
      return inflated;
    }
    const wb=xml(await entry('xl/workbook.xml'),'xl/workbook.xml');
    const rel=xml(await entry('xl/_rels/workbook.xml.rels'),'workbook relationships');
    const sharedData=await entry('xl/sharedStrings.xml',true);
    const shared=sharedData?nodes(xml(sharedData,'shared strings'),'si').map(si=>nodes(si,'t').map(t=>t.textContent||'').join('')):[];
    const relationships=new Map(nodes(rel,'Relationship').map(n=>[n.getAttribute('Id'),n.getAttribute('Target')]));
    const tables={};
    for(const sheet of nodes(wb,'sheet')){
      const name=sheet.getAttribute('name');
      if(!required.includes(name))continue;
      const id=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
      const target=relationships.get(id);
      if(!target)fail('Missing worksheet relationship for '+name);
      const clean=target.replace(/^\/?xl\//,'').replace(/^\//,'');
      const path='xl/'+clean.replace(/^\.\/|^xl\//,'');
      const worksheet=xml(await entry(path),path);
      const parsed=[];
      for(const row of nodes(worksheet,'row')){
        const n=Number(row.getAttribute('r'))||parsed.length+1;
        const map=new Map();
        for(const c of nodes(row,'c')){
          const address=c.getAttribute('r')||'';
          const letters=(address.match(/^[A-Z]+/)||[])[0];
          if(!letters)continue;
          let col=0;for(const ch of letters)col=col*26+ch.charCodeAt(0)-64;
          col--;
          if(nodes(c,'f').length)fail(name+'!'+address+': formulas are not allowed in importer fields');
          const type=c.getAttribute('t');
          let value='';
          if(type==='inlineStr'){value=nodes(c,'t').map(t=>t.textContent||'').join('');}
          else {const v=nodes(c,'v')[0]?.textContent||'';value=type==='s'?shared[Number(v)]||'':v;}
          map.set(col,value);
        }
        parsed.push({number:n,values:map});
      }
      const first=parsed.find(r=>r.number===1);
      if(!first)fail('Missing header row on '+name);
      const header=[...first.values.entries()].map(([i,text])=>({i,text:String(text).trim()}));
      for(const expected of model.headers[name])if(!header.some(h=>h.text===expected))fail(name+'!row 1: Missing column '+expected);
      const rows=[];
      for(const row of parsed){
        if(row.number===1||![...row.values.values()].some(v=>String(v).trim()))continue;
        const record={__row:row.number};
        for(const h of header)record[h.text]=row.values.get(h.i)||'';
        rows.push(record);
        if(rows.length>1000)fail(name+': too many data rows');
      }
      tables[name]=rows;
    }
    return tables;
  }
  async function parseFile(file){
    if(!file)fail('Choose an .xlsx or versioned .json file');
    if(file.size>limits.zip)fail('File too large for local importer');
    if(/\.xlsx$/i.test(file.name)){
      const tabs=await unzipWorkbook(await file.arrayBuffer());
      return model.normalizeRows(tabs);
    }
    if(/\.json$/i.test(file.name)){
      const parsed=JSON.parse(await file.text());
      const errors=model.validatePacket(parsed);
      return {packet:errors.length?null:parsed,errors};
    }
    fail('Choose a .xlsx or .json file');
  }
  function downloadJson(packet){
    const blob=new Blob([JSON.stringify(packet,null,2)+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='scenario-explorer-synthetic-v1.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function element(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
  function install(){
    const anchor=document.querySelector('.inline-filters')||document.querySelector('.topbar-controls')||document.body;
    const toggle=element('button','Import Excel');
    toggle.type='button';toggle.id='import-excel';toggle.className='compact-filter';
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls','import-excel-panel');
    toggle.setAttribute('title','Load a fictional Excel workbook locally');
    anchor.appendChild(toggle);
    const panel=element('section');panel.id='import-excel-panel';panel.hidden=true;
    panel.setAttribute('role','region');panel.setAttribute('aria-label','Local workbook import');
    panel.style.cssText='position:fixed;z-index:9999;top:85px;right:16px;max-width:min(420px,calc(100vw - 32px));max-height:calc(100dvh - 110px);overflow:auto;border:1px solid #536578;border-radius:8px;background:#131b25;color:#e6edf5;padding:18px;box-shadow:0 20px 50px #000b;font:13px/1.45 system-ui';
    panel.appendChild(element('h2','Import fictional workbook'));
    const description=element('p','Your .xlsx stays in this browser. Validate and preview before applying. Workbook content does not grant publication rights.');
    panel.appendChild(description);
    const label=element('label','Choose .xlsx or exported .json');label.style.display='block';
    const input=element('input');input.type='file';input.accept='.xlsx,.json';input.id='scenario-file';input.style.cssText='display:block;max-width:100%;margin:10px 0;color:inherit';
    label.appendChild(input);panel.appendChild(label);
    const notice=element('p',model.active?'Loaded fictional project: '+model.current.project.title:'Portfolio illustration currently displayed.');
    panel.appendChild(notice);
    const list=element('div');list.id='workbook-diagnostics';list.setAttribute('aria-live','polite');list.style.cssText='max-height:180px;overflow:auto;white-space:pre-wrap;margin:12px 0';
    panel.appendChild(list);
    const preview=element('p','');panel.appendChild(preview);
    const controls=element('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
    function button(label){const btn=element('button',label);btn.type='button';btn.style.cssText='padding:7px 10px;border:1px solid #567188;background:#243649;color:white;border-radius:5px;cursor:pointer';return btn;}
    const apply=button('Apply to radial explorer');apply.disabled=true;controls.appendChild(apply);
    const exportBtn=button('Export JSON');controls.appendChild(exportBtn);
    const reset=button('Restore portfolio');controls.appendChild(reset);
    const close=button('Close');controls.appendChild(close);
    panel.appendChild(controls);document.body.appendChild(panel);
    let staged=null;
    toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)input.focus();});
    close.addEventListener('click',()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();});
    input.addEventListener('change',async()=>{
      apply.disabled=true;staged=null;list.textContent='Reading file locally...';preview.textContent='';
      try {
        const res=await parseFile(input.files?.[0]);
        if(res.errors.length){
          list.textContent=res.errors.slice(0,30).map(e=>e.sheet+' | row '+e.row+' | '+e.column+': '+e.message).join('\n');
          if(res.errors.length>30)list.textContent+='\n... and '+(res.errors.length-30)+' more errors';
          return;
        }
        staged=res.packet;apply.disabled=false;list.textContent='Workbook passed checks. No data applied yet.';
        preview.textContent=staged.project.title+': '+staged.domains.length+' domains, '+staged.signals.length+' signals, '+staged.links.length+' links, '+staged.scenarios.length+' futures, '+staged.checkpoints.length+' time windows.';
      } catch(error){list.textContent='Import error: '+(error?.message||String(error));}
    });
    apply.addEventListener('click',()=>{if(staged)model.apply(staged);});
    exportBtn.addEventListener('click',()=>{if(staged||model.current)downloadJson(staged||model.current);else list.textContent='Import a fictional workbook first, then export its JSON.';});
    reset.addEventListener('click',()=>model.reset());
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
  }
  global.ScenarioWorkbookImporter={parseFile,unzipWorkbook};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})(window);
