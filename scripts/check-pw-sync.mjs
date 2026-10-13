import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
function load(file, overrides={}) {
  const code=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function("require","module","exports",code)(name=>overrides[name]??require(name),module,module.exports);
  return module.exports;
}
const progress=load("lib/test-progress.ts");
const importer=load("lib/pw-import.ts",{"./test-progress":progress});
const test=(name,status,attempts=0)=>({name,subject:"Operating Systems",status,attempts});
assert.deepEqual(progress.testSummary([test("A","completed",1),test("B","not-started"),test("C","upcoming")]),{completed:1,available:2,upcoming:1,total:3,percent:50});
const old=[test("A","completed",1),test("B","not-started")];
const merged=progress.mergePWTests(old,[test("A","not-started"),test("C","upcoming")]);
assert.equal(merged.length,3); assert.equal(merged[0].status,"completed");
assert.deepEqual(progress.mergePWTests(merged,[test("C","upcoming")]),merged);
const snapshot={batchId:"6a6db276dcb67d138689a93d",capturedAt:new Date().toISOString(),subjects:[],tests:old};
const state={subjects:[],tests:[],sessions:[],updatedAt:new Date().toISOString()};
importer.applyPWSnapshot(state,snapshot);
assert.throws(()=>importer.applyPWSnapshot(state,{...snapshot,batchId:"aaaaaaaaaaaaaaaaaaaaaaaa"}),/different PW batch/);
assert.throws(()=>importer.applyPWSnapshot(state,{...snapshot,capturedAt:"2020-01-01T00:00:00.000Z"}),/older/);
assert.throws(()=>importer.applyPWSnapshot(state,{...snapshot,subjects:[{name:"OS",progress:120}]}));
assert.throws(()=>importer.applyPWSnapshot(state,{...snapshot,tests:[],subjects:[]}),/No PW progress/);
// Future tests and resumable attempts must not count as completed.
function card(name,text,shown=true){return {innerText:text,querySelector:()=>({textContent:name}),getClientRects:()=>shown?[{}]:[]};}
const cards=[card("Mock Test 01","Mock Test 01\nAttempts: 0"),card("Operating Systems : Weekly Test 01","Attempts: 1\nView Result"),card("General Aptitude : Weekly Test 02","Upcoming\nAttempts: 0"),card("Operating Systems : Weekly Test 02","Attempts: 1\nResume"),card("Hidden test","Attempts: 2",false)];
const reader=fs.readFileSync("browser-extension/reader.js","utf8");
const context={location:{hostname:"www.pw.live",pathname:"/study-v2/batches/6a6db276dcb67d138689a93d/batch-overview"},document:{body:{innerText:"All Tests"},querySelectorAll:()=>cards}};
const captured=vm.runInNewContext(reader,context);
assert.equal(captured.tests.length,4);
assert.equal(captured.tests[0].subject,"Full syllabus mock");
assert.equal(captured.tests[1].status,"completed");
assert.equal(captured.tests[2].status,"upcoming");
assert.equal(captured.tests[3].status,"in-progress");
assert.equal(vm.runInNewContext(reader,{...context,location:{hostname:"evil.example",pathname:context.location.pathname}}),null);
const name=card("Theory of Computation","Th\nTheory of Computation\n36 %");
const subjects=vm.runInNewContext(reader,{...context,document:{body:{innerText:"All Classes\nCompletion % depends on lecture and DPP progress"},querySelectorAll:selector=>selector.includes("cardContainer")?[]:[name]}});
assert.equal(subjects.subjects[0].progress,36);
console.log("PW sync checks passed: counts, status exclusions, deduplication, partial imports, stale/wrong-batch rejection, validation, DOM extraction and origin guard.");
