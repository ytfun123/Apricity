#!/usr/bin/env node
/**
 * API tester (interactive)
 *
 *   1. paste an API key, press Enter      (characters are masked)
 *   2. paste a URL, press Enter           (a bare project URL is expanded)
 *
 * Sends ONE GET request with the key, then prints the status, the response
 * body and a plain-English verdict. The key is never printed and never
 * appears in your shell history, because it is read from the prompt rather
 * than from the command line.
 *
 * Run:    node system/api-tester.mjs
 *         node system/api-tester.mjs --bearer     also send Authorization: Bearer <key>
 *
 * --bearer reproduces clients that put the key in the Authorization header,
 * which the new sb_ keys do NOT support (they are not JWTs).
 */

const FORCE_BEARER = process.argv.includes('--bearer');
const TIMEOUT_MS = 20000;
const MAX_BODY = 4000;

// ---------------------------------------------------------------- prompts

let pipedLines = null;

/** Non-interactive runs (piped input): read every line up front, then hand them out. */
async function readAllStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').split(/\r?\n/);
}

/** Read one line with echo suppressed, so a pasted key stays off the screen. */
function maskedAsk(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let buffer = '';

    const finish = (value) => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
      resolve(value);
    };

    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish(buffer);
        if (ch === '\u0003') { // Ctrl+C
          process.stdout.write('\n');
          try { stdin.setRawMode(false); } catch {}
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          if (buffer.length) {
            buffer = buffer.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        buffer += ch;
        process.stdout.write('*');
      }
    };

    stdin.on('data', onData);
  });
}

/** Same reader, but echoes what you type — used for the URL prompt. */
function visibleAsk(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let buffer = '';

    const finish = (value) => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
      resolve(value);
    };

    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish(buffer);
        if (ch === '\u0003') {
          process.stdout.write('\n');
          try { stdin.setRawMode(false); } catch {}
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          if (buffer.length) {
            buffer = buffer.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        buffer += ch;
        process.stdout.write(ch);
      }
    };

    stdin.on('data', onData);
  });
}

async function ask(question, { mask = false } = {}) {
  if (!process.stdin.isTTY) {
    if (pipedLines === null) pipedLines = await readAllStdin();
    const answer = pipedLines.length ? pipedLines.shift() : '';
    process.stdout.write(question + (mask ? '*'.repeat(answer.length) : answer) + '\n');
    return answer;
  }
  return mask ? maskedAsk(question) : visibleAsk(question);
}

// ------------------------------------------------------------ inspection

function keyType(key) {
  if (!key) return 'none';
  if (key.startsWith('sb_publishable_')) return 'publishable key (new format — RLS applies)';
  if (key.startsWith('sb_secret_')) return 'secret key (new format — bypasses RLS)';
  if (key.startsWith('sb_')) return 'unrecognised sb_ subtype';
  if (key.startsWith('eyJ')) return 'legacy JWT (anon / service_role)';
  return 'unrecognised format (not a Supabase key)';
}

function keyFingerprint(key) {
  if (!key) return '(empty)';
  if (key.startsWith('sb_secret_')) return 'sb_secret_' + key.slice(10, 16) + '…';
  if (key.startsWith('sb_publishable_')) return 'sb_publishable_' + key.slice(15, 21) + '…';
  return key.slice(0, 6) + '…';
}

/**
 * Strip terminal noise that can ride along with a paste. Bracketed pastes arrive
 * as ESC[200~ ... ESC[201~, and a stray control character is enough to make a
 * perfectly good URL fail to parse.
 */
