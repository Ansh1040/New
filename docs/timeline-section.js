// The published visualization retains its own sandboxed iframe and CSP unchanged.
(() => {
  const section = document.createElement('details');
  section.className = 'added-dashboard';
  section.id = 'preparation-timeline';
  const summary = document.createElement('summary');
  summary.className = 'added-dashboard-toggle';
  const label = document.createElement('div');
  const heading = document.createElement('h2');
  heading.textContent = 'Your preparation timeline';
  const subtitle = document.createElement('p');
  subtitle.className = 'added-dashboard-toggle-note';
  subtitle.textContent = 'Lecture-based plan · All 19 subjects · Sunday tests and catch-up';
  label.append(heading, subtitle);
  const chevron = document.createElement('span');
  chevron.className = 'added-dashboard-chevron';
  chevron.textContent = '⌄';
  chevron.setAttribute('aria-hidden', 'true');
  summary.append(label, chevron);
  const content = document.createElement('div');
  content.className = 'added-dashboard-content';
  const link = document.createElement('a');
  link.href = './gate-timeline-tree.html';
  link.textContent = 'Open full timeline ↗';
  link.target = '_blank';
  link.rel = 'noopener';
  link.style.color = 'inherit';
  const note = document.createElement('p');
  note.className = 'added-dashboard-note';
  note.textContent = 'Lectures through 31 December; January reserved for full revision and tests. Compare daily paces and check red deadline alerts.';
  const frame = document.createElement('iframe');
  frame.title = 'GATE CS preparation timeline tree';
  frame.style.cssText = 'display:block;width:100%;height:900px;border:0;margin-top:16px;border-radius:12px';
  let observer;
  frame.addEventListener('load', () => {
    observer?.disconnect();
    const body = frame.contentDocument?.body;
    if (!body) return;
    const resize = () => {
      if (!section.open) return;
      const height = Math.ceil(body.getBoundingClientRect().height);
      if (height > 100) frame.style.height = `${height + 4}px`;
    };
    observer = new ResizeObserver(resize);
    observer.observe(body);
    resize();
  });
  section.addEventListener('toggle', () => {
    if (section.open && !frame.getAttribute('src')) frame.src = './gate-timeline-tree.html';
  });
  content.append(note, link, frame);
  section.append(summary, content);
  const footer = document.querySelector('main > footer');
  if (footer) footer.before(section);
  else document.querySelector('main')?.append(section);
})();
