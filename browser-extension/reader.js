// Reads rendered progress cards only. No cookies, storage, network calls,
// credentials, video content, test questions, or answers are accessed.
(() => {
  const batchId = location.pathname.match(/\/batches\/([a-f0-9]{24})(?:\/|$)/)?.[1];
  if (!batchId || location.hostname !== "www.pw.live") return null;
  const tests = [];
  for (const card of document.querySelectorAll('[class*="cardContainer-"]')) {
    const name = card.querySelector('[class*="cardHeading-"]')?.textContent?.trim();
    const text = card.innerText || "";
    const attemptMatch = text.match(/Attempts\s*:\s*(\d+)/i);
    if (!name || !attemptMatch || !card.getClientRects().length) continue;
    const attempts = Number(attemptMatch[1]);
    const status = /\bUpcoming\b|\bStarts on\b/i.test(text) ? "upcoming"
      : /\bResume\b|\bIn progress\b/i.test(text) ? "in-progress"
      : attempts > 0 ? "completed" : "not-started";
    tests.push({name, subject:name.includes(":") ? name.split(":")[0].trim() : /^Mock Test\b/i.test(name) ? "Full syllabus mock" : "Unassigned", attempts, status});
  }
  const subjects = [];
  // Avoid matching subject names inside test titles or lecture pages.
  const text = document.body.innerText;
  if (/All Classes/.test(text) && /Completion % depends on lecture and DPP progress/.test(text)) {
    for (const card of document.querySelectorAll('[id^="subject-card-"]')) {
      const name = card.querySelector('[class*="subjectText-"]')?.textContent?.trim();
      if (!name || !card.getClientRects().length) continue;
      const match = card.innerText.match(/(?:^|\s)(\d{1,3})\s*%/);
      subjects.push({name, progress:match && Number(match[1]) <= 100 ? Number(match[1]) : null});
    }
  }
  return {batchId, capturedAt:new Date().toISOString(), subjects, tests};
})();
