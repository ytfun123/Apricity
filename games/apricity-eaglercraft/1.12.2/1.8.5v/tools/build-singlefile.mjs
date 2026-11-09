// Builds the client into ONE self-contained .html that runs by double-click
// from file://, with no server and no network.
//
// Two things stop the normal build from working offline:
//
//   1. It is ES modules. Chrome refuses to load module scripts over file://
//      (CORS applies to file:// origins), so ./js/main.js never executes.
//   2. Assets are fetched. fetch() of a relative path is blocked on file://
//      too, so atlas.json / font.json / strings.json / splashes.json all fail,
//      and the client falls back to untextured colours with a warning.
//
// So this build flattens the modules into one classic script (same order the
// imports imply) and inlines every asset: PNGs become data: URIs, JSON is
// baked in as a string, and a fetch() shim keeps the call sites unchanged.
//
//   node games/apricity-eaglercraft/1.12.2/1.8.0v/tools/build-singlefile.mjs
//   -> games/apricity-eaglercraft/1.12.2/1.8.0v/apricity-eagler-offline.html

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const clientDir = resolve(here, '..');
const assetsDir = join(clientDir, 'assets');
const jsDir = join(clientDir, 'js');
const outFile = join(clientDir, 'apricity-eagler-offline.html');

// A module must appear after everything it imports. This is the import graph
// of js/, read off the import statements, not a hand-kept list that can drift.
const ORDER = [
  'bytes.js', 'sha256.js', 'compression.js', 'address.js', 'blocks.js',
  'mcfont.js', 'renderer.js', 'world.js', 'mesher.js', 'player.js',
  'auth.js', 'handshake.js', 'multiplayer.js', 'ui.js', 'main.js',
];

const failures = [];
const fail = (msg) => failures.push(msg);

// ── assets ──────────────────────────────────────────────────────────────

const assetFiles = readdirSync(assetsDir).filter((f) => statSync(join(assetsDir, f)).isFile());
const pngURIs = new Map();
const jsonText = new Map();

for (const name of assetFiles) {
  const full = join(assetsDir, name);
  const ext = extname(name).toLowerCase();
  if (ext === '.png') {
    const b64 = readFileSync(full).toString('base64');
    pngURIs.set(name, `data:image/png;base64,${b64}`);
  } else if (ext === '.json') {
    jsonText.set(name, readFileSync(full, 'utf8'));
  } else {
    fail(`unhandled asset type: ${name}`);
  }
}

// ── modules -> one classic script ───────────────────────────────────────

/** Strips import statements and the `export` keyword; keeps everything else. */
function stripModuleSyntax(src, name) {
  const lines = src.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*import\s/.test(line)) {
      // Named imports can wrap; skip to the end of the statement.
      let j = i;
      while (j < lines.length && !/;\s*$/.test(lines[j])) j++;
      if (j >= lines.length) fail(`${name}: unterminated import statement`);
      i = j;
      continue;
    }
    if (/^\s*export\s+\{/.test(line)) {
      fail(`${name}: export { … } blocks are not supported by this bundler`);
      continue;
    }
    out.push(line.replace(/^(\s*)export\s+(?=(?:const|let|var|function|class|async)\b)/, '$1'));
  }
  return out.join('\n');
}

/** Top-level declarations, so two modules can't silently collide in one scope. */
function topLevelDeclarations(src) {
  const names = new Set();
  const re = /^(?:const|let|var|class|function|async\s+function)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(src))) names.add(m[1]);
  return names;
}

const chunks = [];
const ownerOfName = new Map();

for (const name of ORDER) {
  const path = join(jsDir, name);
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch {
    fail(`missing module: js/${name}`);
    continue;
  }

  if (/\bimport\.meta\b/.test(src)) fail(`${name}: uses import.meta, which needs a module`);

  let body = stripModuleSyntax(src, name);

  // The two asset paths that are built in JS rather than written literally.
  // img.src = `./assets/atlas.png?v=${Date.now()}` — the cache-buster is
  // pointless once the bytes are in the file.
  body = body.replace(
    /`\.\/assets\/([A-Za-z0-9._-]+)\?v=\$\{Date\.now\(\)\}`/g,
    (_, file) => `__assetURI(${JSON.stringify(file)})`,
  );
  // el.style.backgroundImage = "url('./assets/atlas.png')"
  body = body.replace(
    /"url\('\.\/assets\/([A-Za-z0-9._-]+)'\)"/g,
    (_, file) => `"url('" + __assetURI(${JSON.stringify(file)}) + "')"`,
  );

  for (const decl of topLevelDeclarations(body)) {
    if (ownerOfName.has(decl)) {
      fail(`top-level name collision: "${decl}" in js/${name} and js/${ownerOfName.get(decl)}`);
    } else {
      ownerOfName.set(decl, name);
    }
  }

  chunks.push(`// ── js/${name} ${'─'.repeat(Math.max(0, 56 - name.length))}\n${body.trim()}\n`);
}

