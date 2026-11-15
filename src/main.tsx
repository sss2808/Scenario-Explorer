import React from 'react';
import {createRoot} from 'react-dom/client';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from './contracts/schema-v0.2.json';
import fixture from './fixtures/synthetic-suite.v0.2.json';
import {semanticErrors} from './contracts/semantic.mjs';
import {digest} from './contracts/canonicalize.mjs';
import App from './App';
import './styles.css';

function Root() {
  const [result,setResult] = React.useState<'checking'|'ready'|'invalid'>('checking');
  React.useEffect(()=>{
    let active=true;
    (async()=>{
      try {
        const ajv=new Ajv2020({allErrors:true,strict:false});
        const shape=ajv.compile(schema);
        if(!shape(fixture)) throw Error('Schema shape rejected');
        const faults=semanticErrors(fixture);
        if(faults.length) throw Error('Semantic package rejected');
        if((await digest(fixture)) !== fixture.manifest.contentSha256) throw Error('Integrity digest rejected');
        if(active)setResult('ready');
      } catch {
        if(active)setResult('invalid');
      }
    })();
    return ()=>{active=false;};
  },[]);
  if(result==='checking') return <main className="boot" role="status">Checking fictional scenario package integrity...</main>;
  if(result==='invalid') return <main className="boot" role="alert"><h1>Package unavailable</h1><p>This demonstration package did not pass validation. No scenarios were loaded.</p></main>;
  return <App suite={fixture}/>;
}
const root=document.getElementById('root');
if(!root)throw Error('Application mount missing');
createRoot(root).render(<React.StrictMode><Root/></React.StrictMode>);
