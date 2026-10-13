import {
  getStudyState,
  saveStudyState,
  userIdFromRequest,
  type StudyState,
} from "@/lib/study-state";
import { z } from "zod";

const stateSchema = z.object({
  subjects: z.array(z.object({name:z.string().trim().min(1).max(160),progress:z.number().min(0).max(100).nullable()})).max(100),
  sessions:z.array(z.object({id:z.string().min(1),subject:z.string().min(1),minutes:z.number().int().min(1).max(1440),topic:z.string().max(1000),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)})).max(200),
  tests:z.array(z.object({id:z.string().min(1),name:z.string().trim().min(1).max(240),subject:z.string().max(160).optional(),score:z.number().finite(),outOf:z.number().positive(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).refine(t=>t.score<=t.outOf,"Score cannot exceed maximum marks")).max(1000),
  updatedAt:z.string().datetime(),
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return Response.json(await getStudyState(userIdFromRequest(request)), {headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load progress.";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = userIdFromRequest(request);
    const state = stateSchema.parse(await request.json()) as StudyState;
    const current = await getStudyState(userId);
    state.pw = current.pw;
    return Response.json(await saveStudyState(userId, state));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save progress.";
    return Response.json({ error: message }, { status: 400 });
  }
}
