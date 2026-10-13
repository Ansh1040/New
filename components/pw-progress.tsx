"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudyState } from "@/lib/study-state";
import { testSummary, type PWSnapshot } from "@/lib/test-progress";

const button = "rounded-lg border border-[#c7d9d2] px-4 py-2 text-sm font-semibold text-[#35695d] hover:bg-[#f4faf7] disabled:opacity-50";

function bridge(action: "ping" | "sync", batchId?: string): Promise<{ready?:boolean; snapshots?:PWSnapshot[]}> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = window.setTimeout(() => {window.removeEventListener("message", listen); reject(new Error(action === "ping" ? "Extension not detected" : "PW sync did not respond. Install the extension in this browser and reload the tracker."));}, action === "ping" ? 2000 : 20000);
    function listen(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin || event.data?.source !== "pw-bridge" || event.data?.id !== id) return;
      clearTimeout(timer); window.removeEventListener("message", listen);
      if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data);
    }
    window.addEventListener("message", listen);
    window.postMessage({source:"gate-companion", action, id, batchId}, window.location.origin);
  });
}

export function PWProgress({state, onState, busy}: {state:StudyState; onState:(state:StudyState)=>void; busy:boolean}) {
  const [connected, setConnected] = useState(false);
  const [auto, setAuto] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All subjects");
  const [status, setStatus] = useState("all");
  const [importText, setImportText] = useState("");
  const lock = useRef(false);
  const tests = state.pw?.tests ?? [];
  const summary = testSummary(tests);
  const subjects = [...new Set(tests.map(t => t.subject))].sort();

  useEffect(() => { void bridge("ping").then(() => setConnected(true)).catch(() => {}); }, []);

  const importSnapshots = useCallback(async (snapshots: unknown) => {
    const response = await fetch("/api/pw-sync", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(snapshots)});
    const body = await response.json() as StudyState & { error?: string };
    if (!response.ok) throw new Error(body.error ?? "PW import failed.");
    onState(body);
    setMessage("PW snapshot updated. Only cards loaded in your PW tabs were imported.");
  }, [onState]);

  const sync = useCallback(async () => {
    if (lock.current || busy) return;
    lock.current = true; setSyncing(true); setError(""); setMessage("");
    try { const result = await bridge("sync", state.pw?.batchId); await importSnapshots(result.snapshots); setConnected(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "PW sync failed."); setAuto(false); }
    finally {lock.current = false; setSyncing(false);}
  }, [busy, state.pw?.batchId, importSnapshots]);

  useEffect(() => {
    if (!auto || !connected) return;
    const timer = window.setInterval(() => {void sync();}, 60000);
    return () => clearInterval(timer);
  }, [auto, connected, sync]);

  async function manualImport() {
    if (lock.current || busy) return;
    lock.current = true; setSyncing(true); setError("");
    try {await importSnapshots(JSON.parse(importText)); setImportText("");}
    catch(cause) {setError(cause instanceof Error ? cause.message : "Invalid snapshot.");}
    finally {lock.current=false;setSyncing(false);}
  }

  const visible = tests.filter(t => (filter === "All subjects" || t.subject === filter) && (status === "all" || t.status === status));

  return <section className="mb-8 rounded-2xl border border-[#dce6e2] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="pw-tests-heading">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-[#12816a]">Practice roadmap</p><h2 id="pw-tests-heading" className="mt-1 text-2xl font-bold">Test completion</h2><p className="mt-2 text-sm text-[#667570]">Your imported PW tests, grouped by subject.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => void sync()} disabled={syncing || busy} className="rounded-lg bg-[#087b64] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{syncing ? "Syncing…" : "Sync from PW"}</button><button className={button} disabled={syncing || busy} onClick={async () => {setError("");try {const r=await fetch("/api/state",{cache:"no-store"});const body=await r.json() as StudyState & { error?: string };if(!r.ok)throw new Error(body.error);onState(body);setMessage("Saved tracker data refreshed. PW was not read.");}catch{setError("Could not refresh saved data.");}}}>Refresh saved data</button></div>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-xl bg-[#f0f7f4] p-5"><p className="text-sm text-[#4b776b]">Completed / available imported tests</p><p className="mt-1 text-4xl font-bold tabular-nums">{summary.completed}<span className="text-xl font-medium text-[#72827d]"> / {summary.available}</span></p><ProgressBar value={summary.percent} label="Total test completion"/><p className="mt-2 text-sm text-[#4b776b]">{summary.percent}% completed · {summary.upcoming} upcoming · {summary.total} imported</p></div>
      <div className="text-sm leading-6 text-[#667570]"><p className="font-semibold text-[#172422]">{connected ? "PW browser extension connected" : "Set up PW browser sync"}</p><p>Open PW and this tracker in the same Chrome, Brave, or Edge profile. Select <strong>All Tests</strong> in PW and load the full list. Keep All Classes open in another tab to update subject percentages too.</p><label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={auto} disabled={!connected} onChange={e=>{setAuto(e.target.checked);if(e.target.checked)void sync();}} className="mt-1.5"/>Auto-sync every minute while this tracker is open</label><p className="mt-1 text-xs">Reads loaded PW cards. Refresh PW after completing a test. Upcoming tests are excluded from the completion percentage.</p></div>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <details className="mt-4 rounded-lg border border-[#e6ece9] p-3 text-sm"><summary className="cursor-pointer font-semibold text-[#35695d]">Sync setup and import options</summary><ol className="mt-3 list-decimal space-y-1 pl-5 leading-6 text-[#667570]"><li><a href="/pw-sync-extension.zip" download className="font-semibold text-[#087b64] underline">Download the PW sync extension</a> and extract the ZIP.</li><li>Open your browser’s Extensions page, enable Developer mode, choose Load unpacked, and select the extracted folder.</li><li>Reload this tracker. Open your signed-in PW batch’s All Tests and All Classes pages, then click Sync from PW.</li></ol><p className="mt-3 text-xs text-[#72827d]">The extension reads only progress and test cards. It does not collect passwords, cookies, videos or test answers. It cannot run in the Codex in-app browser. Here, ask the assistant to update from your open PW page.</p><details className="mt-3"><summary className="cursor-pointer">Import an assistant-captured snapshot</summary><label className="mt-2 block text-xs">PW snapshot JSON<textarea value={importText} onChange={e=>setImportText(e.target.value)} className="mt-1 block h-24 w-full rounded-lg border p-2 font-mono text-xs" maxLength={500000}/></label><button className={`${button} mt-2`} onClick={()=>void manualImport()} disabled={!importText.trim() || syncing || busy}>Import snapshot</button></details></details>
    <p className="mt-3 text-xs text-[#72827d]">{state.pw ? `Last PW capture: ${new Date(state.pw.capturedAt).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST. Counts cover imported cards, not a guaranteed complete course inventory.` : "No PW tests imported yet. Sync to populate the bars and test list."}</p>
    {!!subjects.length && <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subjects.map(subject=>{const s=testSummary(tests.filter(t=>t.subject===subject));return <div key={subject} className="rounded-xl border border-[#e6ece9] p-4"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold">{subject}</h3><span className="shrink-0 text-sm font-bold text-[#087b64]">{s.completed}/{s.available}</span></div><ProgressBar value={s.percent} label={`${subject} test completion`}/><p className="mt-1 text-xs text-[#72827d]">{s.completed} completed{s.upcoming ? ` · ${s.upcoming} upcoming` : ""}</p></div>;})}</div>}
    {!!tests.length && <details className="mt-6" open><summary className="cursor-pointer text-sm font-bold">Test list ({tests.length})</summary><div className="my-3 flex flex-wrap gap-3"><label className="text-xs text-[#667570]">Subject<select aria-label="Filter tests by subject" className="ml-2 rounded-lg border p-2 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}><option>All subjects</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></label><label className="text-xs text-[#667570]">Status<select aria-label="Filter tests by status" className="ml-2 rounded-lg border p-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="completed">Completed</option><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="upcoming">Upcoming</option><option value="unknown">Unknown</option></select></label></div><div className="max-h-80 overflow-auto rounded-xl border border-[#e6ece9]"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-[#f2f7f4]"><tr><th className="p-3">Test / subject</th><th className="p-3">Status</th><th className="p-3">Attempts</th></tr></thead><tbody>{visible.map(t=><tr key={t.name} className="border-t border-[#edf1ef]"><td className="p-3"><p className="font-medium">{t.name}</p><p className="mt-1 text-xs text-[#72827d]">{t.subject}</p></td><td className="p-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${t.status==="completed" ? "bg-emerald-100 text-emerald-800" : t.status==="upcoming" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{t.status.replaceAll("-"," ")}</span></td><td className="p-3 tabular-nums">{t.attempts}</td></tr>)}</tbody></table>{!visible.length && <p className="p-5 text-sm text-[#72827d]">No tests match these filters.</p>}</div><p className="mt-2 text-xs text-[#87948f]">Completed means PW shows at least one attempt, unless a card says Resume/In progress. Your manually logged marks remain below.</p></details>}
  </section>;
}

function ProgressBar({value,label}:{value:number;label:string}) {
  return <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#dfeae5]"><div className="h-full rounded-full bg-[#0c9b77] transition-all" style={{width:`${value}%`}}/></div>;
}

