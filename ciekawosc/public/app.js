'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const EPI = { USTALONE: 'USTALONE', WNIOSEK: 'WNIOSEK', SPEKULACJA: 'SPEKULACJA', NIEWIADOMA: 'NIEWIADOMA' };

// Kolorowanie znaczników [USTALONE] itd. w tekście
function markEpistemic(text) {
  let html = esc(text);
  for (const k of Object.keys(EPI)) {
    html = html.replace(new RegExp('\\[' + k + '\\]', 'g'), `<span class="mk ${k}">${k}</span>`);
  }
  return html;
}

// body -> akapity, z bold **...** i znacznikami
function renderBody(text) {
  return text.split(/\n\s*\n/).map((para) => {
    let h = markEpistemic(para.trim());
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    return `<p>${h}</p>`;
  }).join('');
}

// Minimalny renderer markdown dla paneli prozą (tabele, listy, nagłówki)
function md(text) {
  if (!text) return '<div class="empty">— pusto —</div>';
  const lines = text.split('\n');
  let out = '', i = 0;
  while (i < lines.length) {
    const l = lines[i];
    // tabela
    if (/^\s*\|/.test(l) && /^\s*\|/.test(lines[i + 1] || '') && /-/.test(lines[i + 1] || '')) {
      const head = l.split('|').slice(1, -1).map((c) => c.trim());
      i += 2;
      let rows = '';
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => inline(c.trim()));
        rows += '<tr>' + cells.map((c) => `<td>${c}</td>`).join('') + '</tr>';
        i++;
      }
      out += '<table><thead><tr>' + head.map((h) => `<th>${esc(h)}</th>`).join('') + '</tr></thead><tbody>' + rows + '</tbody></table>';
      continue;
    }
    if (/^###\s/.test(l)) { out += `<h3>${inline(l.replace(/^###\s/, ''))}</h3>`; i++; continue; }
    if (/^##\s/.test(l)) { out += `<h2>${inline(l.replace(/^##\s/, ''))}</h2>`; i++; continue; }
    if (/^#\s/.test(l)) { out += `<h1>${inline(l.replace(/^#\s/, ''))}</h1>`; i++; continue; }
    if (/^>\s?/.test(l)) { out += `<blockquote>${inline(l.replace(/^>\s?/, ''))}</blockquote>`; i++; continue; }
    if (/^\s*[-*]\s/.test(l)) {
      let items = '';
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) { items += `<li>${inline(lines[i].replace(/^\s*[-*]\s/, ''))}</li>`; i++; }
      out += `<ul>${items}</ul>`;
      continue;
    }
    if (l.trim() === '') { i++; continue; }
    out += `<p>${inline(l)}</p>`; i++;
  }
  return out;
}
function inline(s) {
  let h = markEpistemic(s);
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/„([^"]+)"/g, '„<em>$1</em>"');
  return h;
}

function statusChip(t) {
  if (/WYCZERPANY/i.test(t.status)) return '<span class="chip exhausted">⌀ wyczerpany</span>';
  if (/S[ŁL]ABY/i.test(t.status)) return '<span class="chip weak">⚠ słaby</span>';
  return '<span class="chip open">● otwarty</span>';
}

function renderThread(t) {
  const cycles = t.cycles.map((c) => `
    <div class="cycle">
      <div class="cnum">Cykl ${c.num}</div>
      <h4>${esc(c.question)}</h4>
      ${c.czemu ? `<div class="czemu">${esc(c.czemu)}</div>` : ''}
      <div class="body">${renderBody(c.body)}</div>
      ${c.branches.length ? `<div class="branches">${c.branches.map((b) => `
        <div class="branch"><span class="tflag t${b.tension}">${b.tension}</span><span>${esc(b.text)}</span></div>`).join('')}</div>` : ''}
      ${c.samoocena ? `<div class="samoocena"><b>samoocena</b> — ${esc(c.samoocena)}</div>` : ''}
    </div>`).join('');

  const pct = (t.maxTension / 5) * 100;
  return `
    <article class="thread" data-id="${t.id}">
      <header>
        <span class="tid">${esc(t.id)}</span>
        <div class="thead-main">
          <h3>${esc(t.rootQuestion)}</h3>
          <div class="meta">
            <span class="chip dom">${esc(t.domena)}</span>
            ${statusChip(t)}
            <span class="chip">${t.cycles.length} ${t.cycles.length === 1 ? 'cykl' : 'cykli'}</span>
            <span class="tens">napięcie gałęzi <span class="bar"><i style="width:${pct}%"></i></span> ${t.maxTension}/5</span>
          </div>
        </div>
        <span class="caret">▶</span>
      </header>
      <div class="cycles">${cycles}</div>
    </article>`;
}

function epiBar(e) {
  const total = Object.values(e).reduce((a, b) => a + b, 0) || 1;
  const map = { USTALONE: '--ust', WNIOSEK: '--wni', SPEKULACJA: '--spe', NIEWIADOMA: '--nie' };
  return Object.entries(e).map(([k, v]) =>
    `<span style="width:${(v / total) * 100}%;background:var(${map[k]})" title="${k}: ${v}"></span>`).join('');
}

function renderStats(s) {
  const { stats, epistemic } = s;
  $('#stats').innerHTML = `
    <div class="stat"><div class="v">${stats.threads}</div><div class="l">Wątki</div></div>
    <div class="stat"><div class="v">${stats.openThreads}</div><div class="l">Otwarte</div></div>
    <div class="stat"><div class="v">${stats.totalCycles}</div><div class="l">Cykle łącznie</div></div>
    <div class="stat"><div class="v">${stats.maxTension}<span style="font-size:16px;color:var(--mut)">/5</span></div><div class="l">Maks. napięcie</div></div>
    <div class="stat" style="grid-column: span 1; min-width:220px">
      <div class="l" style="margin:0 0 4px">Bilans epistemiczny</div>
      <div class="epi">${epiBar(epistemic)}</div>
      <div style="font-size:11px;color:var(--mut);margin-top:8px">
        ${Object.entries(epistemic).map(([k, v]) => `${k.slice(0, 3)} ${v}`).join(' · ')}
      </div>
    </div>`;
}

function toast(msg, err) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (err ? ' err' : '');
  setTimeout(() => (t.className = ''), 4200);
}

