/* Núcleo: utilidades, modelo de dados, tema, tooltip, tabela e roteamento */
(function () {
  'use strict';
  const D = window.LATTES;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (Math.round(n * 100) / 100).toLocaleString('pt-BR');
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
  const CUR = new Date().getFullYear();

  /* ---------- modelo unificado de produção ---------- */
  const abbr = a => { const l = (a || '').split(';').map(x => x.trim()).filter(Boolean); return l.length > 3 ? l.slice(0, 3).join('; ') + ' et al.' : l.join('; '); };
  const pubs = [];
  D.artigos.forEach(a => pubs.push({ tipo: 'Artigo em periódico', grupo: 'Artigos', ano: a.ano, titulo: a.titulo, aut: a.aut, veic: a.veiculo, det: [a.vol && 'v. ' + a.vol, a.pag && 'p. ' + a.pag].filter(Boolean).join(', ') }));
  D.capitulos.forEach(c => pubs.push({ tipo: c.serie ? 'Capítulo de livro (série 2020)' : 'Capítulo de livro', grupo: 'Capítulos', serie: c.serie, ano: c.ano, titulo: c.serie ? c.titulo + ' — ' + c.comunidade + ' (' + c.municipio + ')' : c.titulo, aut: c.aut, veic: c.obra || c.livro, det: [c.vol && 'v. ' + c.vol, c.pag && 'p. ' + c.pag, c.editora, c.cidade].filter(Boolean).join(', ') }));
  D.anais.forEach(a => pubs.push({ tipo: 'Trabalho em evento · ' + a.cat.toLowerCase(), grupo: 'Eventos', ano: a.ano, titulo: a.titulo, aut: a.aut, veic: a.evento, det: a.cidade }));
  D.livros.forEach(l => pubs.push({ tipo: 'Livro / CD-ROM', grupo: 'Livros', ano: 2007, titulo: l.txt.replace(/^.*?\. (?=[A-Z])/, '').slice(0, 160), aut: 'FERREIRA, N. C.', veic: 'ProVárzea (Manaus)', det: '' }));
  D.jornais.forEach(j => pubs.push({ tipo: 'Texto em jornal/revista', grupo: 'Textos', ano: j.ano, titulo: j.txt.slice(0, 160), aut: '', veic: 'Revista InfoGeo', det: '' }));
  D.apresentacoes.forEach(a => pubs.push({ tipo: 'Apresentação de trabalho', grupo: 'Apresentações', ano: a.ano, titulo: a.titulo, aut: a.aut, veic: a.tipo.replace('Apresentação de Trabalho/', ''), det: '' }));
  D.outras_bib.forEach(o => pubs.push({ tipo: 'Outra produção bibliográfica', grupo: 'Outras', ano: o.ano, titulo: o.txt.slice(0, 200), aut: '', veic: '', det: '' }));
  D.tecnica.forEach(t => pubs.push({ tipo: 'Técnica · ' + t.cat.toLowerCase(), grupo: 'Técnica', ano: t.ano, titulo: t.titulo, aut: t.aut, veic: t.sub, det: '' }));
  pubs.forEach((p, i) => { p.id = i; p.autAbbr = abbr(p.aut); p.q = norm([p.titulo, p.aut, p.veic, p.tipo, p.ano].join(' ')); });

  const bancas = D.bancas, ori = D.orientacoes;
  const projs = D.projetos;
  window.APP = { D, $, $$, esc, fmt, norm, sum, CUR, pubs, bancas, ori, projs, onView: {}, views: {}, abbr, rendered: {} };

  /* ---------- cores ---------- */
  const cv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  APP.col = n => cv('--' + n);
  APP.GROUP_COLOR = { 'Artigos': 'g1', 'Capítulos': 'g2', 'Eventos': 'g3', 'Técnica': 'g7', 'Livros': 'g4', 'Apresentações': 'g5', 'Textos': 'g6', 'Outras': 'g8' };

  /* ---------- tema ---------- */
  const root = document.documentElement;
  APP.theme = () => root.dataset.theme || 'dark';
  APP.setTheme = t => { root.dataset.theme = t; try { localStorage.setItem('lattes-theme', t); } catch (e) {} const m = $('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#101319' : '#f4f6f9'; APP.redrawAll(); };
  $('#theme').addEventListener('click', () => APP.setTheme(APP.theme() === 'dark' ? 'light' : 'dark'));

  /* ---------- tooltip ---------- */
  const tip = $('#tip');
  APP.tip = {
    show(html, ev) { tip.innerHTML = html; tip.hidden = false; APP.tip.move(ev); },
    move(ev) { const r = tip.getBoundingClientRect(); let x = ev.clientX + 14, y = ev.clientY + 14; if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14; tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px'; },
    hide() { tip.hidden = true; }
  };
  APP.bindTip = (el, htmlFn) => { el.addEventListener('mousemove', e => APP.tip.show(htmlFn(e), e)); el.addEventListener('mouseleave', APP.tip.hide); };

  /* ---------- CSV ---------- */
  APP.csv = (name, head, rows) => {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const txt = '﻿' + [head, ...rows].map(r => r.map(q).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ---------- tabela ordenável com busca e paginação ---------- */
  APP.table = function (host, opt) {
    const st = { sort: opt.sort || null, dir: opt.dir || 1, page: 0, size: opt.size || 20, q: '', pre: opt.pre || (() => true) };
    host.innerHTML = `<div class="toolbar" style="padding-top:0"><div class="search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg><input type="search" placeholder="${esc(opt.placeholder || 'Buscar na tabela')}" aria-label="Buscar"></div><span class="muted cnt" aria-live="polite"></span><button class="btn csv" style="margin-left:auto">Exportar CSV</button></div><div class="tscroll"><table class="dtable"><thead></thead><tbody></tbody></table></div><div class="pager"></div>`;
    const inp = $('input', host), thead = $('thead', host), tbody = $('tbody', host), pager = $('.pager', host), cnt = $('.cnt', host);
    const cols = opt.cols;
    const rows = () => {
      let r = opt.rows().filter(st.pre);
      if (st.q) { const t = norm(st.q).split(/\s+/).filter(Boolean); r = r.filter(x => { const h = x.q || norm(cols.map(c => (c.text ? c.text(x) : x[c.k])).join(' ')); return t.every(w => h.includes(w)); }); }
      if (st.sort != null) { const c = cols[st.sort]; const g = c.val || (x => x[c.k]); r = [...r].sort((a, b) => { const A = g(a), B = g(b); if (A == null && B == null) return 0; if (A == null) return 1; if (B == null) return -1; return (typeof A === 'number' ? A - B : String(A).localeCompare(String(B), 'pt-BR')) * st.dir; }); }
      return r;
    };
    function draw() {
      const r = rows(), pages = Math.max(1, Math.ceil(r.length / st.size)); st.page = Math.min(st.page, pages - 1);
      thead.innerHTML = '<tr>' + cols.map((c, i) => `<th class="${c.num ? 'num' : ''}" aria-sort="${st.sort === i ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button data-i="${i}">${esc(c.label)}<span aria-hidden="true">${st.sort === i ? (st.dir > 0 ? '▲' : '▼') : ''}</span></button></th>`).join('') + '</tr>';
      const sl = r.slice(st.page * st.size, (st.page + 1) * st.size);
      tbody.innerHTML = sl.length ? sl.map(x => '<tr>' + cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.render ? c.render(x) : esc(x[c.k] == null ? '' : x[c.k])}</td>`).join('') + '</tr>').join('') : `<tr><td colspan="${cols.length}" class="muted" style="padding:28px;text-align:center">Nenhum registro com esses filtros.</td></tr>`;
      cnt.textContent = fmt(r.length) + (r.length === 1 ? ' registro' : ' registros');
      pager.innerHTML = r.length > st.size ? `<span>Página ${st.page + 1} de ${pages}</span><span class="btns"><button data-p="-1" ${st.page === 0 ? 'disabled' : ''}>Anterior</button><button data-p="1" ${st.page >= pages - 1 ? 'disabled' : ''}>Próxima</button></span>` : '';
      draw.rows = r;
    }
    thead.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i; if (st.sort === i) st.dir *= -1; else { st.sort = i; st.dir = cols[i].num ? -1 : 1; } st.page = 0; draw(); });
    pager.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.page += +b.dataset.p; draw(); host.scrollIntoView({ block: 'nearest' }); });
    let tm; inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { st.q = inp.value; st.page = 0; draw(); }, 120); });
    $('.csv', host).addEventListener('click', () => { const r = rows(); APP.csv(opt.csv || 'tabela.csv', cols.map(c => c.label), r.map(x => cols.map(c => c.text ? c.text(x) : (x[c.k] == null ? '' : x[c.k])))); });
    draw.refresh = (pre) => { if (pre) st.pre = pre; st.page = 0; draw(); };
    draw(); return draw;
  };

  /* ---------- roteamento por abas ---------- */
  const VIEWS = ['visao', 'producao', 'orientacoes', 'trajetoria', 'projetos', 'mapa'];
  APP.view = 'visao';
  APP.redraws = [];
  APP.reg = fn => { APP.redraws.push(fn); fn(); return fn; };
  APP.redrawAll = () => APP.redraws.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  APP.show = function (v, force) {
    if (!VIEWS.includes(v)) v = 'visao';
    APP.view = v;
    $$('.view').forEach(s => s.hidden = s.id !== 'v-' + v);
    $$('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === v));
    if (!APP.rendered[v] || force) { try { APP.views[v] && APP.views[v](); APP.rendered[v] = true; } catch (e) { console.error(e); $('#v-' + v).insertAdjacentHTML('afterbegin', '<p class="muted">Erro ao desenhar esta seção: ' + esc(e.message) + '</p>'); } }
    else if (APP.onView[v]) APP.onView[v]();
    if (!force) scrollTo({ top: 0 });
  };
  $('.tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; location.hash = b.dataset.view; });
  addEventListener('hashchange', () => APP.show(location.hash.slice(1)));
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => APP.redrawAll(), 200); });
  APP.start = () => { APP.ready = true; APP.show(location.hash.slice(1), true); };
})();
