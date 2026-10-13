import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(fs.readFileSync("lib/dpp-progress.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
new Function("module", "exports", code)(module, module.exports);
const { DPP_BATCH_ID, dppChapterId, dppResourceId, mergeDPPSnapshot, summarizeDPP } = module.exports;
const { subjects, snapshot } = JSON.parse(fs.readFileSync("lib/dpp-catalog-data.json", "utf8"));
assert.equal(subjects.length, 19);
assert.equal(snapshot.batchId, DPP_BATCH_ID);
assert.equal(snapshot.chapters.length, 73);
assert.equal(new Set(snapshot.chapters.map(chapter => chapter.id)).size, 73);
assert.equal(new Set(snapshot.resources.map(resource => resource.id)).size, 273);
assert.deepEqual(summarizeDPP(snapshot), {
  chapters: 73, quizzes: 66, completed: 1, pending: 65, unknown: 0,
  pdfs: 139, videos: 68, total: 273, percent: 2,
});
for (const resource of snapshot.resources) {
  assert.equal(resource.id, dppResourceId(resource.type, resource.subject, resource.chapter, resource.title));
}
assert.equal(dppChapterId(" OS ", " CPU   Scheduling "), dppChapterId("os", "cpu scheduling"));
const tabular = snapshot.chapters.filter(chapter => chapter.name === "Tabular Method – Quine McCluskey Method");
assert.equal(tabular.length, 2);
assert.notEqual(tabular[0].id, tabular[1].id);
assert.ok(tabular[0].id.endsWith(":ch-05"));
assert.ok(tabular[1].id.endsWith(":ch-06"));

const before = JSON.stringify(snapshot);
const completedQuiz = snapshot.resources.find(resource => resource.status === "completed");
const ownerChapter = snapshot.chapters.find(chapter => chapter.subject === completedQuiz.subject && chapter.name === completedQuiz.chapter);
const later = "2026-10-14T10:00:00.000Z";
const newQuiz = {
  ...completedQuiz,
  id: dppResourceId("quiz", completedQuiz.subject, completedQuiz.chapter, "Newly released DPP 02 Quiz"),
  title: "Newly released DPP 02 Quiz", status: "pending", capturedAt: later,
};
const partial = {
  batchId: DPP_BATCH_ID, capturedAt: later,
  chapters: [{ ...ownerChapter, lectureCompleted: null, lectureTotal: null, quizCompleted: 0, quizTotal: 2 }],
  resources: [{ ...completedQuiz, status: "pending", capturedAt: later }, newQuiz, newQuiz],
};
const merged = mergeDPPSnapshot(snapshot, partial);
assert.equal(merged.chapters.length, 73);
assert.equal(merged.resources.length, 274);
assert.equal(summarizeDPP(merged).quizzes, 67);
assert.equal(summarizeDPP(merged).completed, 1);
assert.equal(merged.resources.find(resource => resource.id === completedQuiz.id).status, "completed");
assert.equal(merged.chapters.find(chapter => chapter.id === ownerChapter.id).quizTotal, 2);
assert.equal(merged.chapters.find(chapter => chapter.id === ownerChapter.id).quizCompleted, 1);
assert.equal(merged.chapters.find(chapter => chapter.id === ownerChapter.id).lectureTotal, ownerChapter.lectureTotal);
assert.equal(JSON.stringify(snapshot), before);
assert.deepEqual(mergeDPPSnapshot(merged, partial), merged);

const stale = { ...partial, capturedAt: "2026-10-12T10:00:00.000Z", resources: [{ ...newQuiz, details: "stale metadata", status: "unknown", capturedAt: "2026-10-12T10:00:00.000Z" }] };
const afterStale = mergeDPPSnapshot(merged, stale);
assert.equal(afterStale.capturedAt, later);
assert.equal(afterStale.resources.find(resource => resource.id === newQuiz.id).status, "pending");
assert.notEqual(afterStale.resources.find(resource => resource.id === newQuiz.id).details, "stale metadata");
assert.throws(() => mergeDPPSnapshot(merged, { ...partial, batchId: "another-batch" }), /different PW batch/);
console.log("DPP checks passed: exact captured inventory, duplicate chapter preservation, stable IDs, partial imports, new releases, completion preservation, stale metadata and batch separation.");
