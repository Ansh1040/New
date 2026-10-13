export const studyDeadlines = [
  { title: "Course completion", date: "1 January 2027", target: "2027-01-01T00:00:00+05:30", detail: "Finish the course with daily revision and DPP practice." },
  { title: "Final paper", date: "1 February 2027", target: "2027-02-01T00:00:00+05:30", detail: "Your target paper date — keep revising and practising mocks." },
] as const;

export function remainingTime(target: string, now: number) {
  const total = Math.max(0, Math.ceil((Date.parse(target) - now) / 1000));
  return { days: Math.floor(total / 86400), hours: Math.floor(total % 86400 / 3600), minutes: Math.floor(total % 3600 / 60), seconds: total % 60, reached: total === 0 };
}
