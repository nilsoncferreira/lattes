/* Mapa interativo próprio, sobre ladrilhos de mapas livres (OpenStreetMap e derivados), sem biblioteca externa */
(function () {
  'use strict';
  const { D, $, $$, esc, fmt, bancas, ori, pubs, CUR } = APP;
  const TS = 256, MINZ = 2, MAXZ = 19;
  const ESRI = 'Tiles © <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> — fontes: Esri, DeLorme, NAVTEQ, OpenStreetMap contributors';
  const OSMA = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Colaboradores do OpenStreetMap</a>';
  const PROV = {
    osm: { nome: 'OpenStreetMap (padrão)', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', sub: 'a', bg: '#e8e6df', maxz: 19, attr: OSMA },
    streets: { nome: 'Ruas (Esri World Street Map)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', sub: 'a', bg: '#e8e6df', maxz: 19, attr: ESRI },
    dark: { nome: 'Cinza escuro (Esri Dark Gray)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', sub: 'a', bg: '#1b1d21', maxz: 16, attr: ESRI },
    light: { nome: 'Cinza claro (Esri Light Gray)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', sub: 'a', bg: '#e9ebee', maxz: 16, attr: ESRI },
    topo: { nome: 'Relevo (OpenTopoMap)', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', sub: 'abc', bg: '#e4e2d6', maxz: 17, attr: OSMA.replace('Colaboradores do ', '') + ' · © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)' },
    sat: { nome: 'Satélite (Esri World Imagery)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', sub: 'a', bg: '#10151c', maxz: 19, attr: ESRI.replace(', OpenStreetMap contributors', '') + ' (Maxar, Earthstar Geographics)' }
  };
  // Sem chave de API em nenhum provedor. O servidor do OSM bloqueia páginas abertas direto do disco (file://), então ali o padrão é o Esri.
  const defBase = () => APP.theme() === 'dark' ? 'dark' : (location.protocol === 'file:' ? 'streets' : 'osm');
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  class SlippyMap {
    constructor(box) {
      this.box = box; this.z = 4; this.lat = -15.5; this.lon = -52; this.tiles = new Map(); this.prov = PROV.dark; this.pk = 'dark'; this.loaded = 0; this.errors = 0; this.onrender = null;
      box.innerHTML = '<div class="map-tiles"></div><div class="map-over"><svg aria-hidden="false"></svg></div><div class="map-ctl"><button data-a="in" aria-label="Aproximar" title="Aproximar (+)">+</button><button data-a="out" aria-label="Afastar" title="Afastar (−)">−</button><button data-a="fit" aria-label="Mostrar todos os pontos" title="Mostrar todos os pontos">⌂</button></div><div class="map-attr"></div>';
      this.tl = box.querySelector('.map-tiles'); this.svg = box.querySelector('svg'); this.attr = box.querySelector('.map-attr');
      box.tabIndex = 0; box.setAttribute('role', 'application'); box.setAttribute('aria-label', 'Mapa interativo. Arraste para mover, use +/− para aproximar.');
      this.bind(); new ResizeObserver(() => this.render()).observe(box);
    }
    get W() { return this.box.clientWidth || 600; } get H() { return this.box.clientHeight || 400; }
    px(lat, lon, z = this.z) { const n = TS * Math.pow(2, z), s = Math.sin(lat * Math.PI / 180); return { x: (lon + 180) / 360 * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n }; }
    ll(x, y, z = this.z) { const n = TS * Math.pow(2, z); return { lon: x / n * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI }; }
    topLeft() { const c = this.px(this.lat, this.lon); return { x: c.x - this.W / 2, y: c.y - this.H / 2 }; }
    toScreen(lat, lon) { const p = this.px(lat, lon), t = this.topLeft(); return { x: p.x - t.x, y: p.y - t.y }; }
    setProvider(k) { this.pk = k; this.prov = PROV[k]; this.tiles.forEach(i => i.remove()); this.tiles.clear(); this.loaded = 0; this.errors = 0; this.box.style.background = this.prov.bg; this.render(); }
    setView(lat, lon, z) { this.lat = clamp(lat, -84, 84); this.lon = lon; this.z = clamp(z, MINZ, this.prov.maxz); this.render(); }
    zoomAt(dz, sx, sy) {
      const nz = clamp(this.z + dz, MINZ, this.prov.maxz); if (nz === this.z) return;
      if (sx == null) { sx = this.W / 2; sy = this.H / 2; }
      const t = this.topLeft(), at = this.ll(t.x + sx, t.y + sy);
      const f = Math.pow(2, nz - this.z); const wx = (t.x + sx) * f, wy = (t.y + sy) * f; // ponto sob o cursor no novo zoom
      const c = this.ll(wx - sx + this.W / 2, wy - sy + this.H / 2, nz); this.z = nz; this.lat = clamp(c.lat, -84, 84); this.lon = c.lon; this.render();
    }
    fit(pts, pad = 60) {
      if (!pts.length) return;
      for (let z = this.prov.maxz; z >= MINZ; z--) {
        const P = pts.map(p => this.px(p.lat, p.lon, z)); const x0 = Math.min(...P.map(p => p.x)), x1 = Math.max(...P.map(p => p.x)), y0 = Math.min(...P.map(p => p.y)), y1 = Math.max(...P.map(p => p.y));
        if (x1 - x0 <= this.W - pad * 2 && y1 - y0 <= this.H - pad * 2 || z === MINZ) { const c = this.ll((x0 + x1) / 2, (y0 + y1) / 2, z); this.setView(c.lat, c.lon, Math.min(z, 12)); return; }
      }
    }
    render() {
      if (this.raf) return; this.raf = requestAnimationFrame(() => { this.raf = 0; this._render(); });
    }
    _render() {
      const t = this.topLeft(), n = Math.pow(2, this.z), need = new Set();
      const tx0 = Math.floor(t.x / TS), tx1 = Math.floor((t.x + this.W) / TS), ty0 = Math.max(0, Math.floor(t.y / TS)), ty1 = Math.min(n - 1, Math.floor((t.y + this.H) / TS));
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const key = this.z + '/' + tx + '/' + ty; need.add(key);
        let img = this.tiles.get(key);
        if (!img) {
          img = new Image(); img.alt = ''; img.decoding = 'async'; img.referrerPolicy = 'origin-when-cross-origin';
          const xm = ((tx % n) + n) % n, s = this.prov.sub[(xm + ty) % this.prov.sub.length];
          img.onload = () => { this.loaded++; this.note(); }; img.onerror = () => { this.errors++; img.remove(); this.note(); };
          img.src = this.prov.url.replace('{s}', s).replace('{z}', this.z).replace('{x}', xm).replace('{y}', ty);
          this.tl.appendChild(img); this.tiles.set(key, img);
        }
        img.style.transform = `translate(${Math.round(tx * TS - t.x)}px,${Math.round(ty * TS - t.y)}px)`; img.style.left = 0; img.style.top = 0;
      }
      this.tiles.forEach((img, k) => { if (!need.has(k)) { img.remove(); this.tiles.delete(k); } });
      this.attr.innerHTML = this.prov.attr;
      this.onrender && this.onrender();
    }
    note() {
      let n = this.box.querySelector('.map-note');
      if (this.loaded === 0 && this.errors >= 4 && !this.fell && this.pk !== 'streets' && this.pk !== 'dark') { this.fell = true; if (this.onfallback) this.onfallback(APP.theme() === 'dark' ? 'dark' : 'streets'); return; }
      if (this.loaded === 0 && this.errors >= 4) { if (!n) { n = document.createElement('div'); n.className = 'map-note'; n.textContent = 'Não foi possível carregar o mapa-base (sem internet ou bloqueio do provedor). Os pontos continuam disponíveis; tente outro mapa-base ao lado.'; this.box.appendChild(n); } }
      else if (n && this.loaded > 0) n.remove();
    }
    bind() {
      const b = this.box; let drag = null; const ptrs = new Map(); let pinch = 0;
      b.addEventListener('pointerdown', e => {
        if (e.target.closest('.map-ctl,.map-pop')) return;
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); b.setPointerCapture(e.pointerId);
        if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, lat: this.lat, lon: this.lon, moved: false }; } else if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; pinch = Math.hypot(p.x - q.x, p.y - q.y); }
      });
      b.addEventListener('pointermove', e => {
        if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; const d = Math.hypot(p.x - q.x, p.y - q.y); if (pinch && d / pinch > 1.5) { this.zoomAt(1); pinch = d; } else if (pinch && d / pinch < .66) { this.zoomAt(-1); pinch = d; } this.moved = true; return; }
        if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 4) return; drag.moved = true; this.moved = true; b.classList.add('drag');
        const c = this.px(drag.lat, drag.lon), p = this.ll(c.x - dx, c.y - dy); this.lat = clamp(p.lat, -84, 84); this.lon = p.lon; this.render();
      });
      const up = e => { ptrs.delete(e.pointerId); if (!ptrs.size) { drag = null; pinch = 0; b.classList.remove('drag'); setTimeout(() => { this.moved = false; }, 0); } };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      let wt = 0; b.addEventListener('wheel', e => { e.preventDefault(); const now = Date.now(); if (now - wt < 140) return; wt = now; const r = b.getBoundingClientRect(); this.zoomAt(e.deltaY < 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      b.addEventListener('dblclick', e => { if (e.target.closest('.map-ctl,.map-pop,circle')) return; const r = b.getBoundingClientRect(); this.zoomAt(1, e.clientX - r.left, e.clientY - r.top); });
      b.addEventListener('keydown', e => { const s = 60, c = this.px(this.lat, this.lon); let dx = 0, dy = 0; if (e.key === 'ArrowLeft') dx = -s; else if (e.key === 'ArrowRight') dx = s; else if (e.key === 'ArrowUp') dy = -s; else if (e.key === 'ArrowDown') dy = s; else if (e.key === '+' || e.key === '=') return this.zoomAt(1); else if (e.key === '-') return this.zoomAt(-1); else return; e.preventDefault(); const p = this.ll(c.x + dx, c.y + dy); this.lat = clamp(p.lat, -84, 84); this.lon = p.lon; this.render(); });
      b.querySelector('.map-ctl').addEventListener('click', e => { const a = e.target.closest('button'); if (!a) return; if (a.dataset.a === 'in') this.zoomAt(1); else if (a.dataset.a === 'out') this.zoomAt(-1); else if (this.onfit) this.onfit(); });
    }
  }

  /* ------------------------------ camadas de dados ------------------------------ */
  const LAYERS = [
    { id: 'traj', nome: 'Formação e vínculos', cor: 'g1', desc: 'Onde estudou e trabalhou' },
    { id: 'inst', nome: 'Bancas e orientações', cor: 'g2', desc: 'Instituições (tamanho = nº de bancas e orientações)' },
    { id: 'evt', nome: 'Eventos científicos', cor: 'g3', desc: 'Cidades dos congressos com trabalhos publicados' },
    { id: 'terr', nome: 'Territórios de estudo', cor: 'g7', desc: 'Municípios citados em títulos de trabalhos' }
  ];

  function buildPoints(y0, y1, on) {
    const ok = a => a == null ? (y0 <= MINY && y1 >= CUR) : (a >= y0 && a <= y1);
    const pts = [];
    if (on.traj) {
      const g = new Map(); const put = (lat, lon, cidade, ano0, ano1, txt) => { const f = ano1 == null ? CUR : ano1; if (f < y0 || ano0 > y1) return; const k = cidade; if (!g.has(k)) g.set(k, { lat, lon, nome: cidade, itens: [] }); g.get(k).itens.push({ a: ano0 + '–' + (ano1 == null ? 'atual' : ano1), t: txt }); };
      D.formacao.forEach(f => put(f.lat, f.lon, f.cidade, f.ini, f.fim, f.nivel + ' · ' + f.sigla));
      D.vinculos.filter(v => v.lat != null).forEach(v => put(v.lat, v.lon, v.cidade, v.ini, v.fim, (v.sigla || v.inst) + ' · ' + (v.funcao || v.vinculo) + (v.aprox ? ' (localização aproximada)' : '')));
      g.forEach(v => pts.push({ layer: 'traj', nome: v.nome, sub: 'Formação e vínculos', lat: v.lat, lon: v.lon, n: v.itens.length, itens: v.itens.map(i => `<b>${esc(i.a)}</b> ${esc(i.t)}`) }));
    }
    if (on.inst) {
      const m = new Map();
      bancas.concat(ori).forEach(x => { if (!x.instk || !ok(x.ano)) return; if (!m.has(x.instk)) m.set(x.instk, { b: [], o: [] }); (x.sit ? m.get(x.instk).o : m.get(x.instk).b).push(x); });
      m.forEach((v, k) => { const g = D.geo.inst[k]; if (!g) return; const itens = [`<b>${v.b.length}</b> participações em bancas`, `<b>${v.o.length}</b> orientações`]; pts.push({ layer: 'inst', nome: g.nome, sub: g.cidade + ' · ' + k, lat: g.lat, lon: g.lon, n: v.b.length + v.o.length, itens }); });
    }
    if (on.evt) {
      const m = new Map(); D.anais.forEach(a => { if (!a.cidade_k || !ok(a.ano)) return; if (!m.has(a.cidade_k)) m.set(a.cidade_k, []); m.get(a.cidade_k).push(a); });
      m.forEach((arr, k) => { const c = D.geo.cidades[k]; const evs = [...new Set(arr.map(a => (a.evento || '').slice(0, 80)))]; pts.push({ layer: 'evt', nome: c.nome + ', ' + c.uf, sub: 'Congressos e simpósios', lat: c.lat, lon: c.lon, n: arr.length, itens: evs.slice(0, 40).map(e => esc(e) + ' <span class="muted">(' + arr.filter(a => (a.evento || '').slice(0, 80) === e).map(a => a.ano).join(', ') + ')</span>') }); });
    }
    if (on.terr) {
      D.geo.territorios.forEach(t => { const ob = t.obras.filter(o => ok(o.ano)); if (!ob.length) return; pts.push({ layer: 'terr', nome: t.nome + ', ' + t.uf, sub: 'Território de estudo', lat: t.lat, lon: t.lon, n: ob.length, itens: ob.map(o => `<b>${o.ano || ''}</b> ${esc(o.t)}: ${esc(o.titulo)}`) }); });
    }
    return pts;
  }
  let MINY = 1984;

  APP.views.mapa = function () {
    const el = $('#v-mapa');
    const allY = [...D.anais.map(a => a.ano), ...bancas.map(b => b.ano), ...ori.map(o => o.ano), ...D.formacao.map(f => f.ini), ...D.vinculos.map(v => v.ini)].filter(Boolean);
    MINY = Math.min(...allY);
    el.innerHTML = `
      <div class="page-head"><h1>Mapa</h1><p>Lugares da trajetória acadêmica e profissional. Os círculos crescem com o número de registros; clique em um ponto para ver o que está ligado a ele. Mapas-base gratuitos, sem chave de API: OpenStreetMap, Esri e OpenTopoMap.</p></div>
      <div class="map-shell">
        <div class="map-box" id="map" style="background:${PROV.dark.bg}"></div>
        <aside class="map-side">
          <div class="box"><h3>Camadas</h3><div id="layers"></div></div>
          <div class="box"><h3>Período</h3><div class="range"><span id="yr-lab"></span><input type="range" id="y0" aria-label="Ano inicial"><input type="range" id="y1" aria-label="Ano final"></div></div>
          <div class="box"><h3>Mapa-base <span class="muted" style="font-weight:400">(sem chave de API)</span></h3><select class="sel" id="base" style="width:100%" aria-label="Mapa-base">${Object.entries(PROV).map(([k, p]) => `<option value="${k}">${p.nome}</option>`).join('')}</select></div>
          <div class="box"><h3>Lugares <span class="muted" id="pl-n" style="font-weight:400"></span></h3><div class="plist" id="plist"></div></div>
        </aside>
      </div>
      <p class="note muted" style="font-size:12.5px;margin-top:12px">Instituições e cidades foram localizadas por coordenadas aproximadas do campus ou do centro urbano. Municípios de estudo são os citados nos títulos dos trabalhos (ex.: “município de Trindade”, “Senador Canedo-GO”). Vínculos sem endereço no currículo (Gempi, AIT, Ambiente Engenharia) não aparecem.</p>`;
    const on = { traj: true, inst: true, evt: true, terr: true };
    $('#layers').innerHTML = LAYERS.map(l => `<label class="layer" title="${esc(l.desc)}"><input type="checkbox" data-l="${l.id}" checked><span><i class="dot" style="background:var(--${l.cor})"></i>${l.nome}</span><span class="n" data-n="${l.id}"></span></label>`).join('');
    const y0 = $('#y0'), y1 = $('#y1'); [y0, y1].forEach(r => { r.min = MINY; r.max = CUR; r.step = 1; }); y0.value = MINY; y1.value = CUR;
    const map = new SlippyMap($('#map'));
    let pts = [], popPt = null;
    const radius = n => clamp(6 + 4.2 * Math.sqrt(n), 7, 36);
    const colorOf = l => APP.col((LAYERS.find(x => x.id === l) || {}).cor || 'g1');
    const drawOverlay = () => {
      const svg = map.svg; svg.innerHTML = '';
      [...pts].sort((a, b) => b.n - a.n).forEach(p => {
        const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', radius(p.n)); c.setAttribute('fill', colorOf(p.layer)); c.setAttribute('fill-opacity', '.62'); c.setAttribute('stroke', APP.col('surface')); c.setAttribute('stroke-width', '1.8'); c.setAttribute('tabindex', '0'); c.setAttribute('role', 'button'); c.setAttribute('aria-label', p.nome + ': ' + p.n);
        c.addEventListener('mousemove', e => APP.tip.show(`<b>${esc(p.nome)}</b><div class="r"><span>${esc(p.sub)}</span><b>${p.n}</b></div>`, e)); c.addEventListener('mouseleave', APP.tip.hide);
        const open = e => { if (map.moved) return; APP.tip.hide(); openPop(p); }; c.addEventListener('click', open); c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPop(p); } });
        p.el = c; svg.appendChild(c);
      });
      place();
    };
    const place = () => { pts.forEach(p => { const s = map.toScreen(p.lat, p.lon); p.el && (p.el.setAttribute('cx', s.x), p.el.setAttribute('cy', s.y)); }); if (popPt) posPop(); };
    map.onrender = place;
    let pop = null;
    const closePop = () => { if (pop) pop.remove(); pop = null; popPt = null; };
    const posPop = () => { if (!pop || !popPt) return; const s = map.toScreen(popPt.lat, popPt.lon), r = radius(popPt.n); const w = pop.offsetWidth, h = pop.offsetHeight; let x = s.x + r + 8, y = s.y - 20; if (x + w > map.W - 8) x = s.x - r - 8 - w; x = clamp(x, 8, map.W - w - 8); y = clamp(y, 8, map.H - h - 26); pop.style.left = x + 'px'; pop.style.top = y + 'px'; };
    const openPop = p => {
      closePop(); popPt = p; pop = document.createElement('div'); pop.className = 'map-pop';
      pop.innerHTML = `<button class="x" aria-label="Fechar">×</button><h3>${esc(p.nome)}</h3><div class="muted">${esc(p.sub)} · ${p.n} ${p.layer === 'traj' ? (p.n === 1 ? 'registro' : 'registros') : 'itens'}</div><ul>${p.itens.slice(0, 40).map(i => `<li>${i}</li>`).join('')}</ul>${p.itens.length > 40 ? `<p class="muted">+ ${p.itens.length - 40} itens</p>` : ''}`;
      map.box.appendChild(pop); pop.querySelector('.x').addEventListener('click', closePop); pop.addEventListener('pointerdown', e => e.stopPropagation()); posPop();
    };
    const refresh = (fit) => {
      closePop(); const a = +y0.value, b = +y1.value; $('#yr-lab').textContent = a + ' a ' + b;
      pts = buildPoints(a, b, on); drawOverlay();
      LAYERS.forEach(l => { const e = $(`[data-n="${l.id}"]`); if (e) e.textContent = pts.filter(p => p.layer === l.id).length; });
      const pl = [...pts].sort((x, y) => y.n - x.n);
      $('#pl-n').textContent = '(' + pl.length + ')';
      $('#plist').innerHTML = pl.map((p, i) => `<button data-i="${i}"><i class="dot" style="background:${colorOf(p.layer)};margin:0"></i><span>${esc(p.nome)}</span><span class="n">${p.n}</span></button>`).join('') || '<span class="muted">Nenhum ponto neste período.</span>';
      $('#plist').onclick = e => { const bt = e.target.closest('button'); if (!bt) return; const p = pl[+bt.dataset.i]; map.setView(p.lat, p.lon, Math.max(map.z, 7)); setTimeout(() => openPop(p), 30); };
      if (fit) map.fit(pts);
    };
    map.onfit = () => map.fit(pts);
    $('#layers').addEventListener('change', e => { const i = e.target.closest('input'); if (!i) return; on[i.dataset.l] = i.checked; refresh(false); });
    y0.addEventListener('input', () => { if (+y0.value > +y1.value) y1.value = y0.value; refresh(false); });
    y1.addEventListener('input', () => { if (+y1.value < +y0.value) y0.value = y1.value; refresh(false); });
    const base = $('#base'); base.value = defBase(); map.onfallback = k => { base.value = k; map.errors = 0; map.setProvider(k); };
    base.addEventListener('change', () => map.setProvider(base.value));
    map.setProvider(base.value);
    map.setView(-15.8, -50, 4);
    refresh(false);
    APP.map = map;
    APP.reg(() => { if (APP.mapAutoBase && ['dark', 'light', 'streets', 'osm'].includes(base.value) && base.value !== defBase()) { base.value = defBase(); map.setProvider(base.value); } drawOverlay(); });
    APP.mapAutoBase = true;
  };
  APP.onView.mapa = () => { APP.map && APP.map.render(); };
})();
