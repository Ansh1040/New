import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const page=fs.readFileSync(new URL('../docs/gate-timeline-tree.html',import.meta.url),'utf8');
const attr=page.match(/data-srcdoc="([\s\S]*?)"\s*>/);assert.ok(attr,'Sandboxed timeline exists');
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
const inner=attr[1].replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,key)=>key[0]==='#'?String.fromCodePoint(key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1))):entities[key]);
const model=inner.match(/<script>\s*(function buildLecturePlan[\s\S]*?)\n\(\(\) => \{/);assert.ok(model,'Pure planning functions exist');
const data=inner.match(/const subjects = (\[[\s\S]*?\]);\s*const byId/);assert.ok(data,'Subject inventory exists');
const subjects=JSON.parse(data[1]);
const api=vm.runInNewContext(model[1]+';({buildLecturePlan,buildWeeklyCountReview,weeklyUnitLectureRange})',{}, {timeout:1000});
const feed=JSON.parse(fs.readFileSync(new URL('../docs/progress.json',import.meta.url),'utf8'));
const chapters=feed.dashboard?.pw?.dpp?.chapters||[];
let checks=0,liveChecks=0;
for(const limit of [3,4])for(const pace of ['3','4','5','6','ramp4','ramp5'])for(const reserves of [{dm:0,algo:0,prob:0},{dm:40,algo:40,prob:30}]){
 const plan=api.buildLecturePlan(subjects,pace,reserves,'2026-10-28',limit);
 const weeks=api.buildWeeklyCountReview(subjects,plan,Object.fromEntries(subjects.map(s=>[s.id,s.done])),'2026-10-25');
 for(const week of weeks)for(const row of week.rows)for(const r of row.ranges){
  const start=r.captured+r.from,end=r.captured+r.to;
  assert.ok(start>=1&&end<=r.total);
  for(let done=0;done<=r.total;done++){
   const view=api.weeklyUnitLectureRange(r,{done,total:r.total});checks++;
   assert.equal(view.state.count,done+'/'+r.total);
   if(done>=end)assert.ok(view.label.startsWith('Weekly target met'));
   else{const next=Math.max(start,done+1),count=end-next+1;assert.equal(view.label,(count===1?'Lecture ':'Lectures ')+next+(count===1?'':'–'+end)+' due this week · '+count+' lecture'+(count===1?'':'s'));assert.equal(view.pendingCount,count);assert.equal(view.unitTotal,r.total);}
  }
  const subject=subjects.find(s=>s.id===row.id),live=chapters.find(c=>c.subject===subject.name&&c.name===r.name);
  if(live&&Number.isInteger(live.lectureCompleted)&&Number.isInteger(live.lectureTotal)){
   const view=api.weeklyUnitLectureRange(r,{done:live.lectureCompleted,total:live.lectureTotal});liveChecks++;
   assert.equal(view.state.count,live.lectureCompleted+'/'+live.lectureTotal);
   if(view.pendingCount>0){assert.ok(view.from>live.lectureCompleted);assert.equal(view.unitTotal,live.lectureTotal);assert.equal(view.pendingCount,view.to-view.from+1);}
  }
 }
}
const query={captured:1,total:13,from:1,to:6};
assert.equal(api.weeklyUnitLectureRange(query,{done:3,total:13}).label,'Lectures 4–7 due this week · 4 lectures');
assert.equal(api.weeklyUnitLectureRange(query,{done:2,total:13}).label,'Lectures 3–7 due this week · 5 lectures');
assert.equal(api.weeklyUnitLectureRange(query,{done:3,total:15}).label,'Lectures 4–7 due this week · 4 lectures');
assert.equal(api.weeklyUnitLectureRange(query,{done:null,total:13}).label,'Weekly lecture range unavailable');
console.log(`Passed ${checks} range/completion checks and ${liveChecks} published-unit checks across all weeks and 24 planning scenarios.`);
