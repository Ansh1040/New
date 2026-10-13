export const DPP_BATCH_ID = "6a6db276dcb67d138689a93d";

export type DPPResource = {
  id: string;
  subject: string;
  chapter: string;
  type: "quiz" | "pdf" | "video";
  title: string;
  releaseLabel: string;
  details: string;
  status: "completed" | "pending" | "unknown";
  capturedAt: string;
};

export type DPPChapter = {
  id: string;
  subject: string;
  name: string;
  lectureCompleted: number | null;
  lectureTotal: number | null;
  quizCompleted: number | null;
  quizTotal: number | null;
};

export type DPPSnapshot = {
  batchId: string;
  capturedAt: string;
  chapters: DPPChapter[];
  resources: DPPResource[];
};

function identityPart(value: string) {
  return encodeURIComponent(value.trim().replace(/\s+/g, " ").toLowerCase());
}

// A discriminator is needed only when PW displays two chapters with exactly
// the same subject/name. Keep their observed CH number so neither is lost.
export function dppChapterId(subject: string, name: string, discriminator?: string | number) {
  const parts = [subject, name];
  if (discriminator !== undefined && discriminator !== "") parts.push(String(discriminator));
  return `dpp-chapter:${parts.map(identityPart).join(":")}`;
}

export function dppResourceId(type: DPPResource["type"], subject: string, chapter: string, title: string) {
  return `dpp-resource:${[type, subject, chapter, title].map(identityPart).join(":")}`;
}

function knownMaximum(previous: number | null, incoming: number | null) {
  if (previous === null) return incoming;
  if (incoming === null) return previous;
  return Math.max(previous, incoming);
}

function laterTime(previous: string, incoming: string) {
  return Date.parse(incoming) >= Date.parse(previous) ? incoming : previous;
}

/**
 * PW pages may show one chapter or a filtered list. Merge discoveries instead
 * of replacing the inventory. New releases increase the count; an older tab
 * or pending-only view never clears completed work or known chapter counters.
 */
export function mergeDPPSnapshot(previous: DPPSnapshot | null | undefined, incoming: DPPSnapshot): DPPSnapshot {
  if (previous && previous.batchId !== incoming.batchId) {
    throw new Error("DPP data belongs to a different PW batch.");
  }
  const chapters = new Map<string, DPPChapter>();
  const resources = new Map<string, DPPResource>();
  for (const chapter of previous?.chapters ?? []) chapters.set(chapter.id, { ...chapter });
  for (const resource of previous?.resources ?? []) resources.set(resource.id, { ...resource });
  const newer = !previous || Date.parse(incoming.capturedAt) >= Date.parse(previous.capturedAt);

  for (const chapter of incoming.chapters) {
    const old = chapters.get(chapter.id);
    if (!old) {
      chapters.set(chapter.id, { ...chapter });
      continue;
    }
    chapters.set(chapter.id, {
      ...(newer ? chapter : old),
      lectureCompleted: knownMaximum(old.lectureCompleted, chapter.lectureCompleted),
      lectureTotal: knownMaximum(old.lectureTotal, chapter.lectureTotal),
      quizCompleted: knownMaximum(old.quizCompleted, chapter.quizCompleted),
      quizTotal: knownMaximum(old.quizTotal, chapter.quizTotal),
    });
  }
  for (const resource of incoming.resources) {
    const old = resources.get(resource.id);
    if (!old) {
      resources.set(resource.id, { ...resource });
      continue;
    }
    const latest = Date.parse(resource.capturedAt) >= Date.parse(old.capturedAt) ? resource : old;
    const status = old.status === "completed" || resource.status === "completed"
      ? "completed"
      : latest.status === "unknown" && old.status !== "unknown" ? old.status : latest.status;
    resources.set(resource.id, {
      ...latest,
      releaseLabel: latest.releaseLabel || old.releaseLabel,
      details: latest.details || old.details,
      status,
      capturedAt: laterTime(old.capturedAt, resource.capturedAt),
    });
  }

  // Individual quiz cards are another lower bound for chapter totals. A new
  // DPP can be discovered before PW refreshes the chapter overview counter.
  for (const chapter of chapters.values()) {
    const quizzes = [...resources.values()].filter(resource => resource.type === "quiz"
      && identityPart(resource.subject) === identityPart(chapter.subject)
      && identityPart(resource.chapter) === identityPart(chapter.name));
    if (quizzes.length) {
      chapter.quizTotal = knownMaximum(chapter.quizTotal, quizzes.length);
      const completed = quizzes.filter(resource => resource.status === "completed").length;
      if (completed || chapter.quizCompleted !== null) {
        chapter.quizCompleted = knownMaximum(chapter.quizCompleted, completed);
      }
    }
  }
  return {
    batchId: incoming.batchId,
    capturedAt: previous ? laterTime(previous.capturedAt, incoming.capturedAt) : incoming.capturedAt,
    chapters: [...chapters.values()],
    resources: [...resources.values()],
  };
}

export function summarizeDPP(snapshot: DPPSnapshot) {
  const quizzes = snapshot.resources.filter(resource => resource.type === "quiz");
  const completed = quizzes.filter(resource => resource.status === "completed").length;
  const pending = quizzes.filter(resource => resource.status === "pending").length;
  const unknown = quizzes.length - completed - pending;
  return {
    chapters: snapshot.chapters.length,
    quizzes: quizzes.length,
    completed,
    pending,
    unknown,
    pdfs: snapshot.resources.filter(resource => resource.type === "pdf").length,
    videos: snapshot.resources.filter(resource => resource.type === "video").length,
    total: snapshot.resources.length,
    percent: quizzes.length ? Math.round(completed / quizzes.length * 100) : 0,
  };
}
