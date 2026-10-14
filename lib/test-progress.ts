import type { DPPSnapshot } from "./dpp-progress";

export type PWTest = {
  name: string;
  subject: string;
  attempts: number;
  startsAt?: string;
  startDateLabel?: string;
  status: "completed" | "not-started" | "in-progress" | "upcoming" | "unknown";
};
export type PWSnapshot = {
  batchId: string;
  capturedAt: string;
  subjects: { name: string; progress: number | null }[];
  tests: PWTest[];
  dpp?: DPPSnapshot;
};

export function testSummary(tests: PWTest[]) {
  const completed = tests.filter(t => t.status === "completed").length;
  const upcoming = tests.filter(t => t.status === "upcoming").length;
  const available = tests.length - upcoming;
  return { completed, upcoming, available, total: tests.length,
    percent: available ? Math.round(completed / available * 100) : 0 };
}

// Partial/filtered pages never delete previously discovered tests. A newer
// completed result cannot be downgraded by an older open browser tab.
export function mergePWTests(oldTests: PWTest[], nextTests: PWTest[]) {
  const map = new Map(oldTests.map(t => [t.name.trim().toLowerCase(), t]));
  for (let next of nextTests) {
    const key = next.name.trim().toLowerCase();
    const previous = map.get(key);
    next = { ...next, startsAt: next.startsAt ?? previous?.startsAt, startDateLabel: next.startDateLabel ?? previous?.startDateLabel };
    map.set(key, previous?.status === "completed" && next.status !== "completed"
      ? { ...next, status: "completed", attempts: Math.max(previous.attempts, next.attempts) }
      : { ...next, attempts: Math.max(previous?.attempts ?? 0, next.attempts) });
  }
  return [...map.values()];
}
