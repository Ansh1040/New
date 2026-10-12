import {
  getStudyState,
  saveStudyState,
  userIdFromRequest,
  type StudyState,
} from "@/lib/study-state";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return Response.json(await getStudyState(userIdFromRequest(request)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load progress.";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = userIdFromRequest(request);
    const state = (await request.json()) as StudyState;
    if (!state || !Array.isArray(state.subjects) || !Array.isArray(state.sessions) || !Array.isArray(state.tests)) {
      return Response.json({ error: "The study tracker data is incomplete." }, { status: 400 });
    }
    return Response.json(await saveStudyState(userId, state));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save progress.";
    return Response.json({ error: message }, { status: 400 });
  }
}
