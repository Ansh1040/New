import { getStudyState, saveStudyState, userIdFromRequest } from "@/lib/study-state";
import { applyPWSnapshot } from "@/lib/pw-import";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const userId = userIdFromRequest(request);
    const input = await request.text();
    if (input.length > 500000) throw new Error("The import is too large.");
    const snapshots = JSON.parse(input);
    const items = Array.isArray(snapshots) ? snapshots : [snapshots];
    if (!items.length || items.length > 10) throw new Error("Import between 1 and 10 PW pages at a time.");
    let state = await getStudyState(userId);
    for (const item of items.sort((a, b) => String(a.capturedAt).localeCompare(String(b.capturedAt)))) state = applyPWSnapshot(state, item);
    return Response.json(await saveStudyState(userId, state), {headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "PW import failed." }, { status: 400 });
  }
}
