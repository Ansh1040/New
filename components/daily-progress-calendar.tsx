"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Flame, Target } from "lucide-react";
import type { StudySession, TestResult } from "@/lib/study-state";

type DayActivity = {
  sessions: StudySession[];
  tests: TestResult[];
  minutes: number;
};

const emptyActivity: DayActivity = { sessions: [], tests: [], minutes: 0 };
const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function startOfCalendar(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  return addDays(first, -mondayOffset);
}

function intensityClass(activity: DayActivity) {
  if (!activity.minutes && !activity.tests.length) return "calendar-level-0";
  if (activity.minutes <= 30) return "calendar-level-1";
  if (activity.minutes <= 60) return "calendar-level-2";
  if (activity.minutes <= 120) return "calendar-level-3";
  return "calendar-level-4";
}

export function DailyProgressCalendar({
  sessions,
  tests,
  selectedDate,
  onSelectDate,
}: {
  sessions: StudySession[];
  tests: TestResult[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const today = new Date();
  const todayKey = dateKey(today);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseDateKey(selectedDate);
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });

  const activityByDate = useMemo(() => {
    const result = new Map<string, DayActivity>();
    for (const session of sessions) {
      const current = result.get(session.date) ?? { sessions: [], tests: [], minutes: 0 };
      current.sessions.push(session);
      current.minutes += session.minutes;
      result.set(session.date, current);
    }
    for (const test of tests) {
      const current = result.get(test.date) ?? { sessions: [], tests: [], minutes: 0 };
      current.tests.push(test);
      result.set(test.date, current);
    }
    return result;
  }, [sessions, tests]);

  const days = useMemo(() => {
    const first = startOfCalendar(visibleMonth);
    return Array.from({ length: 42 }, (_, index) => addDays(first, index));
  }, [visibleMonth]);

  const monthPrefix = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthActivities = [...activityByDate.entries()].filter(([key, activity]) =>
    key.startsWith(monthPrefix) && (activity.minutes > 0 || activity.tests.length > 0),
  );
  const monthMinutes = monthActivities.reduce((sum, [, activity]) => sum + activity.minutes, 0);

  let currentStreak = 0;
  let cursor = activityByDate.has(todayKey) ? today : addDays(today, -1);
  while (true) {
    const activity = activityByDate.get(dateKey(cursor));
    if (!activity || (!activity.minutes && !activity.tests.length)) break;
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const selectedActivity = activityByDate.get(selectedDate) ?? emptyActivity;
  const selected = parseDateKey(selectedDate);
  const canMoveForward =
    visibleMonth.getFullYear() < today.getFullYear() ||
    (visibleMonth.getFullYear() === today.getFullYear() && visibleMonth.getMonth() < today.getMonth());

  function moveMonth(amount: number) {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  }

  function chooseDay(day: Date) {
    const key = dateKey(day);
    if (key > todayKey) return;
    onSelectDate(key);
    if (day.getMonth() !== visibleMonth.getMonth()) {
      setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  }

  function showToday() {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(todayKey);
  }

  return (
    <section aria-labelledby="daily-progress-title" className="mb-8 overflow-hidden rounded-2xl border border-[var(--desk-border)] bg-[var(--desk-surface)] shadow-sm">
      <div className="grid xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--desk-accent)]">Daily consistency</p>
              <h2 id="daily-progress-title" className="text-xl font-bold">Progress calendar</h2>
              <p className="mt-1 text-sm text-[color:var(--desk-muted)]">Every focused session and test adds to your study trail.</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-[var(--desk-border)] bg-[var(--desk-page)] p-1">
              <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[var(--desk-surface)]"><ChevronLeft size={17}/></button>
              <button type="button" onClick={showToday} className="min-w-24 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-[var(--desk-surface)]">Today</button>
              <button type="button" onClick={() => moveMonth(1)} disabled={!canMoveForward} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[var(--desk-surface)] disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight size={17}/></button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <CalendarMetric icon={<Clock3 size={15}/>} label="Study time" value={`${Math.floor(monthMinutes / 60)}h ${monthMinutes % 60}m`} />
            <CalendarMetric icon={<Target size={15}/>} label="Active days" value={String(monthActivities.length)} />
            <CalendarMetric icon={<Flame size={15}/>} label="Current streak" value={`${currentStreak} ${currentStreak === 1 ? "day" : "days"}`} />
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold">{visibleMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h3>
            <div className="hidden items-center gap-1 text-[10px] text-[color:var(--desk-subtle)] sm:flex"><span>Less</span>{[0,1,2,3,4].map((level) => <span key={level} className={`h-3 w-3 rounded-sm calendar-level-${level}`}/>)}<span>More</span></div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {weekdayLabels.map((day) => <div key={day} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-[color:var(--desk-subtle)] sm:text-xs">{day}</div>)}
            {days.map((day) => {
              const key = dateKey(day);
              const activity = activityByDate.get(key) ?? emptyActivity;
              const outsideMonth = day.getMonth() !== visibleMonth.getMonth();
              const future = key > todayKey;
              const isSelected = key === selectedDate;
              const label = `${day.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}: ${activity.minutes} study minutes, ${activity.tests.length} tests`;
              return (
                <button
                  type="button"
                  key={key}
                  disabled={future}
                  onClick={() => chooseDay(day)}
                  aria-label={label}
                  aria-pressed={isSelected}
                  className={`calendar-day ${intensityClass(activity)} ${outsideMonth ? "calendar-day-outside" : ""} ${future ? "calendar-day-future" : ""} ${isSelected ? "calendar-day-selected" : ""}`}
                >
                  <span className="text-xs font-bold tabular-nums sm:text-sm">{day.getDate()}</span>
                  <span className="mt-auto hidden text-[10px] font-semibold sm:block">{activity.minutes ? `${activity.minutes}m` : activity.tests.length ? `${activity.tests.length} test` : ""}</span>
                  {(activity.minutes > 0 || activity.tests.length > 0) && <span className="mt-auto h-1 w-1 rounded-full bg-current sm:hidden"/>}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="border-t border-[var(--desk-border)] bg-[var(--desk-hover)] p-5 sm:p-6 xl:border-l xl:border-t-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--desk-accent)]">Selected day</p>
          <h3 className="mt-1 text-lg font-bold">{selected.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</h3>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--desk-border-soft)] bg-[var(--desk-surface)] p-3"><p className="text-xs text-[color:var(--desk-muted)]">Focused time</p><p className="mt-1 text-lg font-bold">{Math.floor(selectedActivity.minutes / 60)}h {selectedActivity.minutes % 60}m</p></div>
            <div className="rounded-xl border border-[var(--desk-border-soft)] bg-[var(--desk-surface)] p-3"><p className="text-xs text-[color:var(--desk-muted)]">Activity</p><p className="mt-1 text-lg font-bold">{selectedActivity.sessions.length + selectedActivity.tests.length}</p></div>
          </div>

          <div className="mt-5 space-y-4">
            {selectedActivity.sessions.length > 0 && <div><h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[color:var(--desk-subtle)]">Sessions</h4><div className="space-y-2">{selectedActivity.sessions.map((session) => <div key={session.id} className="rounded-lg border border-[var(--desk-border-soft)] bg-[var(--desk-surface)] px-3 py-2.5 text-sm"><div className="flex justify-between gap-3"><span className="font-semibold">{session.subject}</span><span className="shrink-0 font-bold text-[color:var(--desk-accent)]">{session.minutes}m</span></div>{session.topic && <p className="mt-1 text-xs text-[color:var(--desk-muted)]">{session.topic}</p>}</div>)}</div></div>}
            {selectedActivity.tests.length > 0 && <div><h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[color:var(--desk-subtle)]">Tests</h4><div className="space-y-2">{selectedActivity.tests.map((test) => <div key={test.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--desk-border-soft)] bg-[var(--desk-surface)] px-3 py-2.5 text-sm"><span className="min-w-0 truncate font-semibold">{test.name}</span><span className="shrink-0 rounded-full bg-[var(--desk-amber-bg)] px-2 py-1 text-xs font-bold text-[color:var(--desk-amber)]">{test.score}/{test.outOf}</span></div>)}</div></div>}
            {!selectedActivity.sessions.length && !selectedActivity.tests.length && <div className="rounded-xl border border-dashed border-[var(--desk-border-strong)] px-4 py-8 text-center"><p className="text-sm font-semibold">No activity recorded</p><p className="mt-1 text-xs leading-5 text-[color:var(--desk-muted)]">Use this date in the forms below to add a study session or test.</p></div>}
          </div>
        </aside>
      </div>
    </section>
  );
}

function CalendarMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--desk-border-soft)] bg-[var(--desk-page)] p-3"><div className="mb-1 flex items-center gap-1.5 text-[color:var(--desk-muted)]">{icon}<span className="text-[10px] font-semibold uppercase tracking-wide sm:text-xs">{label}</span></div><p className="text-sm font-bold sm:text-base">{value}</p></div>;
}