async function load() {
  try {
    const s = await (await fetch('/api/state')).json();
    renderStats(s);

    $('#panel-watki').innerHTML = s.threads.length
      ? s.threads.map(renderThread).join('')
      : '<div class="empty">Brak wątków. Uruchom cykl, by zasiać pierwszy korzeń.</div>';

    $('#panel-najlepsze').innerHTML = s.najlepsze
      ? `<div class="prose">${md(s.najlepsze)}</div>`
      : '<div class="empty">Brak <code>najlepsze.md</code> — uruchom „⚗ Destyluj", by wyłowić najmocniejsze wnioski.</div>';

    $('#panel-dziennik').innerHTML = s.dziennik.length
      ? `<div class="prose"><h2>Dziennik iteracji</h2><ul class="timeline">${s.dziennik.map((d) => `<li>${inline(d)}</li>`).join('')}</ul></div>`
      : '<div class="empty">Dziennik pusty.</div>';

    $('#panel-ziarna').innerHTML = `<div class="prose">${md(s.seed)}</div>`;

    const badge = $('#modeBadge');
    if (s.claudeAvailable) { badge.textContent = '● tryb pełny'; badge.className = 'badge ok'; }
    else { badge.textContent = '○ podgląd'; badge.className = 'badge warn'; $('#btnCycle').title = $('#btnDistill').title = 'Wymaga `claude` w PATH na maszynie serwera'; }

    $('#ts').textContent = 'odświeżono ' + new Date(s.generatedAt).toLocaleTimeString('pl-PL');
    bindThreads();
  } catch (e) {
    toast('Błąd ładowania: ' + e.message, true);
  }
}

function bindThreads() {
  $$('.thread > header').forEach((h) => h.onclick = () => h.parentElement.classList.toggle('expanded'));
}

async function runJob(endpoint, btn, label) {
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = '… pracuje';
  toast(label + ' — uruchomiono…');
  try {
    const r = await fetch(endpoint, { method: 'POST' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'błąd');
    toast(label + ' — gotowe.');
    await load();
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.disabled = false; btn.textContent = orig;
  }
}

// tabs
$$('#tabs button').forEach((b) => b.onclick = () => {
  $$('#tabs button').forEach((x) => x.classList.remove('active'));
  $$('.panel').forEach((p) => p.classList.remove('active'));
  b.classList.add('active');
  $('#panel-' + b.dataset.tab).classList.add('active');
});

$('#btnRefresh').onclick = () => { load(); toast('Odświeżono'); };
$('#btnCycle').onclick = (e) => runJob('/api/cycle', e.target, 'Cykl ciekawości');
$('#btnDistill').onclick = (e) => runJob('/api/distill', e.target, 'Destylacja');

load();
setInterval(load, 15000); // auto-odświeżanie co 15 s
