#!/usr/bin/env node
// ============================================================
//  CIEKAWOŚĆ — build statyczny
//  Składa cały dashboard w JEDEN plik dist/ciekawosc-dashboard.html
//  z wbudowanym stanem (działa offline, np. na telefonie).
//  Uruchom:  node build.cjs   (albo: npm run build)
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const { buildState } = require('./server.js');

const ROOT = __dirname;
const P = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const state = buildState();
state.claudeAvailable = false; // tryb statyczny — bez sterowania pętlą
state.staticBuild = true;

let html = P('public/index.html');
const css = P('public/style.css');
const js = P('public/app.js');

// Funkcje zastępujące — by znaki $ / $$ w treści nie były traktowane jak wzorce String.replace.
html = html.replace('<link rel="stylesheet" href="/style.css" />', () => `<style>\n${css}\n</style>`);
html = html.replace('<script src="/app.js"></script>', () => '');

const shim = `<script>
window.__STATE__ = ${JSON.stringify(state).replace(/<\/script>/gi, '<\\/script>')};
const _f = window.fetch ? window.fetch.bind(window) : null;
window.fetch = (url, opts) => {
  if (typeof url === 'string' && url.indexOf('/api/state') === 0)
    return Promise.resolve({ ok: true, json: () => Promise.resolve(window.__STATE__) });
  if (opts && opts.method === 'POST')
    return Promise.resolve({ ok: false, status: 501, json: () => Promise.resolve({ error: 'Tryb statyczny (offline). Aby odpalać cykle uruchom: node server.js' }) });
  return _f ? _f(url, opts) : Promise.reject(new Error('offline'));
};
</script>`;

html = html.replace('</body>', () => `${shim}\n<script>\n${js}\n</script>\n</body>`);

const outDir = path.join(ROOT, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'ciekawosc-dashboard.html');
fs.writeFileSync(out, html);
console.log(`▶ Zbudowano ${path.relative(ROOT, out)} (${(html.length / 1024).toFixed(1)} KB, ${state.stats.threads} wątków, ${state.stats.totalCycles} cykli)`);
