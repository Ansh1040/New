(() => {
  'use strict';
  const scriptURL = new URL(document.currentScript.src);
  const revision = scriptURL.searchParams.get('rev') || '1';
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = new URL('gate-statistics.css?rev=' + revision, scriptURL).href;
  document.head.append(style);
  const box = document.createElement('details'); box.id = 'gate-question-statistics';
  box.innerHTML = `<summary class="gs-heading"><div><span class="gs-eyebrow">04 · Previous-paper explorer</span><h2>GATE CS question statistics</h2><p class="gs-subtitle">2008–2026 · Subjects, chapters and yearly trends</p></div><span class="gs-chevron" aria-hidden="true">⌄</span></summary><div class="gs-content"><p class="gs-loading" role="status">Open this section to load the question statistics.</p></div>`;
  const footer = document.querySelector('main > footer');
  if (footer) footer.before(box); else document.querySelector('main')?.append(box);
  // The existing deferred cloud panel is added after the footer; remain the final box.
  const placeLast = () => document.querySelector('main')?.append(box);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', placeLast, {once:true}); else placeLast();
  let loaded = false;
  box.addEventListener('toggle', async () => {
    if (!box.open || loaded) return;
    loaded = true;
    try {
      const response = await fetch(new URL('gate-statistics-data.json?rev=' + revision, scriptURL));
      if (!response.ok) throw new Error('The statistics file could not be loaded.');
      const data = await response.json();
      initialise(data);
      if (location.hash === '#gate-question-statistics') box.scrollIntoView({block:'start'});
    } catch (error) {
      const content = box.querySelector('.gs-content'); content.replaceChildren();
      const message = document.createElement('p'); message.className = 'gs-loading'; message.textContent = 'Statistics could not load. Please refresh the page and try again.';
      content.append(message); loaded = false;
    }
  });
  if (location.hash === '#gate-question-statistics') box.open = true;
  function initialise(data) {
    const content = box.querySelector('.gs-content');
    content.innerHTML = `<div class="gs-controls">
      <label class="gs-scope-control">Explore<select id="gs-scope"><option value="all">All subjects</option></select></label>
      <label>Measure<select id="gs-metric"><option value="questions">Questions</option><option value="marks">Marks</option></select></label>
      <label>Comparison<select id="gs-normalisation"><option value="total">Annual total</option><option value="paper">Per paper</option></select></label>
      <label>From<select id="gs-from"></select></label><label>Through<select id="gs-through"></select></label></div>
      <div class="gs-toolbar"><div class="gs-switch" role="group" aria-label="Chart type"><button type="button" class="gs-mode" data-mode="line" aria-pressed="true">Yearly line chart</button><button type="button" class="gs-mode" data-mode="bar" aria-pressed="false">Compare totals</button></div><div class="gs-actions"><button type="button" id="gs-all">Compare all</button><button type="button" id="gs-top">Top four</button><button type="button" id="gs-export">Export view CSV</button></div></div>
      <p class="gs-selected-context" id="gs-context"></p><div class="gs-overview" aria-label="Selected-series statistics"><div class="gs-stat"><span>Selected questions</span><strong id="gs-questions"></strong></div><div class="gs-stat"><span>Selected marks</span><strong id="gs-marks"></strong></div><div class="gs-stat"><span>Years represented</span><strong id="gs-years"></strong></div><div class="gs-stat"><span>Sessions represented</span><strong id="gs-sessions"></strong></div></div>
      <p class="gs-selected-context" id="gs-mark-split"></p><div class="gs-chart-header"><div><h3 id="gs-title"></h3><p id="gs-axis-caption"></p></div><span id="gs-series-count" class="gs-selected-context"></span></div><div class="gs-chart-area"><svg class="gs-chart" id="gs-plot" tabindex="0" role="img" aria-label="Yearly questions chart. Use the left and right arrow keys to inspect a year."></svg><div id="gs-tooltip" class="gs-tooltip" hidden></div></div>
      <div class="gs-legend" id="gs-legend" role="group" aria-label="Toggle subjects or chapters"></div><p class="gs-interaction-note">Select a legend item to show or hide its line. Hover a legend item to highlight it. Tap the chart for exact values; use arrow keys when the chart is focused.</p><p class="gs-status" id="gs-status" role="status" aria-live="polite"></p>
      <p class="gs-coverage"><b>Full archive:</b> 1,900 questions · 2,950 marks · 29 CS sessions. Classification is provisional; 377 questions / 568 marks remain in “Chapter review pending”. This is historical frequency, not a prediction of the 2027 paper.</p>
      <details class="gs-details"><summary>Exact values for the current chart</summary><div class="gs-table-wrap" id="gs-table"></div></details><details class="gs-details"><summary>Data coverage and how to read this chart</summary><ul class="gs-notes" id="gs-notes"></ul></details>`;
    const $ = id => content.querySelector('#' + id);
    const elements = { scope: $('gs-scope'), metric: $('gs-metric'), normalisation: $('gs-normalisation'), from: $('gs-from'), through: $('gs-through'), plot: $('gs-plot'), tooltip: $('gs-tooltip'), legend: $('gs-legend') };
    for (const subject of data.subjects) { const option = document.createElement('option'); option.value = subject.code; option.textContent = subject.label + ' — chapters'; elements.scope.append(option); }
    for (const year of data.years) for (const select of [elements.from, elements.through]) { const option = document.createElement('option'); option.value = String(year); option.textContent = String(year); select.append(option); }
    elements.from.value = '2008'; elements.through.value = '2026';
    for (const note of data.notes) { const li = document.createElement('li'); li.textContent = note; $('gs-notes').append(li); }
    const source = document.createElement('li'); source.textContent = 'Source: source-linked CS question inventory. Data snapshot: ' + data.updated + '. Each question has one primary subject and chapter. All original progress and study-tracker data are separate.'; $('gs-notes').append(source);
    const state = { scope: 'all', metric: 'questions', normalisation: 'total', from: 2008, through: 2026, mode: 'line', selected: new Set(), hoverYear: null };
    const ns = 'http://www.w3.org/2000/svg';
    const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
    let chartGeometry = null, queued = null;
    const svg = (tag, attributes = {}) => { const node = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value)); return node; };
    const text = (value, x, y, attributes = {}) => { const node = svg('text', { x, y, ...attributes }); node.textContent = value; return node; };
    const available = () => data.series.filter(s => state.scope === 'all' ? s.kind === 'subject' : s.kind === 'chapter' && s.subject === state.scope);
    const years = () => data.years.filter(y => y >= state.from && y <= state.through);
    const chosen = () => available().filter(s => state.selected.has(s.id));
    const point = (series, year) => series.points.find(p => p.year === year);
    const value = (series, year) => point(series, year)[state.metric] / (state.normalisation === 'paper' ? data.sessionsByYear[year] : 1);
    const unit = () => (state.metric === 'marks' ? 'Marks' : 'Questions') + (state.normalisation === 'paper' ? ' per CS paper' : ' across all CS papers');
    const colour = index => `var(--stat-c${index % 13 + 1})`;
    const dash = index => ['', '8 4', '2 4', '10 4 2 4'][index % 4];
    function topFour() { const sorted = available().slice().sort((a, b) => b.points.filter(p => p.year >= state.from && p.year <= state.through).reduce((n, p) => n + p[state.metric], 0) - a.points.filter(p => p.year >= state.from && p.year <= state.through).reduce((n, p) => n + p[state.metric], 0)); state.selected = new Set(sorted.slice(0, 4).map(s => s.id)); }
    function legend() {
      elements.legend.replaceChildren();
      available().forEach((series, index) => {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.series = series.id; button.setAttribute('aria-pressed', String(state.selected.has(series.id))); button.style.setProperty('--series-color', colour(index));
        const swatch = svg('svg', { viewBox: '0 0 32 16', class: 'gs-swatch', 'aria-hidden': true }); swatch.append(svg('line', { x1: 0, y1: 8, x2: 32, y2: 8, 'stroke-dasharray': dash(index) }), svg('circle', { cx: 16, cy: 8, r: 3 }));
        const label = document.createElement('span'); label.textContent = series.label; button.append(swatch, label);
        button.addEventListener('click', () => { if (state.selected.has(series.id)) { if (state.selected.size === 1) { $('gs-status').textContent = 'Keep at least one series selected, or select another first.'; return; } state.selected.delete(series.id); } else state.selected.add(series.id); $('gs-status').textContent = ''; render(); });
        const highlight = active => elements.plot.querySelectorAll('.gs-series').forEach(node => node.classList.toggle('is-dim', active && state.selected.has(series.id) && node.dataset.series !== series.id));
        button.addEventListener('pointerenter', () => highlight(true)); button.addEventListener('pointerleave', () => highlight(false)); button.addEventListener('focus', () => highlight(true)); button.addEventListener('blur', () => highlight(false)); elements.legend.append(button);
      });
    }
    function table() {
      const selected = chosen(), table = document.createElement('table'), head = document.createElement('thead'), tr = document.createElement('tr');
      for (const label of ['Year', 'CS papers', ...selected.map(s => s.label)]) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; tr.append(th); } head.append(tr); table.append(head);
      const body = document.createElement('tbody');
      for (const year of years()) { const row = document.createElement('tr'); for (const item of [year, data.sessionsByYear[year], ...selected.map(s => fmt.format(value(s, year)))]) { const td = document.createElement('td'); td.textContent = String(item); row.append(td); } body.append(row); } table.append(body); $('gs-table').replaceChildren(table);
    }
    function draw() {
      elements.tooltip.hidden = true; chartGeometry = null; elements.plot.replaceChildren();
      const selected = chosen(), period = years(), all = available(), width = Math.max(280, Math.round(elements.plot.parentElement.getBoundingClientRect().width)), compact = width < (state.mode === 'bar' ? 760 : 560);
      const height = state.mode === 'line' ? compact ? 330 : 400 : Math.max(260, selected.length * (compact ? 58 : 38) + 48);
      elements.plot.setAttribute('viewBox', `0 0 ${width} ${height}`); elements.plot.setAttribute('width', width); elements.plot.setAttribute('height', height);
      const desc = svg('title'); desc.textContent = `${state.mode === 'line' ? 'Yearly trend' : 'Totals comparison'}: ${unit()}, ${state.from} to ${state.through}. ${selected.map(s => s.label).join(', ')}. Exact values are available below.`; elements.plot.append(desc); elements.plot.setAttribute('aria-label',desc.textContent + (state.mode === 'line' ? ' Use left and right arrows to inspect years.' : ''));
      if (state.mode === 'bar') {
        const denominator = state.normalisation === 'paper' ? period.reduce((n, year) => n + data.sessionsByYear[year], 0) : 1;
        const ranked = selected.map(s => ({ series: s, total: period.reduce((n, year) => n + point(s, year)[state.metric], 0) / denominator })).sort((a, b) => b.total - a.total);
        const maximum = Math.max(1, ...ranked.map(x => x.total));
        ranked.forEach((entry, i) => { const group = svg('g', { class: 'gs-series', 'data-series': entry.series.id }), y = 14 + i * (compact ? 58 : 38), left = compact ? 0 : Math.min(330, width * .45), availableWidth = width - left - 65;
          group.append(text(entry.series.label, 0, y + 12, { class: 'gs-value' })); const by = compact ? y + 22 : y + 2;
          group.append(svg('rect', { x: left, y: by, width: availableWidth, height: 15, rx: 3, fill: 'var(--track)' }), svg('rect', { x: left, y: by, width: availableWidth * entry.total / maximum, height: 15, rx: 3, fill: colour(all.findIndex(s => s.id === entry.series.id)) }), text(fmt.format(entry.total), width - 2, by + 12, { 'text-anchor': 'end', class: 'gs-value' })); elements.plot.append(group);
        }); return;
      }
      const left = compact ? 35 : 47, right = 18, top = 20, bottom = 38, plotWidth = width - left - right, plotHeight = height - top - bottom;
      const maximum = Math.max(1, ...selected.flatMap(s => period.map(year => value(s, year))));
      const magnitude = Math.pow(10, Math.floor(Math.log10(maximum / 5))), step = [1, 2, 5, 10].find(x => x * magnitude >= maximum / 5) * magnitude, ceiling = Math.ceil(maximum / step) * step;
      const x = year => left + period.indexOf(year) * plotWidth / Math.max(1, period.length - 1), y = amount => top + plotHeight - amount / ceiling * plotHeight;
      for (let amount = 0; amount <= ceiling + step / 10; amount += step) elements.plot.append(svg('line', { x1: left, x2: width - right, y1: y(amount), y2: y(amount), class: 'gs-grid' }), text(fmt.format(amount), left - 8, y(amount) + 4, { 'text-anchor': 'end' }));
      const every = compact ? 4 : period.length > 14 ? 2 : 1;
      period.forEach((year, i) => { if (i % every === 0 || i === period.length - 1) elements.plot.append(text(year, x(year), height - 10, { 'text-anchor': i === period.length - 1 ? 'end' : i === 0 ? 'start' : 'middle' })); });
      selected.forEach(series => { const index = all.findIndex(s => s.id === series.id), group = svg('g', { class: 'gs-series', 'data-series': series.id }); const path = period.map((year, i) => `${i ? 'L' : 'M'}${x(year)},${y(value(series, year))}`).join(' '); group.append(svg('path', { d: path, class: 'gs-series-path', stroke: colour(index), 'stroke-dasharray': dash(index) }));
        period.forEach(year => { const pointNode = index % 3 === 0 ? svg('circle', { cx: x(year), cy: y(value(series, year)), r: 3.2 }) : index % 3 === 1 ? svg('rect', { x: x(year) - 3, y: y(value(series, year)) - 3, width: 6, height: 6, rx: .5 }) : svg('path', { d: `M${x(year)},${y(value(series, year)) - 4}l4,7h-8z` }); pointNode.setAttribute('fill', colour(index)); pointNode.setAttribute('class', 'gs-dot'); group.append(pointNode); }); elements.plot.append(group);
      });
      const crosshair = svg('line', { x1: left, x2: left, y1: top, y2: height - bottom, class: 'gs-crosshair', visibility: 'hidden' });
      const hit = svg('rect', { x: left, y: top, width: plotWidth, height: plotHeight, class: 'gs-hitbox' }); elements.plot.append(crosshair, hit);
      chartGeometry = { x, period, plotWidth, left, top, height, crosshair, width };
      const inspect = event => { const rect = elements.plot.getBoundingClientRect(), localX = (event.clientX - rect.left) * width / rect.width, index = Math.min(period.length - 1, Math.max(0, Math.round((localX - left) / plotWidth * (period.length - 1)))); showYear(period[index]); };
      hit.addEventListener('pointermove', inspect); hit.addEventListener('pointerdown', inspect); hit.addEventListener('pointerleave', () => { if (document.activeElement !== elements.plot) { elements.tooltip.hidden = true; crosshair.setAttribute('visibility', 'hidden'); } });
    }
    function showYear(year) {
      if (!chartGeometry) return;
      if (state.hoverYear === year && !elements.tooltip.hidden) return;
      const g = chartGeometry, selected = chosen(), all = available(); state.hoverYear = year; g.crosshair.setAttribute('x1', g.x(year)); g.crosshair.setAttribute('x2', g.x(year)); g.crosshair.setAttribute('visibility', 'visible');
      const tooltip = elements.tooltip; tooltip.replaceChildren(); const title = document.createElement('strong'); title.textContent = year + ' · ' + data.sessionsByYear[year] + ' CS ' + (data.sessionsByYear[year] === 1 ? 'paper' : 'papers'); tooltip.append(title);
      for (const series of selected) { const row = document.createElement('div'); row.className = 'gs-tip-row'; const name = document.createElement('span'); name.className = 'gs-tip-name'; const dot = document.createElement('i'); dot.style.background = colour(all.findIndex(s => s.id === series.id)); const label = document.createElement('span'); label.textContent = series.label; name.append(dot, label); const amount = document.createElement('span'); amount.className = 'gs-tip-value'; amount.textContent = fmt.format(value(series, year)); row.append(name, amount); tooltip.append(row); }
      tooltip.hidden = false; const availableWidth = elements.plot.parentElement.clientWidth; tooltip.style.left = Math.max(0, Math.min(g.x(year) + 12, availableWidth - tooltip.offsetWidth)) + 'px'; tooltip.style.top = '12px';
      $('gs-status').textContent = year + ': ' + selected.map(s => s.label + ' ' + fmt.format(value(s, year))).join('; ') + '. ' + unit() + '.';
    }
    elements.plot.addEventListener('keydown', event => { if (!chartGeometry || !['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) return; event.preventDefault(); if (event.key === 'Escape') { elements.tooltip.hidden = true; chartGeometry.crosshair.setAttribute('visibility', 'hidden'); return; } const period = years(), current = Math.max(0, period.indexOf(state.hoverYear ?? period[0])), index = Math.max(0, Math.min(period.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1))); showYear(period[index]); });
    function render() {
      const selected = chosen(), period = years(), points = selected.flatMap(s => s.points.filter(p => period.includes(p.year))), sessions = new Set(points.flatMap(p => p.sessions)), present = new Set(points.filter(p => p.questions > 0).map(p => p.year));
      $('gs-mark-split').textContent = fmt.format(points.reduce((n,p)=>n+p.oneMark,0)) + ' one-mark questions · ' + fmt.format(points.reduce((n,p)=>n+p.twoMark,0)) + ' two-mark questions · Latest appearance: ' + (present.size ? Math.max(...present) : 'none in this period');
      $('gs-questions').textContent = fmt.format(points.reduce((n, p) => n + p.questions, 0)); $('gs-marks').textContent = fmt.format(points.reduce((n, p) => n + p.marks, 0)); $('gs-years').textContent = present.size; $('gs-sessions').textContent = sessions.size;
      const name = state.scope === 'all' ? 'Subjects' : data.subjects.find(s => s.code === state.scope).label + ' chapters';
      $('gs-context').textContent = 'Selected series · ' + state.from + '–' + state.through + ' · cumulative raw counts'; $('gs-title').textContent = name + (state.mode === 'line' ? ' across the years' : ' compared'); $('gs-axis-caption').textContent = state.mode === 'line' ? unit() + ' · colour, line style and marker identify each series' : (state.normalisation === 'paper' ? 'Average ' + state.metric + ' per CS paper in the selected period' : 'Total ' + state.metric + ' in the selected period'); $('gs-series-count').textContent = selected.length + ' of ' + available().length + ' series selected';
      content.querySelectorAll('.gs-mode').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode))); legend(); draw(); table();
    }
    elements.scope.addEventListener('change', () => { state.scope = elements.scope.value; topFour(); $('gs-status').textContent = ''; render(); });
    elements.metric.addEventListener('change', () => { state.metric = elements.metric.value; render(); });
    elements.normalisation.addEventListener('change', () => { state.normalisation = elements.normalisation.value; render(); });
    for (const [input, key] of [[elements.from, 'from'], [elements.through, 'through']]) input.addEventListener('change', () => { state[key] = Number(input.value); if (state.from > state.through) { if (key === 'from') state.through = state.from; else state.from = state.through; elements.from.value = String(state.from); elements.through.value = String(state.through); } render(); });
    content.querySelectorAll('.gs-mode').forEach(button => button.addEventListener('click', () => { state.mode = button.dataset.mode; render(); }));
    $('gs-all').addEventListener('click', () => { state.selected = new Set(available().map(s => s.id)); render(); }); $('gs-top').addEventListener('click', () => { topFour(); render(); });
    $('gs-export').addEventListener('click', () => { const selected = chosen(), quote = v => '"' + String(v).replaceAll('"', '""') + '"', rows = [['Year', 'CS papers', ...selected.map(s => s.label + ' (' + unit() + ')')], ...years().map(year => [year, data.sessionsByYear[year], ...selected.map(s => value(s, year))])], blob = new Blob(['\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `gate-cs-${state.scope}-${state.metric}-${state.from}-${state.through}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
    const resize = new ResizeObserver(() => { if (!box.open) return; cancelAnimationFrame(queued); queued = requestAnimationFrame(draw); }); resize.observe(elements.plot.parentElement);
    box.addEventListener('toggle', () => { if (box.open) requestAnimationFrame(draw); });
    topFour(); render();
  }
})();
