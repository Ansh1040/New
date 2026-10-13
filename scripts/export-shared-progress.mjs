import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import { sharedDPP } from '../lib/shared-dpp.ts';
const input=process.argv[2];
if(!input) throw new Error('Usage: node scripts/export-shared-progress.mjs <saved-tracker-state.json>');
const state=JSON.parse(readFileSync(input,'utf8'));
if(!Array.isArray(state.subjects)||!Array.isArray(state.pw?.tests)||!Number.isFinite(Date.parse(state.updatedAt))||!Number.isFinite(Date.parse(state.pw.capturedAt))) throw new Error('A saved tracker state with a valid PW snapshot is required.');
const subjects=state.subjects.map(({name,progress})=>{
 if(typeof name!=='string'||!(progress===null||typeof progress==='number'&&progress>=0&&progress<=100)) throw new Error('Invalid subject progress.');
 return {name,progress};
});
const tests=state.pw.tests;
const completed=tests.filter(t=>t.status==='completed').length;
const upcoming=tests.filter(t=>t.status==='upcoming').length;
const available=tests.length-upcoming;
const groups=[...new Set(tests.map(t=>t.subject))].sort().map(subject=>{
 const ts=tests.filter(t=>t.subject===subject);
 return {subject,completed:ts.filter(t=>t.status==='completed').length,available:ts.filter(t=>t.status!=='upcoming').length,upcoming:ts.filter(t=>t.status==='upcoming').length};
});
const snapshot={title:'Ansh’s CS GATE progress',updatedAt:state.updatedAt,pwCapturedAt:state.pw.capturedAt,subjects,tests:{completed,upcoming,available,total:tests.length,percent:available?Math.round(completed/available*100):0,groups}};
const catalog=JSON.parse(readFileSync(fileURLToPath(new URL('../lib/dpp-catalog-data.json',import.meta.url)),'utf8'));
const dpp=state.pw.dpp ?? (state.pw.batchId===catalog.snapshot.batchId ? catalog.snapshot : undefined);
if(dpp) snapshot.dpp=sharedDPP(dpp,dpp.batchId===catalog.snapshot.batchId ? catalog.subjects : []);
const target=fileURLToPath(new URL('../docs/progress.json',import.meta.url));
let current;
try{current=JSON.parse(readFileSync(target,'utf8'));}catch{}
if(current&&Date.parse(current.updatedAt)>Date.parse(snapshot.updatedAt)) throw new Error('Refusing to replace a newer shared snapshot.');
const output=JSON.stringify(snapshot,null,2)+'\n';
if(current&&JSON.stringify(current)===JSON.stringify(snapshot)){console.log('Shared snapshot already current.');}
else{writeFileSync(target,output);console.log('Updated docs/progress.json from the saved tracker snapshot.');}
