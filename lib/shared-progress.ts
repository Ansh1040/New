import type { StudyState } from "./study-state";
import { testSummary } from "./test-progress";

export function sharedProgress(state: StudyState) {
  const tests = state.pw?.tests ?? [];
  const groups = [...new Set(tests.map(test => test.subject))].sort().map(subject => {
    const summary = testSummary(tests.filter(test => test.subject === subject));
    return {subject,completed:summary.completed,available:summary.available,upcoming:summary.upcoming};
  });
  return {title:"Ansh’s CS GATE progress",updatedAt:state.updatedAt,pwCapturedAt:state.pw?.capturedAt ?? null,subjects:state.subjects.map(({name,progress})=>({name,progress})),tests:{...testSummary(tests),groups}};
}
