"use client";

import { useMemo, useState } from "react";
import type { DPPChapter, DPPResource, DPPSnapshot } from "@/lib/dpp-progress";

const selectClass = "mt-1.5 w-full rounded-lg border border-[var(--desk-border-strong)] bg-[var(--desk-surface)] px-3 py-2 text-sm text-[color:var(--desk-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--desk-accent)]";
const typeLabels: Record<DPPResource["type"], string> = { quiz: "DPP quiz", pdf: "PDF", video: "Solution video" };

function chapterKey(subject: string, chapter: string) {
  return `${subject}\u0000${chapter}`;
}

function quizSummary(chapters: DPPChapter[], resources: DPPResource[]) {
  const groups = new Map<string, { chapter?: DPPChapter; quizzes: DPPResource[] }>();
  for (const chapter of chapters) groups.set(chapterKey(chapter.subject, chapter.name), { chapter, quizzes: [] });
  for (const resource of resources) {
    if (resource.type !== "quiz") continue;
    const key = chapterKey(resource.subject, resource.chapter);
    const group = groups.get(key) ?? { quizzes: [] };
    group.quizzes.push(resource);
    groups.set(key, group);
  }
  let completed = 0;
  let total = 0;
  for (const group of groups.values()) {
    const available = Math.max(group.chapter?.quizTotal ?? 0, group.quizzes.length);
    const done = Math.max(group.chapter?.quizCompleted ?? 0, group.quizzes.filter(resource => resource.status === "completed").length);
    total += available;
    completed += Math.min(done, available);
  }
  return { completed, total, percent: total ? Math.round(completed / total * 100) : 0 };
}

function capturedLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Capture date unavailable" : `${date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })} IST`;
}

