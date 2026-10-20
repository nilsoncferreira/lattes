/* Seções do painel */
(function () {
  'use strict';
  const { D, $, $$, esc, fmt, norm, sum, pubs, bancas, ori, projs, CUR } = APP;
  const V = APP.views;
  const count = (arr, f) => { const m = new Map(); arr.forEach(x => { const k = f(x); if (k == null || k === '') return; m.set(k, (m.get(k) || 0) + 1); }); return [...m].sort((a, b) => b[1] - a[1]); };
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const sec = (id, title, take, body, extra = '') => `<section class="sec" id="${id}"><header><h2>${title}</h2>${extra}</header>${take ? `<p class="take">${take}</p>` : ''}${body}</section>`;
  const yearOf = x => x.ano || null;
  const ORI_LABEL = { 'Tese de doutorado': 'Doutorado', 'Dissertação de mestrado': 'Mestrado', 'Monografia de conclusão de curso de aperfeiçoamento/especialização': 'Especialização', 'Trabalho de conclusão de curso de graduação': 'TCC de graduação', 'Iniciação científica': 'Iniciação científica' };
  const ORI_COL = { 'Doutorado': 'g7', 'Mestrado': 'g1', 'Especialização': 'g3', 'TCC de graduação': 'g4', 'Iniciação científica': 'g5' };
  const BAN_COL = { 'Dissertação de mestrado': 'g1', 'Tese de doutorado': 'g7', 'Qualificação de mestrado': 'g2', 'Qualificação de doutorado': 'g8', 'Especialização': 'g3', 'TCC de graduação': 'g4', 'Concurso público': 'g5', 'Outras participações': 'gr' };
  ori.forEach(o => { o.nivel = ORI_LABEL[o.tipo] || o.tipo; });
  const oriDone = ori.filter(o => o.sit === 'Concluída'), oriNow = ori.filter(o => o.sit !== 'Concluída');
  const nSerie = pubs.filter(p => p.serie).length;
  const own = pubs; // todos os registros, inclusive a série de 2020
  const instName = k => (D.geo.inst[k] || {}).nome || '—';
  APP.instName = instName;

  /* ================= VISÃO GERAL ================= */
  V.visao = function () {
    const el = $('#v-visao');
    const art = D.artigos.length, cap = D.capitulos.length, evt = D.anais.length, tec = D.tecnica.length;
    const years = own.map(p => p.ano).filter(Boolean), y0 = Math.min(...years), y1 = Math.max(...years);
    const yrs = range(y0, y1);
    const grp = (g, ser) => yrs.map(y => own.filter(p => p.ano === y && (Array.isArray(g) ? g.includes(p.grupo) : p.grupo === g) && (ser == null || !!p.serie === ser)).length);
    const series = [
      { name: 'Artigos em periódicos', color: 'g1', values: grp('Artigos') },
      { name: 'Capítulos de livros', color: 'g2', values: grp('Capítulos', false) },
      { name: 'Capítulos da série de 2020', color: 'g6', values: grp('Capítulos', true) },
      { name: 'Trabalhos em eventos', color: 'g3', values: grp('Eventos') },
      { name: 'Produção técnica', color: 'g7', values: grp('Técnica') },
      { name: 'Outras', color: 'gr', values: grp(['Livros', 'Textos', 'Apresentações', 'Outras']) }
    ];
    const vincUFG = D.vinculos.find(v => v.sigla === 'UFG' && /Servidor/.test(v.vinculo));
    el.innerHTML = `
      <div class="hero">
        <div>
          <h1>${esc(D.id.nome)}</h1>
          <p class="sub">Professor da Escola de Engenharia Civil e Ambiental · Universidade Federal de Goiás · docente permanente do CIAMB e do PPGEAS</p>
          <p class="bio">${esc(D.resumo)}</p>
        </div>
        <aside class="id-card" aria-label="Identificação">
          <h2>Currículo Lattes</h2>
          <div class="id-row"><span>ID Lattes</span><a href="http://lattes.cnpq.br/${D.id.lattes}" target="_blank" rel="noopener">${D.id.lattes}</a></div>
          <div class="id-row"><span>Atualizado em</span><b>${D.id.atualizado}</b></div>
          <div class="id-row"><span>Dados extraídos</span><b>${D.id.gerado}</b></div>
          <div class="id-row"><span>Servidor UFG</span><b>desde ${vincUFG ? vincUFG.ini : 2010} · dedicação exclusiva</b></div>
          <div class="cite-row">
            <div class="cite"><b>${fmt(D.citacoes.scholar.citacoes)}</b><span>citações no Google Scholar<br>${D.citacoes.scholar.trabalhos} trabalhos · ${D.citacoes.scholar.data}</span></div>
            <div class="cite"><b>${fmt(D.citacoes.wos.citacoes)}</b><span>citações na Web of Science<br>${D.citacoes.wos.trabalhos} trabalhos · ${D.citacoes.wos.data}</span></div>
          </div>
        </aside>
      </div>
      <dl class="kpis">
        <div><dt>Artigos em periódicos</dt><dd>${art}</dd></div>
        <div><dt>Capítulos de livros</dt><dd>${cap}<small>${cap - nSerie} avulsos + ${nSerie} da série “Diagnóstico técnico participativo” (2020)</small></dd></div>
        <div><dt>Trabalhos em eventos</dt><dd>${evt}</dd></div>
        <div><dt>Produção técnica</dt><dd>${tec}</dd></div>
        <div><dt>Orientações concluídas</dt><dd>${oriDone.length}<small>${oriNow.length} em andamento</small></dd></div>
        <div><dt>Participações em bancas</dt><dd>${bancas.length}</dd></div>
        <div><dt>Projetos</dt><dd>${projs.length}</dd></div>
        <div><dt>Coautores distintos</dt><dd>${D.n_coautores}</dd></div>
      </dl>
      ${sec('s-ano', 'Produção por ano', `De ${y0} a ${y1}, ${own.length} registros com data. O pico foi em ${(() => { const t = yrs.map((_, i) => sum(series, s => s.values[i])); const m = Math.max(...t); return yrs[t.indexOf(m)] + ' (' + m + ' itens)'; })()}. Em 2020 há ${nSerie} capítulos da série “Diagnóstico técnico participativo” (30 comunidades, 2 capítulos cada), mostrados em cor própria.`, '<div class="chart-area" id="c-ano"></div>')}
      <div class="two">
        ${sec('s-acum', 'Artigos acumulados', 'Soma de artigos publicados em periódicos ao longo do tempo.', '<div class="chart-area" id="c-acum"></div>')}
        ${sec('s-rh', 'Formação de recursos humanos', 'Orientações concluídas e participações em bancas por ano.', '<div class="chart-area" id="c-rh"></div>')}
      </div>
      <div class="two">
        ${sec('s-top', 'Onde publica', 'Periódicos com mais artigos.', '<div class="chart-area" id="c-per"></div>')}
        ${sec('s-temas', 'Temas recorrentes', 'Termos mais frequentes nos títulos de artigos, capítulos, eventos e orientações.', '<div class="chart-area" id="c-temas"></div>')}
      </div>`;
    APP.reg(() => {
      APP.stackedColumns($('#c-ano'), { years: yrs, series, height: 280, desc: 'Produção por ano e tipo' });
      const ay = range(y0, y1); let acc = 0; const av = ay.map(y => (acc += D.artigos.filter(a => a.ano === y).length));
      APP.cumLine($('#c-acum'), ay, av, { color: 'g1', unit: 'Artigos acumulados', height: 230 });
      const ry = range(Math.min(1996, ...ori.map(o => o.ano).filter(Boolean)), CUR);
      APP.stackedColumns($('#c-rh'), { years: ry, height: 230, series: [
        { name: 'Orientações concluídas', color: 'g1', values: ry.map(y => oriDone.filter(o => o.ano === y).length) },
        { name: 'Bancas', color: 'g3', values: ry.map(y => bancas.filter(b => b.ano === y).length) }] });
      APP.hbars($('#c-per'), count(D.artigos.filter(a => a.veiculo), a => { const t = a.veiculo.replace(/\s*\((?:[^()]*[.\s])?(?:online|print)\)|\s*\(UFG\)/gi, '').replace(/[\s.]+$/, ''); return t === t.toUpperCase() ? t.toLowerCase().replace(/(^|\s|\()(\S)/g, (m, a, b) => a + b.toUpperCase()) : t; }).slice(0, 10).map(([l, n]) => ({ label: l, value: n })), { labelW: 230, unit: 'Artigos', color: 'g1' });
      APP.hbars($('#c-temas'), D.keywords.slice(0, 12).map(k => ({ label: k.t, value: k.n })), { labelW: 130, unit: 'Ocorrências', color: 'g7' });
    });
  };

  /* ================= PRODUÇÃO ================= */
  V.producao = function () {
    const el = $('#v-producao');
    const groups = ['Artigos', 'Capítulos', 'Eventos', 'Técnica', 'Livros', 'Apresentações', 'Textos', 'Outras'];
    const cg = count(pubs, p => p.grupo); const gm = Object.fromEntries(cg);
    const ys = pubs.map(p => p.ano).filter(Boolean), Y0 = Math.min(...ys), Y1 = Math.max(...ys);
    const GL = { Artigos: 'Artigos', Capítulos: 'Capítulos', Eventos: 'Trabalhos em eventos', Técnica: 'Produção técnica', Livros: 'Livros', Apresentações: 'Apresentações', Textos: 'Textos em jornais', Outras: 'Outras' };
    el.innerHTML = `
      <div class="page-head"><h1>Produção bibliográfica e técnica</h1><p>${pubs.length} registros do Lattes. Filtre por tipo e período, ordene as colunas, busque por qualquer palavra e exporte o resultado em CSV.</p></div>
      <div class="toolbar" style="padding-top:0">
        <div class="chips" id="p-chips" role="group" aria-label="Tipo de produção"></div>
        <span style="margin-left:auto" class="muted">Período</span>
        <select class="sel" id="p-y0" aria-label="Ano inicial">${range(Y0, Y1).map(y => `<option>${y}</option>`).join('')}</select>
        <span class="muted">a</span>
        <select class="sel" id="p-y1" aria-label="Ano final">${range(Y0, Y1).reverse().map(y => `<option>${y}</option>`).join('')}</select>
      </div>
      <div id="p-table"></div>
      ${sec('s-coaut', 'Principais coautores', `Dos ${D.n_coautores} coautores distintos em artigos, capítulos e trabalhos em eventos (sem a série de 2020). Nomes foram agrupados pelo sobrenome e a inicial; pode haver homônimos.`, '<div class="chart-area" id="c-co"></div>')}
      <div class="two">
        ${sec('s-ev', 'Eventos com mais trabalhos', 'Congressos e simpósios onde foram publicados trabalhos completos e resumos.', '<div class="chart-area" id="c-ev"></div>')}
        ${sec('s-aut', 'Número de autores por item', 'Quantidade de autores nos artigos e nos trabalhos em eventos.', '<div class="chart-area" id="c-na"></div>')}
      </div>`;
    const sel = new Set(); // grupos selecionados (vazio = todos)
    const chips = $('#p-chips');
    const drawChips = () => { chips.innerHTML = `<button class="chip" data-g="" aria-pressed="${!sel.size}">Todos <span class="n">${pubs.length}</span></button>` + groups.filter(g => gm[g]).map(g => `<button class="chip" data-g="${g}" aria-pressed="${sel.has(g)}">${GL[g]} <span class="n">${gm[g]}</span></button>`).join(''); };
    drawChips();
    const y0 = $('#p-y0'), y1 = $('#p-y1'); y1.value = Y1;
    const tab = APP.table($('#p-table'), {
      rows: () => pubs, size: 15, sort: 0, dir: -1, csv: 'producao_lattes.csv', placeholder: 'Buscar por título, autor, periódico, evento…',
      pre: p => true,
      cols: [
        { label: 'Ano', k: 'ano', num: true, val: p => p.ano },
        { label: 'Tipo', k: 'tipo', render: p => `<span class="tag">${esc(p.tipo)}</span>` },
        { label: 'Título', k: 'titulo', render: p => `<b style="font-weight:600">${esc(p.titulo)}</b>${p.autAbbr ? `<span class="sub" title="${esc(p.aut)}">${esc(p.autAbbr)}</span>` : ''}`, text: p => p.titulo + (p.aut ? ' — ' + p.aut : '') },
        { label: 'Veículo / evento', k: 'veic', render: p => esc(p.veic || '') + (p.det ? `<span class="sub">${esc(p.det)}</span>` : ''), text: p => [p.veic, p.det].filter(Boolean).join(' · ') }
      ]
    });
    const apply = () => { const a = +y0.value, b = +y1.value; tab.refresh(p => (!sel.size || sel.has(p.grupo)) && (p.ano == null ? (a === Y0 && b === Y1) : (p.ano >= a && p.ano <= b))); };
    chips.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const g = b.dataset.g; if (!g) sel.clear(); else if (sel.has(g)) sel.delete(g); else sel.add(g); drawChips(); apply(); });
    y0.addEventListener('change', () => { if (+y0.value > +y1.value) y1.value = y0.value; apply(); });
    y1.addEventListener('change', () => { if (+y1.value < +y0.value) y0.value = y1.value; apply(); });
    APP.reg(() => {
      APP.hbars($('#c-co'), D.coautores.slice(0, 15).map(c => ({ label: c.nome, value: c.n, tip: `<b>${esc(c.nome)}</b><div class="r"><span>Trabalhos juntos</span><b>${c.n}</b></div><div class="r"><span>Período</span><b>${c.ini || '?'}–${c.fim || '?'}</b></div>` })), { labelW: 230, color: 'g3', unit: 'Trabalhos juntos' });
      APP.hbars($('#c-ev'), count(D.anais.filter(a => a.evento), a => a.evento.replace(/^[IVXLC]+\s*[-–]?\s*/, '').replace(/\s*\d{4}.*/, '').slice(0, 60)).slice(0, 10).map(([l, n]) => ({ label: l, value: n })), { labelW: 250, color: 'g3', unit: 'Trabalhos' });
      const na = pubs.filter(p => (p.grupo === 'Artigos' || p.grupo === 'Eventos') && p.aut); const nb = n => Math.min(8, n); const cn = new Map();
      na.forEach(p => { const k = nb(p.aut.split(';').filter(x => x.trim()).length); cn.set(k, (cn.get(k) || 0) + 1); });
      APP.hbars($('#c-na'), range(1, 8).map(k => ({ label: k === 8 ? '8 ou mais autores' : k + (k === 1 ? ' autor' : ' autores'), value: cn.get(k) || 0 })), { labelW: 120, color: 'g1', unit: 'Itens' });
    });
  };

  /* ================= ORIENTAÇÕES E BANCAS ================= */
  V.orientacoes = function () {
    const el = $('#v-orientacoes');
    const comp = ori.filter(o => /Mestrado|Doutorado/.test(o.nivel));
    const bcount = count(bancas, b => b.tipo);
    el.innerHTML = `
      <div class="page-head"><h1>Orientações e bancas</h1><p>Formação de recursos humanos: ${ori.length} orientações (${oriDone.length} concluídas, ${oriNow.length} em andamento) e ${bancas.length} participações em bancas examinadoras.</p></div>
      <dl class="kpis">
        <div><dt>Teses de doutorado</dt><dd>${ori.filter(o => o.nivel === 'Doutorado').length}<small>orientadas</small></dd></div>
        <div><dt>Dissertações de mestrado</dt><dd>${ori.filter(o => o.nivel === 'Mestrado').length}<small>orientadas</small></dd></div>
        <div><dt>Especialização</dt><dd>${ori.filter(o => o.nivel === 'Especialização').length}</dd></div>
        <div><dt>TCC e iniciação científica</dt><dd>${ori.filter(o => /TCC|Iniciação/.test(o.nivel)).length}</dd></div>
        <div><dt>Bancas de mestrado e doutorado</dt><dd>${bancas.filter(b => /Dissertação|Tese|Qualificação/.test(b.tipo)).length}<small>defesas e qualificações</small></dd></div>
        <div><dt>Bancas de TCC</dt><dd>${bancas.filter(b => b.tipo === 'TCC de graduação').length}</dd></div>
      </dl>
      <div class="two">
        ${sec('s-oy', 'Orientações por ano', 'Ano de conclusão (ou de início, nas em andamento).', '<div class="chart-area" id="c-oy"></div>')}
        ${sec('s-by', 'Bancas por ano', 'Participações em bancas por tipo.', '<div class="chart-area" id="c-by"></div>')}
      </div>
      <div class="two">
        ${sec('s-bi', 'Instituições das bancas', 'Instituição onde ocorreu a banca ou o concurso.', '<div class="chart-area" id="c-bi"></div>')}
        ${sec('s-bp', 'Programas de pós-graduação nas orientações', 'Curso ou programa dos orientandos de mestrado e doutorado.', '<div class="chart-area" id="c-bp"></div>')}
      </div>
      <section class="sec"><header><h2>Registros</h2><div class="seg" id="o-seg" role="group" aria-label="Tabela"><button data-t="o" aria-pressed="true">Orientações</button><button data-t="b" aria-pressed="false">Bancas</button></div></header>
      <div class="toolbar" style="padding-top:0"><div class="chips" id="o-chips" role="group" aria-label="Filtro por tipo"></div></div>
      <div id="o-table"></div></section>`;
    let mode = 'o', tsel = '';
    const host = $('#o-table'); let tab;
    const cOri = [
      { label: 'Ano', k: 'ano', num: true }, { label: 'Nível', k: 'nivel', render: o => `<span class="tag">${esc(o.nivel)}</span>` },
      { label: 'Estudante e título', k: 'titulo', render: o => `<b style="font-weight:600">${esc(o.aluno)}</b><span class="sub">${esc(o.titulo)}</span>`, text: o => o.aluno + ' — ' + o.titulo },
      { label: 'Programa', k: 'programa', render: o => esc(o.programa || '') + (o.instk ? `<span class="sub">${esc(o.instk)}</span>` : ''), text: o => [o.programa, o.instk].filter(Boolean).join(' · ') },
      { label: 'Situação', k: 'sit', render: o => `<span class="badge ${o.sit === 'Concluída' ? 'on' : ''}">${esc(o.sit)}</span>${o.papel === 'Coorientador' ? '<span class="sub">Coorientador</span>' : ''}`, text: o => o.sit }
    ];
    const cBan = [
      { label: 'Ano', k: 'ano', num: true }, { label: 'Tipo', k: 'tipo', render: b => `<span class="tag">${esc(b.tipo)}</span>` },
      { label: 'Candidato e título', k: 'titulo', render: b => `<b style="font-weight:600">${esc(b.aluno || b.titulo || '')}</b>${b.aluno ? `<span class="sub">${esc(b.titulo || '')}</span>` : ''}`, text: b => (b.aluno || '') + ' — ' + (b.titulo || '') },
      { label: 'Programa / instituição', k: 'programa', render: b => esc(b.programa || '') + (b.instk ? `<span class="sub">${esc(b.instk)}</span>` : ''), text: b => [b.programa, b.instk].filter(Boolean).join(' · ') }
    ];
    const chipsEl = $('#o-chips');
    const drawChips = () => { const src = mode === 'o' ? ori : bancas, key = mode === 'o' ? 'nivel' : 'tipo'; const c = count(src, x => x[key]); chipsEl.innerHTML = `<button class="chip" data-v="" aria-pressed="${!tsel}">Todos <span class="n">${src.length}</span></button>` + c.map(([k, n]) => `<button class="chip" data-v="${esc(k)}" aria-pressed="${tsel === k}">${esc(k)} <span class="n">${n}</span></button>`).join(''); };
    const build = () => { tab = APP.table(host, { rows: () => mode === 'o' ? ori : bancas, cols: mode === 'o' ? cOri : cBan, size: 12, sort: 0, dir: -1, csv: mode === 'o' ? 'orientacoes.csv' : 'bancas.csv', placeholder: 'Buscar por nome, título, programa…' }); drawChips(); };
    build();
    $('#o-seg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.t; tsel = ''; $$('#o-seg button').forEach(x => x.setAttribute('aria-pressed', x === b)); build(); });
    chipsEl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tsel = b.dataset.v; const key = mode === 'o' ? 'nivel' : 'tipo'; tab.refresh(tsel ? x => x[key] === tsel : () => true); drawChips(); });
    APP.reg(() => {
      const oy = range(Math.min(...ori.map(o => o.ano).filter(Boolean)), CUR); const niv = Object.keys(ORI_COL);
      APP.stackedColumns($('#c-oy'), { years: oy, height: 240, series: niv.map(n => ({ name: n, color: ORI_COL[n], values: oy.map(y => ori.filter(o => o.nivel === n && o.ano === y).length) })) });
      const by = range(Math.min(...bancas.map(b => b.ano).filter(Boolean)), CUR);
      APP.stackedColumns($('#c-by'), { years: by, height: 240, series: Object.keys(BAN_COL).map(n => ({ name: n, color: BAN_COL[n], values: by.map(y => bancas.filter(b => b.tipo === n && b.ano === y).length) })) });
      APP.hbars($('#c-bi'), count(bancas, b => b.instk).map(([k, n]) => ({ label: k + ' · ' + instName(k).replace(/^Universidade /, 'Univ. '), value: n })).slice(0, 10), { labelW: 250, color: 'g1', unit: 'Bancas' });
      APP.hbars($('#c-bp'), count(comp, o => (o.programa || '').replace(/^(Mestrado|Doutorado)( acadêmico| profissional)? em /i, '').replace(/^Programa de Pós-Graduação em /i, '')).slice(0, 8).map(([l, n]) => ({ label: l, value: n })), { labelW: 250, color: 'g7', unit: 'Orientações' });
    });
  };

  /* ================= TRAJETÓRIA ================= */
  V.trajetoria = function () {
    const el = $('#v-trajetoria');
    el.innerHTML = `
      <div class="page-head"><h1>Trajetória e perfil</h1><p>Formação, vínculos profissionais, projetos, cursos, prêmios e demais informações do currículo.</p></div>
      ${sec('s-tl', 'Linha do tempo', 'Cada barra é um período. Barras que chegam ao presente indicam vínculos ou projetos em andamento.', '<div class="tl-wrap"><div id="c-tl"></div></div>')}
      ${sec('s-form', 'Formação acadêmica', '', '<div class="deg" id="deg"></div>')}
      <div class="two">
        ${sec('s-vinc', 'Vínculos profissionais', 'Do mais recente ao mais antigo.', '<ul class="list" id="vinc"></ul>')}
        ${sec('s-comp', 'Formação complementar', `${D.complementar.length} cursos, ${sum(D.complementar, c => c.ch || 0)} horas no total.`, '<ul class="list" id="comp"></ul>')}
      </div>
      <div class="three">
        ${sec('s-pr', 'Prêmios e títulos', '', '<ul class="list" id="prem"></ul>')}
        ${sec('s-rev', 'Revisor de periódicos', '', '<ul class="list" id="rev"></ul>')}
        ${sec('s-idi', 'Idiomas', '', '<ul class="list" id="idi" style="grid-template-columns:1fr"></ul>')}
      </div>
      <div class="two">
        ${sec('s-linhas', 'Linhas de pesquisa', '', '<div class="chips" id="lin"></div>')}
        ${sec('s-areas', 'Áreas de atuação', '', '<ul class="list" id="are" style="gap:6px"></ul>')}
      </div>
      ${sec('s-atv', 'Atividades por vínculo', `${D.atividades.length} atividades registradas: ensino, direção, extensão, treinamentos e serviços técnicos.`, '<div id="atv-table"></div>')}
      ${sec('s-evp', 'Participação em eventos', `${D.eventos_part.length} participações em congressos, mesas-redondas e encontros.`, '<div id="evp-table"></div>')}`;
    const yr = (a, b) => `${a || '?'}–${b == null ? 'atual' : b}`;
    $('#deg').innerHTML = D.formacao.map(f => `<article class="pcard"><b>${f.ini}–${f.fim}</b><h3>${esc(f.nivel)}</h3><p>${esc(f.inst)}${f.titulo ? `<br><i>${esc(f.titulo)}</i>` : ''}</p>${f.orientador ? `<p class="muted">Orientador: ${esc(f.orientador)}</p>` : ''}</article>`).join('');
    const vs = [...D.vinculos].sort((a, b) => (b.ini || 0) - (a.ini || 0));
    $('#vinc').innerHTML = vs.map(v => `<li><time>${yr(v.ini, v.fim)}</time><span><b style="font-weight:600">${esc(v.sigla || v.inst)}</b> · ${esc(v.funcao || v.vinculo)}${v.regime ? ' · ' + esc(v.regime) : ''}${v.info ? `<br><span class="muted">${esc(v.info.slice(0, 160))}</span>` : ''}</span></li>`).join('');
    $('#comp').innerHTML = D.complementar.map(c => `<li><time>${c.ano}</time><span>${esc(c.nome)}${c.ch ? ` <span class="muted">· ${c.ch} h</span>` : ''}<br><span class="muted">${esc((c.inst || '').replace(/,\s*[A-Z]+,\s*(Brasil|Estados Unidos)$/, ''))}</span></span></li>`).join('');
    $('#prem').innerHTML = D.premios.map(p => `<li><time>${p.ano}</time><span>${esc(p.txt)}</span></li>`).join('');
    $('#rev').innerHTML = D.revisor.map(r => `<li><time>${r.ini}–${r.fim || 'atual'}</time><span>${esc(r.periodico)}</span></li>`).join('');
    $('#idi').innerHTML = D.idiomas.map(i => `<li style="grid-template-columns:90px 1fr"><b style="font-weight:600">${esc(i.idioma)}</b><span class="muted">${esc(i.niveis)}</span></li>`).join('');
    $('#lin').innerHTML = D.linhas.map(l => `<span class="chip">${esc(l)}</span>`).join('');
    $('#are').innerHTML = D.areas.map(a => `<li style="grid-template-columns:1fr">${esc(a.replace('Grande área: ', '').replace(/ \/ /g, ' › ').replace(/Área: |Subárea: |Especialidade: /g, ''))}</li>`).join('');
    APP.table($('#atv-table'), { rows: () => D.atividades, size: 10, csv: 'atividades.csv', cols: [
      { label: 'Início', k: 'ini', num: true }, { label: 'Fim', k: 'fim', num: true, render: a => a.fim == null ? 'atual' : a.fim, val: a => a.fim == null ? 9999 : a.fim },
      { label: 'Instituição', k: 'sigla', render: a => `<b style="font-weight:600">${esc(a.sigla || a.inst)}</b>` }, { label: 'Tipo', k: 'tipo', render: a => `<span class="tag">${esc(a.tipo)}</span>` },
      { label: 'Descrição', k: 'txt', render: a => esc(a.txt.replace(/^[^.]*\.\s*/, '').slice(0, 220)) } ] });
    APP.table($('#evp-table'), { rows: () => D.eventos_part, size: 10, sort: 0, dir: -1, csv: 'eventos.csv', cols: [
      { label: 'Ano', k: 'ano', num: true }, { label: 'Tipo', k: 'tipo', render: e => `<span class="tag">${esc(e.tipo)}</span>` }, { label: 'Evento e participação', k: 'txt', render: e => esc(e.txt) } ] });
    APP.reg(() => {
      const palette = ['g1', 'g2', 'g3', 'g4', 'g5', 'g7', 'g8', 'g6'];
      const lanes = [{ label: 'Formação', items: D.formacao.map(f => ({ ini: f.ini, fim: f.fim, color: 'g1', tip: `<b>${esc(f.nivel)}</b>${esc(f.sigla)} · ${f.ini}–${f.fim}` })) }];
      const bySig = new Map(); D.vinculos.forEach(v => { const k = v.sigla || v.inst; if (!bySig.has(k)) bySig.set(k, []); bySig.get(k).push(v); });
      [...bySig].sort((a, b) => Math.min(...b[1].map(v => v.ini || 9999)) - Math.min(...a[1].map(v => v.ini || 9999))).reverse().forEach(([k, arr], i) => {
        lanes.push({ label: k, items: arr.map(v => ({ ini: v.ini, fim: v.fim, color: palette[(i % 7) + 1], tip: `<b>${esc(v.funcao || v.vinculo)}</b>${esc(v.inst)}<br>${yr(v.ini, v.fim)}${v.regime ? ' · ' + esc(v.regime) : ''}` })) });
      });
      lanes.push({ label: 'Projetos de pesquisa', items: projs.filter(p => p.tipo === 'Pesquisa').map(p => ({ ini: p.ini, fim: p.fim, color: 'g3', tip: `<b>${esc(p.titulo)}</b>${yr(p.ini, p.fim)} · ${esc(p.situacao)}` })) });
      lanes.push({ label: 'Projetos de desenvolvimento', items: projs.filter(p => p.tipo === 'Desenvolvimento').map(p => ({ ini: p.ini, fim: p.fim, color: 'g4', tip: `<b>${esc(p.titulo)}</b>${yr(p.ini, p.fim)} · ${esc(p.situacao)}` })) });
      lanes.push({ label: 'Revisor de periódicos', items: D.revisor.map(r => ({ ini: r.ini, fim: r.fim, color: 'g7', tip: `<b>${esc(r.periodico)}</b>${yr(r.ini, r.fim)}` })) });
      APP.swimlane($('#c-tl'), lanes, { desc: 'Linha do tempo de formação, vínculos e projetos' });
    });
  };

  /* ================= PROJETOS ================= */
  V.projetos = function () {
    const el = $('#v-projetos');
    const fin = count(projs.filter(p => p.fin), p => p.fin.split(' - ')[0].replace(/\s*\(.*\)/, ''));
    const todos = projs.flatMap(p => p.alunos.match(/(\d+)/g) || []).length;
    el.innerHTML = `
      <div class="page-head"><h1>Projetos</h1><p>${projs.filter(p => p.tipo === 'Pesquisa').length} projetos de pesquisa e ${projs.filter(p => p.tipo === 'Desenvolvimento').length} de desenvolvimento registrados no Lattes.</p></div>
      <dl class="kpis">
        <div><dt>Em andamento</dt><dd>${projs.filter(p => /andamento/i.test(p.situacao)).length}</dd></div>
        <div><dt>Concluídos</dt><dd>${projs.filter(p => /conclu/i.test(p.situacao)).length}</dd></div>
        <div><dt>Como coordenador</dt><dd>${projs.filter(p => /Nilson Clementino Ferreira - Coordenador/.test(p.integrantes)).length}</dd></div>
        <div><dt>Financiadores</dt><dd>${fin.length}</dd></div>
      </dl>
      <div class="toolbar"><div class="chips" id="pj-chips" role="group" aria-label="Filtro"></div></div>
      <div class="cards" id="pj-cards"></div>
      ${sec('s-fin', 'Financiadores', 'Instituições citadas como financiadoras dos projetos.', '<div class="chart-area" id="c-fin"></div>')}`;
    let f = 'todos';
    const draw = () => {
      const chips = [['todos', 'Todos', projs.length], ['andamento', 'Em andamento', projs.filter(p => /andamento/i.test(p.situacao)).length], ['concluido', 'Concluídos', projs.filter(p => /conclu/i.test(p.situacao)).length]];
      $('#pj-chips').innerHTML = chips.map(([k, l, n]) => `<button class="chip" data-f="${k}" aria-pressed="${f === k}">${l} <span class="n">${n}</span></button>`).join('');
      const list = projs.filter(p => f === 'todos' || (f === 'andamento' ? /andamento/i.test(p.situacao) : /conclu/i.test(p.situacao))).sort((a, b) => b.ini - a.ini);
      $('#pj-cards').innerHTML = list.map(p => {
        const coord = (p.integrantes.split(' / ').find(x => /Coordenador/.test(x)) || '').replace(/ - Coordenador/, '');
        const eu = /Nilson Clementino Ferreira - Coordenador/.test(p.integrantes) ? 'Coordenador' : 'Integrante';
        return `<article class="pcard"><div class="when"><span>${p.ini}–${p.fim == null ? 'atual' : p.fim}</span><span class="badge ${/andamento/i.test(p.situacao) ? 'on' : ''}">${esc(p.situacao)}</span><span class="badge">${esc(p.tipo)}</span><span class="badge">${eu}</span></div>
          <h3>${esc(p.titulo)}</h3>${p.fin ? `<p><b style="font-weight:600">Financiador:</b> ${esc(p.fin)}</p>` : ''}${coord && eu !== 'Coordenador' ? `<p><b style="font-weight:600">Coordenação:</b> ${esc(coord)}</p>` : ''}${p.alunos ? `<p class="muted">Alunos: ${esc(p.alunos)}</p>` : ''}
          <details><summary>Descrição e equipe</summary><p style="margin-top:8px">${esc(p.desc.length > 900 ? p.desc.slice(0, 900) + '…' : p.desc)}</p><p class="muted" style="margin-top:8px"><b style="font-weight:600">Integrantes:</b> ${esc(p.integrantes)}</p></details></article>`;
      }).join('') || '<p class="muted">Nenhum projeto.</p>';
    };
    draw();
    $('#pj-chips').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; f = b.dataset.f; draw(); });
    APP.reg(() => APP.hbars($('#c-fin'), fin.map(([l, n]) => ({ label: l, value: n })), { labelW: 330, color: 'g4', unit: 'Projetos' }));
  };
})();
