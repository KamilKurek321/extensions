#!/usr/bin/env node
// ============================================================
//  System CIEKAWOŚĆ — serwer Dashboardu
//  Zero zależności. Czyta pliki stanu, parsuje, serwuje JSON + UI.
//  Uruchom:  node server.js        (albo ./server.js)
//            PORT=8080 node server.js
// ============================================================
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = __dirname;
const PORT = process.env.PORT || 4711;
const PUBLIC = path.join(ROOT, 'public');

// ---------- pomocnicze ----------
const readSafe = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; }; };
const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

// Wyciąga liczbę napięcia z linii "(napięcie N)"
function parseTension(line) {
  const m = line.match(/napi[eę]cie\s*(\d)/i);
  return m ? parseInt(m[1], 10) : null;
}

// ---------- parser pliku wątku ----------
function parseThread(file) {
  const raw = readSafe(file);
  if (raw === null) return null;
  const lines = raw.split('\n');

  // Nagłówek
  const titleLine = lines.find((l) => l.startsWith('# ')) || '# ?';
  const titleMatch = titleLine.replace(/^#\s+/, '');
  const idMatch = titleMatch.match(/^(\d+)\s*[—-]\s*(.*)$/);
  const id = idMatch ? idMatch[1] : path.basename(file).split('-')[0];
  const rootQuestion = idMatch ? idMatch[2].trim() : titleMatch.trim();

  const domena = (raw.match(/^Domena:\s*(.*)$/m) || [, ''])[1].trim();
  const status = (raw.match(/^Status:\s*(.*)$/m) || [, 'OTWARTY'])[1].trim();
  const zalozony = (raw.match(/^Za[łl]o[żz]ony:\s*(.*)$/m) || [, ''])[1].trim();

  // Cykle: dziel po "## Cykl N — ..."
  const cycles = [];
  const parts = raw.split(/\n(?=##\s+Cykl\s)/);
  for (const part of parts) {
    if (!/^##\s+Cykl\s/.test(part.trim())) continue;
    const head = part.split('\n')[0];
    const cm = head.match(/##\s+Cykl\s+(\d+)\s*[—-]\s*(.*)$/);
    const num = cm ? parseInt(cm[1], 10) : cycles.length + 1;
    const question = cm ? cm[2].trim() : head.replace(/^##\s+/, '');

    const czemu = (part.match(/\*Czemu ciekawe:\*\s*(.*)/) || [, ''])[1].trim();
    const samoocena = (part.match(/\*Samoocena:\*\s*([\s\S]*?)(\n##|\n*$)/) || [, ''])[1].trim();

    // Pytania wynikające
    const branches = [];
    const branchBlock = part.split(/\*\*Pytania wynikaj[ąa]ce:\*\*/)[1];
    if (branchBlock) {
      for (const l of branchBlock.split('\n')) {
        const t = parseTension(l);
        if (t !== null && /^\s*-\s/.test(l)) {
          branches.push({
            tension: t,
            text: l.replace(/^\s*-\s*\(napi[eę]cie\s*\d\)\s*/i, '').trim(),
          });
        }
      }
    }

    // Ciało: między linią "Czemu ciekawe" a "Pytania wynikające"
    let body = part;
    body = body.replace(/^##[^\n]*\n/, '');
    body = body.replace(/^\*Czemu ciekawe:\*[^\n]*\n/m, '');
    body = body.split(/\*\*Pytania wynikaj[ąa]ce:\*\*/)[0].trim();

    // Statystyka znaczników epistemicznych
    const markers = { USTALONE: 0, WNIOSEK: 0, SPEKULACJA: 0, NIEWIADOMA: 0 };
    for (const k of Object.keys(markers)) {
      markers[k] = (part.match(new RegExp('\\[' + k + '\\]', 'g')) || []).length;
    }

    cycles.push({ num, question, czemu, body, branches, samoocena, markers });
  }

  const openBranches = [];
  if (cycles.length) {
    for (const b of cycles[cycles.length - 1].branches) openBranches.push(b);
  }
  const maxTension = openBranches.reduce((m, b) => Math.max(m, b.tension), 0);

  return { id, file: path.basename(file), rootQuestion, domena, status, zalozony, cycles, openBranches, maxTension };
}

// ---------- parser indeks / dziennik ----------
function parseDziennik() {
  const raw = readSafe(path.join(ROOT, 'dziennik.md'));
  if (!raw) return [];
  return raw.split('\n')
    .filter((l) => /^\s*-\s/.test(l))
    .map((l) => l.replace(/^\s*-\s*/, '').trim());
}

// ---------- pełny stan ----------
function buildState() {
  const wiedzaDir = path.join(ROOT, 'wiedza');
  let threads = [];
  if (exists(wiedzaDir)) {
    threads = fs.readdirSync(wiedzaDir)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => parseThread(path.join(wiedzaDir, f)))
      .filter(Boolean);
  }

  const totalCycles = threads.reduce((n, t) => n + t.cycles.length, 0);
  const openThreads = threads.filter((t) => /OTWARTY/i.test(t.status)).length;
  const maxTension = threads.reduce((m, t) => Math.max(m, t.maxTension), 0);

  const epistemic = { USTALONE: 0, WNIOSEK: 0, SPEKULACJA: 0, NIEWIADOMA: 0 };
  for (const t of threads)
    for (const c of t.cycles)
      for (const k of Object.keys(epistemic)) epistemic[k] += c.markers[k];

  return {
    generatedAt: new Date().toISOString(),
    stats: { threads: threads.length, openThreads, totalCycles, maxTension },
    epistemic,
    threads,
    dziennik: parseDziennik(),
    indeks: readSafe(path.join(ROOT, 'indeks.md')) || '',
    najlepsze: readSafe(path.join(ROOT, 'najlepsze.md')),
    seed: readSafe(path.join(ROOT, 'seed.md')) || '',
    claudeAvailable: claudeOnPath(),
  };
}

let _claudeCached = null;
function claudeOnPath() {
  if (_claudeCached !== null) return _claudeCached;
  const dirs = (process.env.PATH || '').split(path.delimiter);
  _claudeCached = dirs.some((d) => exists(path.join(d, 'claude')));
  return _claudeCached;
}

// ---------- uruchamianie cyklu (jeśli claude jest w PATH) ----------
let running = false;
function runScript(script, res) {
  if (running) { res.writeHead(409); return res.end(JSON.stringify({ error: 'Cykl już trwa' })); }
  if (!claudeOnPath()) {
    res.writeHead(501);
    return res.end(JSON.stringify({ error: 'Brak `claude` w PATH — pętli nie da się uruchomić z tej maszyny. Dashboard działa w trybie podglądu.' }));
  }
  running = true;
  const child = spawn('bash', [path.join(ROOT, script), '1'], { cwd: ROOT });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  child.on('close', (code) => {
    running = false;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: code === 0, code, log: log.slice(-4000) }));
  });
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(buildState()));
  }
  if (url.pathname === '/api/cycle' && req.method === 'POST') return runScript('loop.sh', res);
  if (url.pathname === '/api/distill' && req.method === 'POST') return runScript('verify.sh', res);

  // statyczne
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  const full = path.join(PUBLIC, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  if (!full.startsWith(PUBLIC) || !exists(full)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
  fs.createReadStream(full).pipe(res);
});

// Eksport do buildu statycznego (build.cjs) — serwer startuje tylko przy bezpośrednim uruchomieniu.
module.exports = { buildState, parseThread };

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('▶ CIEKAWOŚĆ Dashboard');
    console.log(`  http://localhost:${PORT}`);
    console.log(`  tryb: ${claudeOnPath() ? 'pełny (claude w PATH)' : 'podgląd (brak claude)'}`);
  });
}