export function DPPProgress({ snapshot, subjects: suppliedSubjects = [] }: { snapshot: DPPSnapshot; subjects?: string[] }) {
  const [subject, setSubject] = useState("all");
  const [chapter, setChapter] = useState("all");
  const [type, setType] = useState<DPPResource["type"] | "all">("all");
  const chapters = useMemo(() => [...new Map(snapshot.chapters.map(item => [item.id, item])).values()], [snapshot.chapters]);
  const resources = useMemo(() => [...new Map(snapshot.resources.map(item => [item.id, item])).values()], [snapshot.resources]);
  const subjects = useMemo(() => [...new Set([...suppliedSubjects, ...chapters.map(item => item.subject), ...resources.map(item => item.subject)])], [suppliedSubjects, chapters, resources]);
  const allSummary = quizSummary(chapters, resources);
  const subjectChapters = chapters.filter(item => subject === "all" || item.subject === subject);
  const chapterChoices = [...new Map([
    ...subjectChapters.map(item => [chapterKey(item.subject, item.name), { subject: item.subject, name: item.name }] as const),
    ...resources.filter(item => subject === "all" || item.subject === subject).map(item => [chapterKey(item.subject, item.chapter), { subject: item.subject, name: item.chapter }] as const),
  ]).entries()];
  const selectedChapters = subjectChapters.filter(item => chapter === "all" || chapterKey(item.subject, item.name) === chapter);
  const selectedResources = resources.filter(item => (subject === "all" || item.subject === subject) && (chapter === "all" || chapterKey(item.subject, item.chapter) === chapter));
  const selectedSummary = quizSummary(selectedChapters, selectedResources);
  const visibleResources = selectedResources.filter(item => type === "all" || item.type === type);
  const chapterGroups = [...new Map<string, {subject: string; name: string; chapter: DPPChapter | undefined}>([
    ...selectedChapters.map(item => [chapterKey(item.subject, item.name), { subject: item.subject, name: item.name, chapter: item }] as const),
    ...selectedResources.filter(item => !selectedChapters.some(c => c.subject === item.subject && c.name === item.chapter)).map(item => [chapterKey(item.subject, item.chapter), { subject: item.subject, name: item.chapter, chapter: undefined }] as const),
  ]).entries()];
  const emptySubjects = subjects.filter(name => (subject === "all" || subject === name) && !chapters.some(item => item.subject === name) && !resources.some(item => item.subject === name));

  return <details className="group mb-8 overflow-hidden rounded-2xl border border-[var(--desk-border)] bg-[var(--desk-surface)] shadow-sm">
    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--desk-accent)] sm:px-6">
      <span className="flex items-center gap-3"><span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--desk-teal-bg)] font-bold text-[color:var(--desk-accent)]">D</span><span><span className="block font-bold">DPP practice</span><span className="block text-xs text-[color:var(--desk-muted)]">Browse subjects, chapters and resources</span></span></span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--desk-muted)]"><span><strong className="text-[color:var(--desk-link)]">{allSummary.completed}/{allSummary.total}</strong> quizzes completed</span><span>{resources.filter(item => item.type === "pdf").length} PDFs · {resources.filter(item => item.type === "video").length} videos</span><span aria-hidden="true" className="ml-1 text-lg text-[color:var(--desk-link)] transition-transform group-open:rotate-180">⌄</span></span>
    </summary>

    <div className="border-t border-[var(--desk-border-soft)] p-5 sm:p-6">
      <p className="text-sm leading-6 text-[color:var(--desk-muted)]">PW adds new DPPs when units finish. This list covers released resources in the saved capture; totals can grow with future imports.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-[color:var(--desk-muted)]">Subject<select className={selectClass} value={subject} onChange={event => { setSubject(event.target.value); setChapter("all"); }} aria-label="Filter DPPs by subject"><option value="all">All subjects ({subjects.length})</option>{subjects.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        <label className="text-xs font-semibold text-[color:var(--desk-muted)]">Unit / chapter<select className={selectClass} value={chapter} onChange={event => setChapter(event.target.value)} aria-label="Filter DPPs by chapter"><option value="all">All chapters</option>{chapterChoices.map(([key, item]) => <option key={key} value={key}>{subject === "all" ? `${item.subject} · ${item.name}` : item.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-[color:var(--desk-muted)]">Resource type<select className={selectClass} value={type} onChange={event => setType(event.target.value as DPPResource["type"] | "all")} aria-label="Filter DPPs by resource type"><option value="all">All resources</option><option value="quiz">DPP quizzes</option><option value="pdf">PDFs & discussion notes</option><option value="video">Solution videos</option></select></label>
      </div>

      <div className="mt-4 rounded-xl bg-[var(--desk-teal-bg)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold">Selected chapters: <span className="tabular-nums text-[color:var(--desk-link)]">{selectedSummary.completed} / {selectedSummary.total}</span> quizzes completed</p><p className="text-xs text-[color:var(--desk-muted)]">{selectedResources.filter(item => item.type === "pdf").length} PDFs · {selectedResources.filter(item => item.type === "video").length} videos</p></div>
        <div role="progressbar" aria-label="Selected DPP quiz completion" aria-valuenow={selectedSummary.percent} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${selectedSummary.completed} of ${selectedSummary.total} released DPP quizzes completed`} className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--desk-track)]"><div className="h-full rounded-full bg-[var(--desk-progress)] transition-all" style={{ width: `${selectedSummary.percent}%` }} /></div>
        <p className="mt-2 text-xs text-[color:var(--desk-muted)]">{selectedSummary.percent}% of released quizzes · PDFs and videos are counted separately.</p>
      </div>

      <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-[var(--desk-border-soft)] p-3" role="region" aria-label="DPP chapter and resource list" tabIndex={0}>
        {chapterGroups.map(([key, group]) => {
          const chapterResources = visibleResources.filter(item => item.subject === group.subject && item.chapter === group.name);
          if (type !== "all" && !chapterResources.length) return null;
          const chapterSummary = quizSummary(group.chapter ? [group.chapter] : [], selectedResources.filter(item => item.subject === group.subject && item.chapter === group.name));
          const hasQuizCounter = group.chapter?.quizTotal !== null && group.chapter?.quizTotal !== undefined;
          return <article key={key} className="rounded-lg border border-[var(--desk-border-soft)] bg-[var(--desk-surface)]">
            <header className="rounded-t-lg bg-[var(--desk-soft)] px-3 py-3"><p className="text-xs text-[color:var(--desk-muted)]">{group.subject}</p><div className="mt-1 flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold">{group.name}</h3><span className="text-xs font-semibold text-[color:var(--desk-link)]">{hasQuizCounter || chapterSummary.total ? `${chapterSummary.completed}/${chapterSummary.total} quizzes completed` : "No quiz counter shown"}</span></div>{group.chapter?.lectureTotal !== null && group.chapter?.lectureTotal !== undefined && <p className="mt-1 text-xs text-[color:var(--desk-muted)]">Lectures: {group.chapter.lectureCompleted ?? "—"}/{group.chapter.lectureTotal}</p>}</header>
            {chapterResources.length ? <ul className="divide-y divide-[var(--desk-border-soft)]">{chapterResources.map(resource => <ResourceRow key={resource.id} resource={resource} />)}</ul> : <p className="px-3 py-4 text-xs text-[color:var(--desk-muted)]">No DPP resources were listed for this chapter in the capture.</p>}
          </article>;
        })}
        {type === "all" && chapter === "all" && emptySubjects.map(name => <article key={name} className="rounded-lg border border-dashed border-[var(--desk-border-strong)] px-3 py-4"><h3 className="text-sm font-semibold">{name}</h3><p className="mt-1 text-xs text-[color:var(--desk-muted)]">No chapters or DPP resources were listed in this subject folder at capture time.</p></article>)}
        {!visibleResources.length && (type !== "all" || !chapterGroups.length && !emptySubjects.length) && <p className="p-3 text-sm text-[color:var(--desk-muted)]">No resources match these filters.</p>}
      </div>
      <p className="mt-3 text-xs leading-5 text-[color:var(--desk-subtle)]">Last DPP capture: {capturedLabel(snapshot.capturedAt)}. Quiz completion comes from PW counters or explicit status. Where PW does not provide a completion status, it remains unknown.</p>
    </div>
  </details>;
}

function ResourceRow({ resource }: { resource: DPPResource }) {
  const statusLabel = resource.status === "completed" ? "Completed" : resource.status === "pending" ? "Not completed" : "Status not supplied";
  const statusClass = resource.status === "completed" ? "bg-[var(--desk-teal-bg)] text-[color:var(--desk-link)]" : "bg-[var(--desk-soft)] text-[color:var(--desk-muted)]";
  return <li className="px-3 py-3">
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-[var(--desk-blue-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--desk-blue)]">{typeLabels[resource.type]}</span><span className={`rounded-full px-2 py-0.5 text-[10px] ${statusClass}`}>{statusLabel}</span></div>
    <h4 className="mt-1.5 break-words text-sm font-medium">{resource.title}</h4>
    {resource.releaseLabel && <p className="mt-1 text-xs text-[color:var(--desk-muted)]">{resource.releaseLabel}</p>}
    {resource.details && <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-[color:var(--desk-muted)]">{resource.details}</p>}
  </li>;
}
