// Reads rendered progress cards only. No cookies, storage, network calls,
// credentials, video content, test questions, or answers are accessed.
(() => {
  // PW uses the numeric batch route for its overview and this observed slug
  // for the same course's subject pages. Unknown slugs are never assigned a batch.
  const batchRoute = location.pathname.match(/\/batches\/([^/]+)(?:\/|$)/)?.[1];
  const batchId = /^[a-f0-9]{24}$/.test(batchRoute || "") ? batchRoute
    : batchRoute === "parakram-2-0-gate-2027-batch-e--hinglish----computer-science-478697"
      ? "6a6db276dcb67d138689a93d" : null;
  if (!batchId || location.hostname !== "www.pw.live") return null;
  const capturedAt = new Date().toISOString();
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
    const dateMatch = text.match(/\b(Started on|Starts on)\s+([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    let dateFields = {};
    if (dateMatch) {
      const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
      const month = months.indexOf(dateMatch[2].slice(0,3).toLowerCase());
      const hour = Number(dateMatch[5]) % 12 + (dateMatch[7].toUpperCase() === "PM" ? 12 : 0);
      if (month >= 0) dateFields = { startsAt: new Date(Date.UTC(Number(dateMatch[4]), month, Number(dateMatch[3]), hour, Number(dateMatch[6])) - 330 * 60000).toISOString(), startDateLabel: dateMatch[0] };
    }
    tests.push({...dateFields, name, subject:name.includes(":") ? name.split(":")[0].trim() : /^Mock Test\b/i.test(name) ? "Full syllabus mock" : "Unassigned", attempts, status});
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
  const canonical = value => value.trim().replace(/\s+/g," ").toLowerCase();
  const keyPart = value => encodeURIComponent(canonical(value));
  const clean = value => (value || "").trim().replace(/\s+/g," ");
  const queryLabel = name => {
    const raw = (location.search || "").match(new RegExp(`(?:^|[?&])${name}=([^&]*)`))?.[1];
    if (!raw) return "";
    try { return clean(decodeURIComponent(raw.replace(/\+/g," ")).replace(/_/g," ")); }
    catch { return ""; }
  };
  const subject = queryLabel("subject");
  const chapter = queryLabel("topic");
  const chapters = [];
  const resources = [];
  if (subject) {
    const unitCards = Array.from(document.querySelectorAll('[id^="unit-card-"]'))
      .filter(card => card.getClientRects().length)
      .map(card => ({card, name:clean(card.querySelector("h4")?.textContent)}))
      .filter(item => item.name);
    for (const {card,name} of unitCards) {
      const cardText = card.innerText || card.textContent || "";
      const lecture = cardText.match(/Lecture\s*:\s*(\d+)\s*\/\s*(\d+)/i);
      const quiz = cardText.match(/DPP\s*:\s*(\d+)\s*\/\s*(\d+)/i);
      // A missing counter is unknown, not evidence of zero DPPs.
      const duplicate = unitCards.filter(item => canonical(item.name) === canonical(name)).length > 1;
      const badge = cardText.match(/\bCH\s*-?\s*(\d+)/i)?.[1];
      const discriminator = duplicate && badge ? `CH-${badge.padStart(2,"0")}` : "";
      if (duplicate && !discriminator) continue;
      chapters.push({
        id:`dpp-chapter:${keyPart(subject)}:${keyPart(name)}${discriminator ? `:${keyPart(discriminator)}` : ""}`,
        subject, name,
        lectureCompleted:lecture ? Number(lecture[1]) : null,
        lectureTotal:lecture ? Number(lecture[2]) : null,
        quizCompleted:quiz ? Number(quiz[1]) : null,
        quizTotal:quiz ? Number(quiz[2]) : null,
      });
    }
  }
  // Resource context comes from PW's displayed URL labels, never from title
  // guesses. Without both labels, skip resources instead of misassigning them.
  if (subject && chapter) {
    const iconSelector = 'img[alt="objective-dpp-v2-image"],img[alt="dpp-pdf-image"],img[alt="dpp-video-image"]';
    const types = {"objective-dpp-v2-image":"quiz","dpp-pdf-image":"pdf","dpp-video-image":"video"};
    const seen = new Set();
    for (const icon of document.querySelectorAll(iconSelector)) {
      let card = icon.parentElement;
      // Locate the smallest rendered ancestor with this resource's title.
      while (card && card !== document.body && !card.querySelector('[class*="_titleText_"]')) card = card.parentElement;
      if (!card || card === document.body || !card.getClientRects().length || card.querySelectorAll(iconSelector).length !== 1) continue;
      const title = clean(card.querySelector('[class*="_titleText_"]')?.textContent);
      const type = types[icon.getAttribute("alt")];
      if (!title || !type) continue;
      const id = `dpp-resource:${[type,subject,chapter,title].map(keyPart).join(":")}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const cardText = card.innerText || "";
      const lines = cardText.split(/\n/).map(clean).filter(Boolean);
      const releaseLabel = lines.find(line => /^\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?$/.test(line)) || "";
      const details = lines.find(line => /\b\d+\s+Qs\b|\b\d+\s+Marks\b/.test(line)) || "";
      const status = type !== "quiz" ? "unknown"
        : /\bView\s+Analysis\b/i.test(cardText) ? "completed"
        : /\bAttempt(?:\s+DPP)?\b/i.test(cardText) ? "pending" : "unknown";
      resources.push({id,subject,chapter,type,title,releaseLabel,details,status,capturedAt});
    }
  }
  return {batchId,capturedAt,subjects,tests,
    ...(chapters.length || resources.length ? {dpp:{batchId,capturedAt,chapters,resources}} : {})};
})();
