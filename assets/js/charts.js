/* Gráficos SVG feitos à mão (com escalas do D3) */
(function () {
  'use strict';
  const { $, esc, fmt, col } = APP;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const width = host => Math.max(280, host.clientWidth || 640);

  /* colunas empilhadas por ano */
  APP.stackedColumns = function (host, o) {
    // o: {years:[...], series:[{name,color,values[]}], height, yLabel, desc}
    host.innerHTML = '';
    if (o.legend !== false) { const lg = document.createElement('ul'); lg.className = 'legend'; lg.innerHTML = o.series.map(s => `<li><i style="background:${col(s.color)}"></i>${esc(s.name)}</li>`).join(''); host.appendChild(lg); }
    const W = width(host), H = o.height || 260, m = { t: 8, r: 6, b: 26, l: 34 };
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.desc || 'Gráfico de colunas empilhadas' }); host.appendChild(svg);
    const yrs = o.years, tot = yrs.map((_, i) => o.series.reduce((s, x) => s + x.values[i], 0));
    const x = d3.scaleBand().domain(yrs).range([m.l, W - m.r]).paddingInner(.18).paddingOuter(.05);
    const y = d3.scaleLinear().domain([0, Math.max(1, d3.max(tot))]).nice().range([H - m.b, m.t]);
    const g = svgEl('g', { class: 'axis' }, svg);
    y.ticks(5).forEach(t => { svgEl('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'gridline' }, g); const tx = svgEl('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end' }, g); tx.textContent = t; });
    const step = Math.ceil(yrs.length / Math.max(2, Math.floor((W - m.l) / 42)));
    yrs.forEach((yr, i) => { if (i % step === 0 || i === yrs.length - 1) { const tx = svgEl('text', { x: x(yr) + x.bandwidth() / 2, y: H - 8, 'text-anchor': 'middle' }, g); tx.textContent = yr; } });
    yrs.forEach((yr, i) => {
      let acc = 0;
      o.series.forEach(s => { const v = s.values[i]; if (!v) return; const y0 = y(acc), y1 = y(acc + v); acc += v; svgEl('rect', { x: x(yr), width: x.bandwidth(), y: y1, height: Math.max(0, y0 - y1 - 1.5), rx: 2, fill: col(s.color) }, svg); });
      const hit = svgEl('rect', { x: x(yr) - 2, width: x.bandwidth() + 4, y: m.t, height: H - m.t - m.b, class: 'hit' }, svg);
      APP.bindTip(hit, () => `<b>${yr}</b>` + o.series.filter(s => s.values[i]).map(s => `<div class="r"><span><i class="dot" style="background:${col(s.color)}"></i>${esc(s.name)}</span><b>${s.values[i]}</b></div>`).join('') + (o.series.length > 1 ? `<div class="r" style="border-top:1px solid var(--line);margin-top:3px;padding-top:3px"><span>Total</span><b>${tot[i]}</b></div>` : ''));
    });
  };

  /* barras horizontais */
  APP.hbars = function (host, data, o = {}) {
    // data: [{label, value, color?, tip?}]
    host.innerHTML = '';
    const rowH = o.rowH || 26, W = width(host), lw = Math.min(o.labelW || 190, W * .5), m = { t: 4, r: 40, b: 4, l: lw };
    const H = m.t + m.b + rowH * data.length;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.desc || 'Gráfico de barras' }); host.appendChild(svg);
    const x = d3.scaleLinear().domain([0, Math.max(1, d3.max(data, d => d.value))]).range([0, W - m.l - m.r]);
    const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
    const maxCh = Math.floor(lw / 6.4);
    data.forEach((d, i) => {
      const yy = m.t + i * rowH, gg = svgEl('g', { class: 'bar-row' }, svg);
      const t = svgEl('text', { x: m.l - 8, y: yy + rowH / 2 + 4, 'text-anchor': 'end', class: 'bar-label' }, gg); t.textContent = cut(d.label, maxCh);
      svgEl('rect', { x: m.l, y: yy + 4, width: Math.max(2, x(d.value)), height: rowH - 9, rx: 3, fill: col(d.color || o.color || 'g1') }, gg);
      const v = svgEl('text', { x: m.l + Math.max(2, x(d.value)) + 6, y: yy + rowH / 2 + 4, class: 'bar-val' }, gg); v.textContent = fmt(d.value);
      const hit = svgEl('rect', { x: 0, y: yy, width: W, height: rowH, class: 'hit' }, gg);
      APP.bindTip(hit, () => d.tip || `<b>${esc(d.label)}</b><div class="r"><span>${esc(o.unit || 'Itens')}</span><b>${fmt(d.value)}</b></div>`);
      if (d.onclick) { hit.style.cursor = 'pointer'; hit.addEventListener('click', d.onclick); }
    });
  };

  /* linha acumulada (área) */
  APP.cumLine = function (host, years, values, o = {}) {
    host.innerHTML = '';
    const W = width(host), H = o.height || 200, m = { t: 10, r: 10, b: 26, l: 38 };
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.desc || 'Total acumulado por ano' }); host.appendChild(svg);
    const x = d3.scaleLinear().domain([years[0], years[years.length - 1]]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, d3.max(values) || 1]).nice().range([H - m.b, m.t]);
    const g = svgEl('g', { class: 'axis' }, svg);
    y.ticks(4).forEach(t => { svgEl('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'gridline' }, g); const tx = svgEl('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end' }, g); tx.textContent = t; });
    x.ticks(Math.floor(W / 80)).forEach(t => { const tx = svgEl('text', { x: x(t), y: H - 8, 'text-anchor': 'middle' }, g); tx.textContent = Math.round(t); });
    const c = col(o.color || 'g1');
    const area = d3.area().x((_, i) => x(years[i])).y0(y(0)).y1(v => y(v)).curve(d3.curveStepAfter);
    svgEl('path', { d: area(values), fill: c, 'fill-opacity': .18 }, svg);
    svgEl('path', { d: d3.line().x((_, i) => x(years[i])).y(v => y(v)).curve(d3.curveStepAfter)(values), fill: 'none', stroke: c, 'stroke-width': 2 }, svg);
    const dot = svgEl('circle', { r: 4.5, fill: c, stroke: col('surface'), 'stroke-width': 2, opacity: 0 }, svg);
    const hit = svgEl('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, class: 'hit' }, svg);
    hit.addEventListener('mousemove', e => { const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) * W / r.width; const yr = Math.round(x.invert(px)); const i = Math.max(0, Math.min(years.length - 1, yr - years[0])); dot.setAttribute('cx', x(years[i])); dot.setAttribute('cy', y(values[i])); dot.setAttribute('opacity', 1); APP.tip.show(`<b>${years[i]}</b><div class="r"><span>${esc(o.unit || 'Acumulado')}</span><b>${fmt(values[i])}</b></div>`, e); });
    hit.addEventListener('mouseleave', () => { dot.setAttribute('opacity', 0); APP.tip.hide(); });
  };

  /* linha do tempo em faixas (swimlane) */
  APP.swimlane = function (host, lanes, o = {}) {
    // lanes: [{label, items:[{ini,fim,label,color,tip}]}]
    host.innerHTML = '';
    const W = Math.max(900, width(host)), rowH = 30, m = { t: 26, r: 18, b: 6, l: 190 };
    const H = m.t + m.b + lanes.length * rowH;
    const svg = svgEl('svg', { id: 'timeline', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.desc || 'Linha do tempo' }); svg.style.minWidth = W + 'px'; host.appendChild(svg);
    const all = lanes.flatMap(l => l.items); const t0 = Math.floor(d3.min(all, d => d.ini) / 5) * 5, t1 = APP.CUR + 1;
    const x = d3.scaleLinear().domain([t0, t1]).range([m.l, W - m.r]);
    const g = svgEl('g', { class: 'tl-axis' }, svg);
    x.ticks(Math.floor((W - m.l) / 70)).forEach(t => { svgEl('line', { x1: x(t), x2: x(t), y1: m.t - 4, y2: H - m.b, class: 'tl-grid', opacity: .5 }, g); const tx = svgEl('text', { x: x(t), y: m.t - 10, 'text-anchor': 'middle' }, g); tx.textContent = Math.round(t); });
    lanes.forEach((l, i) => {
      const yy = m.t + i * rowH;
      if (i % 2 === 0) svgEl('rect', { x: 0, y: yy, width: W, height: rowH, fill: col('line2'), opacity: .35 }, svg);
      const t = svgEl('text', { x: m.l - 10, y: yy + rowH / 2 + 4, 'text-anchor': 'end', class: 'tl-lane-label' }, svg); t.textContent = l.label.length > 30 ? l.label.slice(0, 29) + '…' : l.label;
      l.items.forEach(it => {
        const fim = it.fim == null ? APP.CUR + 1 : Math.max(it.fim + 1, it.ini + .6);
        const r = svgEl('rect', { x: x(it.ini), y: yy + 6, width: Math.max(5, x(fim) - x(it.ini)), height: rowH - 12, rx: 4, fill: col(it.color || 'g1'), class: 'tl-bar', opacity: it.fim == null ? 1 : .88 }, svg);
        APP.bindTip(r, () => it.tip);
      });
    });
  };
})();
