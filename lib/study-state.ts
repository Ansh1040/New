import dateCatalog from "./pw-test-date-catalog.json";
import { env } from "cloudflare:workers";
import type { PWTest } from "./test-progress";
import type { DPPSnapshot } from "./dpp-progress";

export type Subject = { name: string; progress: number | null };
export type StudySession = {
  id: string;
  subject: string;
  minutes: number;
  topic: string;
  date: string;
};
export type TestResult = {
  id: string;
  name: string;
  subject?: string;
  score: number;
  outOf: number;
  date: string;
};
export type StudyState = {
  subjects: Subject[];
  sessions: StudySession[];
  tests: TestResult[];
  pw?: { batchId: string; tests: PWTest[]; lastSyncedAt: string; capturedAt: string; dpp?: DPPSnapshot };
  updatedAt: string;
};

const screenshotSubjects: Subject[] = [
  { name: "Theory of Computation", progress: 36 },
  { name: "Database Management…", progress: 26 },
  { name: "Operating Systems", progress: 11 },
  { name: "Compiler Design", progress: 0 },
  { name: "General Aptitude", progress: 0 },
  { name: "Data Structure & Programming", progress: 0 },
  { name: "C Programming", progress: 0 },
  { name: "Computer Networks", progress: 0 },
  { name: "Digital Logic", progress: 0 },
  { name: "Verbal Aptitude", progress: 0 },
  { name: "Discrete Mathematics", progress: null },
  { name: "Algorithms", progress: null },
  { name: "Probability and Statistics", progress: null },
  { name: "Linear Algebra", progress: null },
];

export function userIdFromRequest(request: Request) {
  const userId = request.headers.get("oai-authenticated-user-id");
  if (!userId) throw new Error("Sign in to your private study tracker first.");
  return userId;
}

export function initialState(): StudyState {
  return {
    subjects: screenshotSubjects.map((subject) => ({ ...subject })),
    sessions: [],
    tests: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function getStudyState(userId: string): Promise<StudyState> {
  if (!env.DB) throw new Error("The study database is unavailable.");
  const row = await env.DB.prepare(
    "SELECT state FROM study_state WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ state: string }>();

  if (!row) {
    const state = initialState();
    await saveStudyState(userId, state);
    return state;
  }
  const state = JSON.parse(row.state) as StudyState;
  if (state.pw?.batchId === dateCatalog.batchId) {
    let restored = false;
    for (const test of state.pw.tests) {
      const known = dateCatalog.tests.find(item => item.name.trim().toLowerCase() === test.name.trim().toLowerCase());
      if (known && !test.startsAt) { test.startsAt = known.startsAt; test.startDateLabel = known.startDateLabel; restored = true; }
    }
    if (restored) return saveStudyState(userId, state);
  }
  return state;
}

export async function saveStudyState(userId: string, state: StudyState) {
  if (!env.DB) throw new Error("The study database is unavailable.");
  const previousVersion = state.updatedAt;
  state.updatedAt = new Date(Math.max(Date.now(), (Date.parse(previousVersion) || 0) + 1)).toISOString();
  const result = await env.DB.prepare(
    "INSERT INTO study_state (user_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at WHERE json_extract(study_state.state, '$.updatedAt') = ?",
  )
    .bind(userId, JSON.stringify(state), Date.now(), previousVersion)
    .run();
  if (!result.meta.changes) throw new Error("Your tracker changed in another tab. Refresh saved data and try again.");
  return state;
}

export function averageProgress(subjects: Subject[]) {
  const tracked = subjects.filter(
    (subject): subject is Subject & { progress: number } =>
      subject.progress !== null,
  );
  if (!tracked.length) return 0;
  return Math.round(
    tracked.reduce((sum, subject) => sum + subject.progress, 0) /
      tracked.length,
  );
}
