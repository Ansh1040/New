import type { DPPSnapshot } from "./dpp-progress";

export function sharedDPP(snapshot: DPPSnapshot, subjects: string[] = []) {
  const key = (subject: string, chapter: string) => [subject, chapter].map(value => value.trim().replace(/\s+/g, " ").toLowerCase()).join("|");
  const resources = [...new Map(snapshot.resources.map(item => [item.id, item])).values()];
  const chapters = [...new Map(snapshot.chapters.map(item => [item.id, item])).values()];
  const names = [...new Set([...subjects, ...chapters.map(item => item.subject), ...resources.map(item => item.subject)])];
  const groups = names.map(subject => {
    const subjectResources = resources.filter(item => item.subject === subject);
    const subjectChapters = chapters.filter(item => item.subject === subject);
    const chapterNames = [...new Set([...subjectChapters.map(item => key(subject, item.name)), ...subjectResources.map(item => key(subject, item.chapter))])];
    let completed = 0;
    let available = 0;
    for (const name of chapterNames) {
      const quizzes = subjectResources.filter(item => key(subject, item.chapter) === name && item.type === "quiz");
      const counters = subjectChapters.filter(item => key(subject, item.name) === name);
      const total = Math.max(quizzes.length, ...counters.map(item => item.quizTotal ?? 0));
      available += total;
      completed += Math.min(total, Math.max(quizzes.filter(item => item.status === "completed").length, ...counters.map(item => item.quizCompleted ?? 0)));
    }
    return { subject, completed, available, pdfs: subjectResources.filter(item => item.type === "pdf").length,
      videos: subjectResources.filter(item => item.type === "video").length };
  });
  const completed = groups.reduce((sum, group) => sum + group.completed, 0);
  const available = groups.reduce((sum, group) => sum + group.available, 0);
  return { capturedAt: snapshot.capturedAt, completed, available,
    percent: available ? Math.round(completed / available * 100) : 0,
    pdfs: groups.reduce((sum, group) => sum + group.pdfs, 0),
    videos: groups.reduce((sum, group) => sum + group.videos, 0), groups };
}
