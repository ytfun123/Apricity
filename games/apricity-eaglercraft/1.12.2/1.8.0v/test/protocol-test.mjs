// Headless protocol test: runs the exact modules the browser uses against real
// Eaglercraft servers, using Node's built-in WebSocket (Node 22+).
//
//   node test/protocol-test.mjs
//   node test/protocol-test.mjs mc.arch.lol
//   node test/protocol-test.mjs mc.arch.lol 47

import { createHash } from 'node:crypto';
import { sha256 } from '../js/sha256.js';
import { eaglerSHA256, SALT_BASE, SALT_SAVE } from '../js/auth.js';
import { EaglerConnection } from '../js/handshake.js';
import { toHex } from '../js/bytes.js';

const DEFAULT_SERVERS = ['mc.arch.lol', 'wss://clever-teaching.com'];

let failures = 0;

function check(condition, label, detail) {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${detail ? ` -> ${detail}` : ''}`);
  }
}

function selfTestCrypto() {
  console.log('crypto self-check');
  check(
    toHex(sha256(new TextEncoder().encode('abc'))) ===
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'sha256("abc")'
  );
  check(
    toHex(sha256(new Uint8Array(0))) ===
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'sha256("")'
  );

  // Independent re-implementation of the three-round eagler password hash.
  const salt = Uint8Array.from({ length: 64 }, (_, i) => (i * 37 + 11) & 0xff);
  const password = 'correct horse';
  const digest = (...parts) =>
    createHash('sha256')
      .update(Buffer.concat(parts.map((p) => Buffer.from(p))))
      .digest();

  const head = Buffer.alloc(2 + password.length * 2);
  head.writeUInt16BE(password.length, 0);
  for (let i = 0; i < password.length; i++) head.writeUInt16BE(password.charCodeAt(i), 2 + i * 2);

  const round1 = digest(head, Buffer.from(SALT_SAVE));
  const round2 = digest(round1, Buffer.from(salt.subarray(0, 32)), Buffer.from(SALT_BASE));
  const expected = digest(round2, Buffer.from(salt.subarray(32, 64)), Buffer.from(SALT_BASE));

  check(toHex(eaglerSHA256(password, salt)) === expected.toString('hex'), 'eaglerSHA256 matches reference');
}

function runOne(address, minecraftProtocol, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const connection = new EaglerConnection({
      address,
      username: 'ApricityTest',
      minecraftProtocol,
      brand: 'ApricityEagler',
      clientVersion: '0.1.0',
    });

    let settled = false;
    const steps = { version: false, allow: false, ready: false, joined: false };
    let mismatchGames = null;
    const packets = new Set();

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        connection.disconnect();
      } catch {
        /* already closed */
      }
      setTimeout(() => resolve({ ...result, steps, packets: [...packets], mismatchGames }), 150);
    };

    const timer = setTimeout(() => finish({ ok: false, reason: 'timed out' }), timeoutMs);

    connection.on('log', (message) => console.log(`    | ${message}`));
    connection.on('server-version', () => {
      steps.version = true;
    });
    connection.on('allow-login', () => {
      steps.allow = true;
    });
    connection.on('joined', () => {
      steps.joined = true;
    });
    connection.on('packet', (packet) => packets.add(packet.name));
    connection.on('version-mismatch', (info) => {
      mismatchGames = info.gameVersions;
    });
    connection.on('ready', () => {
      steps.ready = true;
      // Let a couple of seconds of play packets arrive, then report.
      setTimeout(() => finish({ ok: true }), 4000);
    });
    connection.on('error', (message) => finish({ ok: false, reason: message }));

    try {
      connection.connect();
    } catch (err) {
      finish({ ok: false, reason: err.message });
    }
  });
}

async function main() {
  selfTestCrypto();

  if (typeof WebSocket === 'undefined') {
    console.log('\nThis Node build has no global WebSocket (needs Node 22+), skipping live server test.');
    process.exit(failures === 0 ? 0 : 1);
  }

  const servers = process.argv[2] ? [process.argv[2]] : DEFAULT_SERVERS;
  const offered = Number(process.argv[3] || 47);

  for (const server of servers) {
    console.log(`\nlive handshake: ${server} (offering minecraft ${offered})`);
    let result = await runOne(server, offered);

    // A 1.20-era server reports which game protocols it accepts; retry with one.
    if (!result.ok && result.mismatchGames?.length && !process.argv[3]) {
      const retry = result.mismatchGames[0];
      console.log(`  server only accepts minecraft ${result.mismatchGames.join('/')}, retrying with ${retry}`);
      result = await runOne(server, retry);
    }

    if (result.ok) {
      console.log(`  reached play state as ${result.steps.allow ? 'accepted player' : 'player'}`);
      console.log(`  play packets seen: ${result.packets.join(', ') || '(none)'}`);
      check(result.steps.ready, 'finished login');
    } else {
      console.log(`  could not complete: ${result.reason}`);
      check(result.steps.version, 'server answered the handshake');
    }
  }

  console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
