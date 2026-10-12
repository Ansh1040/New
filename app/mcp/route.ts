import {
  getStudyState,
  saveStudyState,
  userIdFromRequest,
  type StudySession,
  type StudyState,
  type TestResult,
} from "@/lib/study-state";

export const dynamic = "force-dynamic";

const tools = [
  {
    name: "get_study_progress",
    description: "Read the user's private CS GATE subject progress, study sessions, and test results.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "update_subject_progress",
    description: "Set a CS GATE subject's PW completion percentage from 0 to 100.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Subject name as shown in the course." },
        percent: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["subject", "percent"],
      additionalProperties: false,
    },
  },
  {
    name: "log_study_session",
    description: "Record a completed CS GATE study session in minutes.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        minutes: { type: "integer", minimum: 1, maximum: 1440 },
        topic: { type: "string" },
        date: { type: "string", description: "Optional ISO date; defaults to today." },
      },
      required: ["subject", "minutes"],
      additionalProperties: false,
    },
  },
  {
    name: "record_test_result",
    description: "Record a CS GATE practice test score.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        score: { type: "number", minimum: 0 },
        outOf: { type: "number", exclusiveMinimum: 0 },
        date: { type: "string", description: "Optional ISO date; defaults to today." },
      },
      required: ["name", "score", "outOf"],
      additionalProperties: false,
    },
  },
];

type RpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const today = () => new Date().toISOString().slice(0, 10);
const textResult = (value: unknown) => ({ content: [{ type: "text", text: JSON.stringify(value) }] });

export async function POST(request: Request) {
  const rpc = (await request.json()) as RpcRequest;
  const respond = (result: unknown, error?: { code: number; message: string }) =>
    Response.json(error
      ? { jsonrpc: "2.0", id: rpc.id ?? null, error }
      : { jsonrpc: "2.0", id: rpc.id ?? null, result });

  if (rpc.method === "server/discover") {
    return respond({ supportedVersions: ["2026-07-28"], capabilities: { tools: {} } });
  }
  if (rpc.method === "tools/list") return respond({ tools });
  if (rpc.method !== "tools/call") return respond(null, { code: -32601, message: "Method not found." });

  try {
    const userId = userIdFromRequest(request);
    const name = String(rpc.params?.name ?? "");
    const args = (rpc.params?.arguments ?? {}) as Record<string, unknown>;
    let state: StudyState = await getStudyState(userId);

    if (name === "get_study_progress") return respond(textResult(state));

    if (name === "update_subject_progress") {
      const subject = String(args.subject ?? "").trim();
      const percent = Number(args.percent);
      if (!subject || !Number.isInteger(percent) || percent < 0 || percent > 100) {
        return respond(null, { code: -32602, message: "Provide a subject and a whole-number percentage from 0 to 100." });
      }
      const existing = state.subjects.find((item) => item.name.toLowerCase() === subject.toLowerCase());
      if (existing) existing.progress = percent;
      else state.subjects.push({ name: subject, progress: percent });
      state = await saveStudyState(userId, state);
      return respond(textResult({ subject, percent, updated: true }));
    }

    if (name === "log_study_session") {
      const subject = String(args.subject ?? "").trim();
      const minutes = Number(args.minutes);
      if (!subject || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
        return respond(null, { code: -32602, message: "Provide a subject and study time from 1 to 1440 whole minutes." });
      }
      const session: StudySession = {
        id: crypto.randomUUID(), subject, minutes,
        topic: String(args.topic ?? "").trim(), date: String(args.date ?? today()),
      };
      state.sessions.unshift(session);
      state.sessions = state.sessions.slice(0, 200);
      await saveStudyState(userId, state);
      return respond(textResult({ logged: true, session }));
    }

    if (name === "record_test_result") {
      const testName = String(args.name ?? "").trim();
      const score = Number(args.score);
      const outOf = Number(args.outOf);
      if (!testName || !Number.isFinite(score) || !Number.isFinite(outOf) || score < 0 || outOf <= 0 || score > outOf) {
        return respond(null, { code: -32602, message: "Provide a test name and a score between 0 and the maximum score." });
      }
      const test: TestResult = {
        id: crypto.randomUUID(), name: testName, score, outOf, date: String(args.date ?? today()),
      };
      state.tests.unshift(test);
      state.tests = state.tests.slice(0, 200);
      await saveStudyState(userId, state);
      return respond(textResult({ saved: true, test }));
    }

    return respond(null, { code: -32602, message: "Unknown study tracker tool." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Study tracker request failed.";
    return respond(null, { code: -32000, message });
  }
}