function cleanInput(value) {
  return String(value || '')
    .replace(/\u001b\[[0-9;?]*[\x20-\x2f]*[\x40-\x7e]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
}

function normalizeUrl(input) {
  const cleaned = cleanInput(input);
  if (!cleaned) return '';

  // Rebuild the scheme instead of trusting what was pasted, so "host",
  // "https:/host" and even "https://https://host" all collapse to one clean
  // scheme rather than being prefixed a second time.
  let scheme = 'https';
  let rest = cleaned;
  for (;;) {
    const schemeMatch = rest.match(/^(https?):\/*/i);
    if (!schemeMatch) break;
    scheme = schemeMatch[1].toLowerCase();
    rest = rest.slice(schemeMatch[0].length).replace(/^\/+/, '');
  }
  if (!rest) return '';

  const url = `${scheme}://${rest}`;
  try {
    const parsed = new URL(url);
    // A bare project URL (or just the host) gets a harmless users probe.
    if (parsed.pathname === '/' || parsed.pathname === '') {
      parsed.pathname = '/rest/v1/users';
      parsed.search = '?limit=1';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function prettyBody(text, contentType) {
  if (!text) return '(empty body)';
  let out = text;
  if (String(contentType || '').includes('json')) {
    try { out = JSON.stringify(JSON.parse(text), null, 2); } catch { /* leave as-is */ }
  }
  if (out.length > MAX_BODY) return out.slice(0, MAX_BODY) + `\n… (${text.length} bytes total)`;
  return out;
}

function verdict(status, body, sentBearer, type) {
  const text = String(body || '');
  const lower = text.toLowerCase();
  const lines = [];

  if (status === 0) {
    lines.push('The request never got an HTTP response — check the URL, DNS and your connection.');
    return lines;
  }

  if (status >= 200 && status < 300) {
    lines.push('Working. The key is valid for this project and the path is reachable.');
    if (type.includes('secret')) {
      lines.push('Reminder: a secret key bypasses Row Level Security. Anyone who can reach');
      lines.push('whatever holds it can read and write every row.');
    }
    return lines;
  }

  if (lower.includes('unregistered api key')) {
    lines.push('The gateway does not recognise this key as belonging to this project.');
    lines.push('');
    lines.push('Most likely, in order:');
    lines.push('  1. The key was deleted or rotated in Supabase, but the deployed server');
    lines.push('     still holds the old value — env changes need a redeploy.');
    lines.push('  2. The URL is a different Supabase project than the one that issued');
    lines.push('     the key. Compare the project ref in the hostname.');
    lines.push('  3. The value was pasted with a quote, a space or a newline wrapped');
    lines.push('     around it (this tool trims, your host\'s env var may not).');
    return lines;
  }

  if (lower.includes('invalid api key')) {
    lines.push('The key is malformed or belongs to another project.');
    lines.push('Re-copy it with the dashboard copy button — do not retype it.');
    return lines;
  }

  if (lower.includes('jwt') || lower.includes('signature')) {
    lines.push('The key was rejected as a JWT.');
    if (sentBearer) {
      lines.push('This tool sent it as "Authorization: Bearer". New sb_ keys are not');
      lines.push('JWTs — retry without --bearer and it should pass.');
    } else {
      lines.push('Check that the project has not been migrated to the new key format');
      lines.push('while your app is still sending a legacy key.');
    }
    return lines;
  }

  if (status === 403) {
    lines.push('The key was accepted but the request is not permitted.');
    lines.push('Typical causes: Row Level Security has no policy for this row or role,');
    lines.push('a missing GRANT, or a publishable key hitting an endpoint that requires');
    lines.push('a secret key (for example the /rest/v1/ schema root).');
    return lines;
  }

  if (status === 404) {
    lines.push('The endpoint does not exist. Check the path (tables are case sensitive)');
    lines.push('and that PostgREST is enabled on this project.');
    return lines;
  }

  if (status === 429) {
    lines.push('Rate limited. Wait and retry — repeated runs of this tool count too.');
    return lines;
  }

  if (status >= 500) {
    lines.push('The server failed, not your key. Check the project\'s logs and status page.');
    return lines;
  }

  return lines;
}

// ----------------------------------------------------------------- flow

function banner() {
  console.log('');
  console.log('  API tester');
  console.log('  ─────────────────────────────────────────────');
  console.log('  Paste a key, press Enter, then paste a URL.');
  console.log('  The key is masked and never written to history.');
  if (FORCE_BEARER) console.log('  Mode: also sending Authorization: Bearer <key>');
  console.log('');
}

async function runOnce(key, rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return console.log('  No URL given, nothing sent.\n');
  if (url !== String(rawUrl).trim()) console.log(`  Using: ${url}`);

  const sentBearer = FORCE_BEARER || key.startsWith('eyJ');
  const headers = { apikey: key };
  if (sentBearer) headers.Authorization = `Bearer ${key}`;

  console.log(`  Sending GET …`);
  console.log(`    apikey        ${keyFingerprint(key)}   (${keyType(key)})`);
  console.log(`    Authorization ${sentBearer ? 'Bearer <key>' : '(not sent)'}`);
  console.log('');

  const started = Date.now();
  let status = 0;
  let statusText = '';
  let body = '';
  let contentType = '';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timer);
    status = res.status;
    statusText = res.statusText || '';
    contentType = res.headers.get('content-type') || '';
    body = await res.text();
  } catch (err) {
    const ms = Date.now() - started;
    const reason = err && err.name === 'AbortError'
      ? `timed out after ${TIMEOUT_MS / 1000}s`
      : String((err && err.cause && err.cause.code) || err.message || err);
    console.log(`  No response after ${ms}ms — ${reason}\n`);
    if (/INVALID_URL/i.test(reason)) {
      console.log(`  The URL was rejected as malformed. Received: ${JSON.stringify(url)}\n`);
    }
    for (const line of verdict(0, '', sentBearer, keyType(key))) console.log('  ' + line);
    console.log('');
    return;
  }

  const ms = Date.now() - started;
  const ok = status >= 200 && status < 300;
  console.log(`  ${ok ? '✓' : '✗'}  HTTP ${status} ${statusText}   (${ms}ms)`);
  if (contentType) console.log(`     content-type: ${contentType}`);
  console.log('');
  console.log('  ── body ──────────────────────────────────────');
  for (const line of prettyBody(body, contentType).split('\n')) console.log('  ' + line);
  console.log('  ──────────────────────────────────────────────');
  console.log('');

  const notes = verdict(status, body, sentBearer, keyType(key));
  if (notes.length) {
    console.log('  What this means:');
    for (const line of notes) console.log('  ' + line);
    console.log('');
  }
}

async function main() {
  if (!process.stdin.isTTY) {
    console.log('  (non-interactive input — key echo is not masked)');
  }
  banner();

  const rawKey = await ask('  API key: ', { mask: true });
  const key = cleanInput(rawKey);
  if (!key) {
    console.log('  No key given, exiting.');
    return;
  }
  if (key !== rawKey) console.log('  (trimmed stray whitespace from the key)');

  for (;;) {
    const url = await ask('  URL: ');
    await runOnce(key, url);
    const again = (await ask('  Test another URL with this key? [y/N]: ')).trim().toLowerCase();
    if (again !== 'y' && again !== 'yes') break;
  }

  console.log('  Done.');
}

main()
  .catch((err) => {
    console.error('\n  Failed: ' + (err && err.message ? err.message : err));
    process.exitCode = 1;
  });