const bundle = chunks.join('\n');

// fetch('./assets/x.json') is expected and fine: the prelude below answers those
// from memory. What must not survive is a relative asset path anywhere else,
// because a data: URI is the only thing that resolves on a file:// page.
for (const m of bundle.matchAll(/\bfetch\(\s*(['"`])\.\/assets\/([^'"`?#]+)/g)) {
  if (!jsonText.has(m[2])) fail(`fetch of an asset that was never inlined: ${m[2]}`);
}
const withoutFetchCalls = bundle.replace(/\bfetch\(\s*(['"`])\.\/assets\/[^'"`]+\1/g, 'fetch(__INLINED__)');
for (const bad of withoutFetchCalls.matchAll(/['"`]\.\/assets\/([^'"`]+)['"`]/g)) {
  fail(`relative asset reference left in the bundle: ./assets/${bad[1]}`);
}

// ── prelude: the fetch shim ─────────────────────────────────────────────
//
// The call sites stay exactly as written (fetch('./assets/atlas.json')), so
// this intercepts the relative asset URLs and answers them from memory. Any
// other URL still goes to the real fetch, for multiplayer and so on.

const prelude = `(function () {
'use strict';

// ── inlined assets ────────────────────────────────────────────────────────
const __ASSET_TEXT = {
${[...jsonText].map(([n, t]) => `  ${JSON.stringify(n)}: ${JSON.stringify(t)},`).join('\n')}
};
const __ASSET_URI = {
${[...pngURIs].map(([n, u]) => `  ${JSON.stringify(n)}: ${JSON.stringify(u)},`).join('\n')}
};

function __assetURI(name) {
  const uri = __ASSET_URI[name];
  if (!uri) throw new Error('asset not inlined: ' + name);
  return uri;
}

// fetch('./assets/x.json') -> the inlined copy. Intercepting here means the
// client's own asset code needs no edits at all.
const __nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
window.fetch = function __fetch(input, init) {
  const raw = typeof input === 'string' ? input : (input && input.url) || '';
  const key = String(raw).replace(/^\\.?\\/*assets\\//, '').split(/[?#]/)[0];
  if (Object.prototype.hasOwnProperty.call(__ASSET_TEXT, key)) {
    return Promise.resolve(new Response(__ASSET_TEXT[key], {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
  }
  if (__nativeFetch) return __nativeFetch(input, init);
  return Promise.reject(new Error('fetch is unavailable in this context'));
};
`;

const epilogue = `
})();
`;

// ── bake into index.html ────────────────────────────────────────────────

let html = readFileSync(join(clientDir, 'index.html'), 'utf8');

let pngsInlined = 0;
// CSS: url("./assets/x.png") and url('./assets/x.png')
html = html.replace(/url\(\s*(['"])\.\/assets\/([A-Za-z0-9._-]+)\1\s*\)/g, (whole, _q, file) => {
  const uri = pngURIs.get(file);
  if (!uri) {
    fail(`CSS references an asset that was not inlined: ${file}`);
    return whole;
  }
  pngsInlined++;
  return `url("${uri}")`;
});
// Markup: src="./assets/gui-logo.png"
html = html.replace(/(src=)(['"])\.\/assets\/([A-Za-z0-9._-]+)\2/g, (whole, attr, _q, file) => {
  const uri = pngURIs.get(file);
  if (!uri) {
    fail(`markup references an asset that was not inlined: ${file}`);
    return whole;
  }
  pngsInlined++;
  return `${attr}"${uri}"`;
});

// One classic script. `type="module"` is exactly what file:// refuses.
const SCRIPT_TAG = '<script type="module" src="./js/main.js"></script>';
if (!html.includes(SCRIPT_TAG)) fail('index.html no longer has the module script tag');

html = html.replace(SCRIPT_TAG, `<script>\n${prelude}\n${bundle}\n${epilogue}</script>`);

if (/<script[^>]+type=["']module["']/.test(html)) fail('a module script tag survived the build');

// ── write ───────────────────────────────────────────────────────────────

if (failures.length) {
  console.error('build-singlefile: failed');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}

writeFileSync(outFile, html);

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`wrote ${outFile}`);
console.log(`  modules:  ${ORDER.length} concatenated into one classic script`);
console.log(`  json:     ${jsonText.size} files inlined (${[...jsonText.keys()].join(', ')})`);
console.log(`  images:   ${pngURIs.size} as data: URIs (${pngsInlined} references rewritten in html/css)`);
console.log(`  size:     ${kb(Buffer.byteLength(html))}`);
