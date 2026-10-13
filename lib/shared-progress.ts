import type { StudyState } from "./study-state";
import { testSummary } from "./test-progress";
import { sharedDPP } from "./shared-dpp";
import { dppCatalog, dppCatalogSubjects, DPP_BATCH_ID } from "./dpp-catalog";

export function sharedProgress(state: StudyState) {
  const tests = state.pw?.tests ?? [];
  const groups = [...new Set(tests.map(test => test.subject))].sort().map(subject => {
    const summary = testSummary(tests.filter(test => test.subject === subject));
    return {subject,completed:summary.completed,available:summary.available,upcoming:summary.upcoming};
  });
  const snapshot = state.pw?.dpp ?? (!state.pw || state.pw.batchId === DPP_BATCH_ID ? dppCatalog : undefined);
  return {title:"Ansh’s CS GATE progress",updatedAt:state.updatedAt,pwCapturedAt:state.pw?.capturedAt ?? null,subjects:state.subjects.map(({name,progress})=>({name,progress})),tests:{...testSummary(tests),groups},
    ...(snapshot ? { dpp: sharedDPP(snapshot, snapshot.batchId === DPP_BATCH_ID ? dppCatalogSubjects : []) } : {}),
    dashboard: {subjects: state.subjects, sessions: state.sessions, tests: state.tests, updatedAt: state.updatedAt,
      ...(state.pw ? {pw:{batchId:state.pw.batchId,tests:state.pw.tests,capturedAt:state.pw.capturedAt,...(snapshot ? {dpp:snapshot} : {})}} : {})}};
}
