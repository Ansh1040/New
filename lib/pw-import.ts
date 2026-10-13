import { z } from "zod";
import { mergePWTests } from "./test-progress";
import type { StudyState } from "./study-state";
import { dppSnapshotSchema } from "./dpp-import";
import { mergeDPPSnapshot } from "./dpp-progress";
import { dppCatalog, DPP_BATCH_ID } from "./dpp-catalog";

export const pwSnapshotSchema = z.object({
  batchId: z.string().regex(/^[a-f0-9]{24}$/),
  capturedAt: z.string().datetime(),
  subjects: z.array(z.object({ name: z.string().trim().min(1).max(160), progress: z.number().min(0).max(100).nullable() })).max(100),
  tests: z.array(z.object({ name: z.string().trim().min(1).max(240), subject: z.string().trim().min(1).max(160),
    attempts: z.number().int().min(0).max(10000), status: z.enum(["completed", "not-started", "in-progress", "upcoming", "unknown"]) })).max(1000),
  dpp: dppSnapshotSchema.optional(),
});

export function applyPWSnapshot(state: StudyState, input: unknown) {
  const snapshot = pwSnapshotSchema.parse(input);
  if (!snapshot.tests.length && !snapshot.subjects.length && !snapshot.dpp?.chapters.length && !snapshot.dpp?.resources.length) throw new Error("No PW progress found. Open All Classes, All Tests, or a DPP chapter in your batch and try again.");
  if (state.pw && state.pw.batchId !== snapshot.batchId) throw new Error("This is a different PW batch. Open the batch already connected to your tracker.");
  if (Date.parse(snapshot.capturedAt) > Date.now() + 300000) throw new Error("The capture date is in the future. Check your computer clock.");
  if (state.pw && snapshot.capturedAt < state.pw.capturedAt) throw new Error("This capture is older than your last PW update. Capture the page again.");
  if (snapshot.dpp && snapshot.dpp.batchId !== snapshot.batchId) throw new Error("The DPP inventory belongs to a different PW batch.");
  if (snapshot.dpp && (Date.parse(snapshot.dpp.capturedAt) > Date.now() + 300000 || snapshot.dpp.resources.some(resource => Date.parse(resource.capturedAt) > Date.now() + 300000))) throw new Error("The DPP capture date is in the future. Check your computer clock.");
  const existingDPP = state.pw?.dpp ?? (snapshot.batchId === DPP_BATCH_ID ? dppCatalog : undefined);
  const dpp = snapshot.dpp ? mergeDPPSnapshot(existingDPP, snapshot.dpp) : existingDPP;
  for (const subject of snapshot.subjects) {
    const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = state.subjects.find(s => normalized(s.name) === normalized(subject.name) ||
      (s.name === "Database Management…" && /^Database Management/i.test(subject.name)));
    if (existing) { existing.name = subject.name; if (subject.progress !== null) existing.progress = subject.progress; }
    else state.subjects.push(subject);
  }
  state.pw = { batchId: snapshot.batchId, tests: mergePWTests(state.pw?.tests ?? [], snapshot.tests),
    capturedAt: snapshot.capturedAt, lastSyncedAt: new Date().toISOString(), ...(dpp ? { dpp } : {}) };
  return state;
}
