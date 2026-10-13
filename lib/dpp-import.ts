import { z } from "zod";

const count = z.number().int().min(0).max(100000).nullable();
const name = z.string().trim().min(1).max(300);

export const dppSnapshotSchema = z.object({
  batchId: z.string().regex(/^[a-f0-9]{24}$/),
  capturedAt: z.string().datetime(),
  chapters: z.array(z.object({
    id: z.string().min(1).max(2500),
    subject: name,
    name,
    lectureCompleted: count,
    lectureTotal: count,
    quizCompleted: count,
    quizTotal: count,
  }).refine(chapter =>
    (chapter.lectureCompleted === null || chapter.lectureTotal === null || chapter.lectureCompleted <= chapter.lectureTotal) &&
    (chapter.quizCompleted === null || chapter.quizTotal === null || chapter.quizCompleted <= chapter.quizTotal),
  "Completed DPP or lecture counts cannot exceed the available total.")).max(2000),
  resources: z.array(z.object({
    id: z.string().min(1).max(4000),
    subject: name,
    chapter: name,
    type: z.enum(["quiz", "pdf", "video"]),
    title: z.string().trim().min(1).max(500),
    releaseLabel: z.string().max(100),
    details: z.string().max(1000),
    status: z.enum(["completed", "pending", "unknown"]),
    capturedAt: z.string().datetime(),
  })).max(6000),
});
