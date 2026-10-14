"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { StudySession, StudyState, TestResult } from "@/lib/study-state";
import { PWProgress } from "@/components/pw-progress";
import { ThemeToggle } from "@/components/theme-control";
import { StudyCountdowns } from "@/components/study-countdowns";
import { useTaskNotifications } from "@/components/task-notifications";
import { DPPProgress } from "@/components/dpp-progress";
import { dppCatalog, dppCatalogSubjects, DPP_BATCH_ID } from "@/lib/dpp-catalog";
import { DailyProgressCalendar } from "@/components/daily-progress-calendar";

const blankState: StudyState = { subjects: [], sessions: [], tests: [], updatedAt: "" };

export default function Home() {
  const notify = useTaskNotifications();
  const [state, setState] = useState<StudyState>(blankState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));

  useEffect(() => {
    fetch("/api/state")
      .then(async (response) => {
        const body = await response.json() as StudyState & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not open your tracker.");
        setState(body);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not open your tracker."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (saving || loading) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/state", {cache: "no-store", signal: controller.signal});
        if (response.ok) { const next = await response.json() as StudyState; if (!controller.signal.aborted) setState(next); }
      } catch {}
    };
    const timer = window.setInterval(() => void refresh(), 60000);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [saving, loading]);

  const tracked = useMemo(() => state.subjects.filter((item) => item.progress !== null), [state.subjects]);
  const average = tracked.length
    ? Math.round(tracked.reduce((total, item) => total + (item.progress ?? 0), 0) / tracked.length)
    : 0;
  const studyMinutes = state.sessions.reduce((total, session) => total + session.minutes, 0);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const todayMinutes = state.sessions.filter((session) => session.date === today).reduce((total, session) => total + session.minutes, 0);

  async function save(next: StudyState, message: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const body = await response.json() as StudyState & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not save your update.");
      setState(body);
      setNotice(message);
      notify(message, "Your tracker update has been saved.");
      window.setTimeout(() => setNotice(""), 2600);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your update.");
      notify("Update could not be saved", cause instanceof Error ? cause.message : "Please try again.", "error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updateProgress(event: FormEvent<HTMLFormElement>, name: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const progress = Number(form.get("progress"));
    const subjects = state.subjects.map((subject) => subject.name === name ? { ...subject, progress } : subject);
    await save({ ...state, subjects }, `${name} updated`);
  }

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newSubject.trim();
    if (!name || state.subjects.some((subject) => subject.name.toLowerCase() === name.toLowerCase())) return;
    await save({ ...state, subjects: [...state.subjects, { name, progress: 0 }] }, `${name} added`);
    setNewSubject("");
  }

  async function addSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const session: StudySession = {
      id: crypto.randomUUID(), subject: String(form.get("subject")),
      minutes: Number(form.get("minutes")), topic: String(form.get("topic") ?? ""), date: String(form.get("date") || today),
    };
    if (await save({ ...state, sessions: [session, ...state.sessions].slice(0, 200) }, "Study session logged")) element.reset();
  }

  async function addTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const test: TestResult = {
      id: crypto.randomUUID(), name: String(form.get("name")), score: Number(form.get("score")),
      outOf: Number(form.get("outOf")), date: String(form.get("date") || today), subject: String(form.get("subject")),
    };
    if (test.score > test.outOf) {setError("Score cannot exceed maximum marks."); return;}
    if (state.tests.length >= 1000) {setError("The tracker supports 1,000 saved scores."); return;}
    if (await save({ ...state, tests: [test, ...state.tests] }, "Test result saved")) element.reset();
  }

  return (
    <main className="tracker-landscape min-h-screen text-[color:var(--desk-foreground)]">
      <div aria-hidden="true" className="tracker-leaf-background" />
      <header className="border-b border-[var(--desk-border)] bg-[var(--desk-surface)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--desk-teal-bg)] text-lg font-black text-[color:var(--desk-button)]">G</div>
            <div><p className="text-sm font-bold tracking-tight">GATE COMPANION</p><p className="text-xs text-[color:var(--desk-muted)]">CS · PW progress tracker</p></div>
          </div>
          <div className="flex items-center gap-2"><ThemeToggle/><a href="https://www.pw.live/study-v2/study" target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--desk-border)] px-3 py-2 text-sm font-semibold text-[color:var(--desk-link)] hover:bg-[var(--desk-hover)]">Open PW ↗</a></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-14 pt-8 sm:px-8 sm:pt-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--desk-accent)]">Your study desk</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">CS GATE progress</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--desk-muted)]">Keep your PW completion snapshot, study time, and practice scores together.</p></div>
          <div className="rounded-xl border border-[var(--desk-border)] bg-[var(--desk-surface)] px-4 py-3 text-sm text-[color:var(--desk-muted)]"><span className="font-semibold text-[color:var(--desk-foreground)]">Today</span><span className="ml-2">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
        </div>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

        <StudyCountdowns />

        <section aria-label="Study summary" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Average PW progress" value={`${average}%`} detail={`${tracked.length} subjects with a visible percentage`} accent="teal" />
          <SummaryCard label="Study time today" value={`${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`} detail="From your logged sessions" accent="blue" />
          <SummaryCard label="Total study time" value={`${Math.floor(studyMinutes / 60)}h ${studyMinutes % 60}m`} detail={`${state.sessions.length} sessions recorded`} accent="amber" />
          <SummaryCard label="Recorded test scores" value={String(state.tests.length)} detail={state.tests.length ? `Latest: ${state.tests[0].name}` : "Log your first score"} accent="violet" />
        </section>

        {!loading && <DailyProgressCalendar sessions={state.sessions} tests={state.tests} selectedDate={entryDate} onSelectDate={setEntryDate} />}

        {!loading && <PWProgress state={state} onState={setState} busy={saving} />}

        {!loading && (!state.pw || state.pw.batchId === DPP_BATCH_ID || state.pw.dpp) && (
          <DPPProgress snapshot={state.pw?.dpp ?? dppCatalog} subjects={state.pw?.batchId && state.pw.batchId !== DPP_BATCH_ID ? undefined : dppCatalogSubjects} />
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,0.8fr)]">
          <section className="rounded-2xl border border-[var(--desk-border)] bg-[var(--desk-surface)] p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-xl font-bold">Subject progress</h2><p className="mt-1 text-sm text-[color:var(--desk-muted)]">Starting snapshot from your PW screenshot on 12 Oct 2026. Update a subject after your next lecture or DPP.</p></div>
              <span className="rounded-full bg-[var(--desk-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--desk-link)]">CS · GATE</span>
            </div>
            {loading ? <p className="py-10 text-center text-sm text-[color:var(--desk-muted)]">Loading your progress…</p> : (
              <div className="space-y-3">
                {state.subjects.map((subject) => (
                  <details key={subject.name} className="group rounded-xl border border-[var(--desk-border-soft)] px-4 py-3 open:border-[var(--desk-border-strong)] open:bg-[var(--desk-hover)]">
                    <summary className="flex cursor-pointer list-none items-center gap-4">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--desk-soft)] text-xs font-bold text-[color:var(--desk-link)]">{subject.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").slice(0, 2)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{subject.name}</span>
                        <span role="progressbar" aria-label={`${subject.name} study progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={subject.progress ?? undefined} aria-valuetext={subject.progress === null ? "Not recorded" : `${subject.progress}% completed`} className={`mt-2 block h-2.5 overflow-hidden rounded-full ${subject.progress === null ? "border border-dashed border-[var(--desk-border)] bg-[var(--desk-page)]" : "bg-[var(--desk-track)]"}`}>
                          {subject.progress !== null && <span className="block h-full rounded-full bg-[var(--desk-progress)] transition-all" style={{width:`${subject.progress}%`}}/>}
                        </span>
                        <span className="mt-1 block text-xs font-normal text-[color:var(--desk-muted)]">{subject.progress === null ? "Not recorded" : subject.progress === 100 ? "Completed" : subject.progress === 0 ? "Not started" : "In progress"}</span>
                      </span>
                      <span className="w-12 text-right text-sm font-bold tabular-nums text-[color:var(--desk-secondary)]">{subject.progress === null ? "—" : `${subject.progress}%`}</span>
                      <span aria-hidden="true" className="text-[color:var(--desk-subtle)] transition group-open:rotate-90">›</span>
                    </summary>
                    <div className="ml-[52px] mt-3">
                      <form onSubmit={(event) => updateProgress(event, subject.name)} className="flex flex-wrap items-end gap-3">
                        <label className="text-xs font-medium text-[color:var(--desk-muted)]">PW completion %<input name="progress" type="number" min="0" max="100" step="1" defaultValue={subject.progress ?? ""} required className="mt-1 block w-28 rounded-lg border border-[var(--desk-border)] px-3 py-2 text-sm text-[color:var(--desk-foreground)] outline-none focus:border-[var(--desk-accent)] focus:ring-2 focus:ring-[var(--desk-accent)]/15" /></label>
                        <button disabled={saving} className="rounded-lg bg-[var(--desk-button)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--desk-button-hover)] disabled:opacity-60">Save</button>
                      </form>
                    </div>
                  </details>
                ))}
              </div>
            )}
            <form onSubmit={addSubject} className="mt-5 flex gap-2 border-t border-[var(--desk-border-soft)] pt-5">
              <input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Add another subject" aria-label="New subject name" className="min-w-0 flex-1 rounded-lg border border-[var(--desk-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--desk-accent)]" />
              <button disabled={saving || !newSubject.trim()} className="rounded-lg border border-[var(--desk-border-strong)] px-4 py-2.5 text-sm font-semibold text-[color:var(--desk-link)] hover:bg-[var(--desk-hover)] disabled:opacity-50">Add subject</button>
            </form>
            <p className="mt-4 text-xs leading-5 text-[color:var(--desk-subtle)]">PW completion depends on lectures and DPPs. Update a percentage manually or use Sync from PW with All Classes open in your browser.</p>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--desk-border)] bg-[var(--desk-surface)] p-5 shadow-sm">
              <div className="mb-4"><h2 className="text-lg font-bold">Log a study session</h2><p className="mt-1 text-sm text-[color:var(--desk-muted)]">Keep a simple record of focused time.</p></div>
              <form onSubmit={addSession} className="space-y-3">
                <label className="block text-xs font-medium text-[color:var(--desk-muted)]">Study date<input name="date" type="date" max={today} value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required className="mt-1 block w-full rounded-lg border border-[var(--desk-border)] px-3 py-2.5 text-sm" /></label>
                <label className="block text-xs font-medium text-[color:var(--desk-muted)]">Subject<select name="subject" required className="mt-1 block w-full rounded-lg border border-[var(--desk-border)] bg-[var(--desk-surface)] px-3 py-2.5 text-sm text-[color:var(--desk-foreground)]">{state.subjects.map((subject) => <option key={subject.name}>{subject.name}</option>)}</select></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium text-[color:var(--desk-muted)]">Minutes<input name="minutes" type="number" min="1" max="1440" required placeholder="45" className="mt-1 block w-full rounded-lg border border-[var(--desk-border)] px-3 py-2.5 text-sm" /></label>
                  <label className="text-xs font-medium text-[color:var(--desk-muted)]">Topic<input name="topic" placeholder="e.g. Deadlock" className="mt-1 block w-full rounded-lg border border-[var(--desk-border)] px-3 py-2.5 text-sm" /></label>
                </div>
                <button disabled={saving || !state.subjects.length} className="w-full rounded-lg bg-[var(--desk-button-secondary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--desk-button-secondary-hover)] disabled:opacity-50">Log session</button>
              </form>
              <div className="mt-5 border-t border-[var(--desk-border-soft)] pt-4"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--desk-subtle)]">Recent sessions</h3>{state.sessions.length ? <div className="space-y-2">{state.sessions.slice(0, 4).map((session) => <div key={session.id} className="flex justify-between gap-3 text-sm"><span className="truncate font-medium">{session.subject}{session.topic ? ` · ${session.topic}` : ""}</span><span className="shrink-0 text-[color:var(--desk-muted)]">{session.minutes}m</span></div>)}</div> : <p className="text-sm text-[color:var(--desk-subtle)]">No sessions logged yet.</p>}</div>
            </section>

            <section className="rounded-2xl border border-[var(--desk-border)] bg-[var(--desk-surface)] p-5 shadow-sm">
              <div className="mb-4"><h2 className="text-lg font-bold">Practice test scores</h2><p className="mt-1 text-sm text-[color:var(--desk-muted)]">Record marks and see your recent attempts.</p></div>
              <form onSubmit={addTest} className="space-y-3">
                <label className="block text-xs font-medium text-[color:var(--desk-muted)]">Test date<input name="date" type="date" max={today} value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required className="mt-1 block w-full rounded-lg border border-[var(--desk-border)] px-3 py-2.5 text-sm" /></label>
                <label className="block text-xs font-medium text-[color:var(--desk-muted)]">Test subject<select name="subject" required className="mt-1 block w-full rounded-lg border border-[var(--desk-border)] bg-[var(--desk-surface)] px-3 py-2.5 text-sm text-[color:var(--desk-foreground)]"><option>Full syllabus mock</option>{state.subjects.map(subject=><option key={subject.name}>{subject.name}</option>)}</select></label>
                <label className="block text-xs font-medium text-[color:var(--desk-muted)]">Test name<input name="name" required placeholder="Weekly test 01" className="mt-1 block w-full rounded-lg border border-[var(--desk-border)] px-3 py-2.5 text-sm" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium text-[color:var(--desk-muted)]">Score<input name="score" type="number" step="0.01" required className="mt-1 block w-full rounded-lg border border-[var(--desk-border)] px-3 py-2.5 text-sm" /></label>
                  <label className="text-xs font-medium text-[color:var(--desk-muted)]">Out of<input name="outOf" type="number" min="0.01" step="0.01" required className="mt-1 block w-full rounded-lg border border-[var(--desk-border)] px-3 py-2.5 text-sm" /></label>
                </div>
                <button disabled={saving} className="w-full rounded-lg border border-[var(--desk-border-strong)] px-4 py-2.5 text-sm font-semibold text-[color:var(--desk-link)] hover:bg-[var(--desk-hover)] disabled:opacity-50">Save score</button>
              </form>
              <div className="mt-5 space-y-2 border-t border-[var(--desk-border-soft)] pt-4">{state.tests.length ? state.tests.slice(0, 4).map((test) => <div key={test.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0"><span className="block truncate font-medium">{test.name}</span><span className="block text-xs text-[color:var(--desk-muted)]">{test.subject ?? "Unassigned"}</span></span><span className="shrink-0 rounded-full bg-[var(--desk-amber-bg)] px-2.5 py-1 text-xs font-bold text-[color:var(--desk-amber)]">{test.score}/{test.outOf}</span></div>) : <p className="text-sm text-[color:var(--desk-subtle)]">No test scores yet.</p>}</div>
            </section>
          </div>
        </div>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--desk-subtle)]"><span>Private to your signed-in account</span><span>{saving ? "Saving…" : state.updatedAt ? `Last saved ${new Date(state.updatedAt).toLocaleString("en-IN")}` : ""}</span></footer>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: "teal" | "blue" | "amber" | "violet" }) {
  const colors = {
    teal: "bg-[var(--desk-teal-bg)] text-[color:var(--desk-button)]",
    blue: "bg-[var(--desk-blue-bg)] text-[color:var(--desk-blue)]",
    amber: "bg-[var(--desk-amber-bg)] text-[color:var(--desk-amber)]",
    violet: "bg-[var(--desk-violet-bg)] text-[color:var(--desk-violet)]",
  };
  return <article className="rounded-2xl border border-[var(--desk-border)] bg-[var(--desk-surface)] p-5 shadow-sm"><div className={`mb-4 grid h-9 w-9 place-items-center rounded-lg text-sm font-black ${colors[accent]}`}>✦</div><p className="text-sm font-medium text-[color:var(--desk-muted)]">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-2 text-xs text-[color:var(--desk-subtle)]">{detail}</p></article>;
}


