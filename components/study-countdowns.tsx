"use client";

import { useEffect, useState } from "react";
import { remainingTime, studyDeadlines } from "@/lib/countdowns";

export function StudyCountdowns() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <section aria-label="Study countdowns" className="mb-8 grid gap-4 md:grid-cols-2">
    {studyDeadlines.map(deadline => {
      const time = now === null ? null : remainingTime(deadline.target, now);
      return <article key={deadline.target} className="rounded-2xl border border-[var(--desk-border)] bg-[var(--desk-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{deadline.title}</h2><p className="text-sm font-semibold text-[color:var(--desk-link)]">{deadline.date}</p></div>
        <p className="mt-2 text-sm text-[color:var(--desk-muted)]">{deadline.detail}</p>
        <div role="timer" aria-label={`${deadline.title} countdown`} className="mt-4 grid grid-cols-4 gap-2">
          {(["days", "hours", "minutes", "seconds"] as const).map(unit => <div key={unit} className="rounded-xl bg-[var(--desk-teal-bg)] px-2 py-3 text-center"><p className="text-2xl font-bold tabular-nums text-[color:var(--desk-foreground)] sm:text-3xl">{time ? String(time[unit]).padStart(2, "0") : "—"}</p><p className="text-xs text-[color:var(--desk-muted)]">{unit}</p></div>)}
        </div>
        <p className="mt-3 text-xs text-[color:var(--desk-subtle)]">{time?.reached ? "Target date reached." : "Counts down to midnight in India (IST)."}</p>
      </article>;
    })}
  </section>;
}
