// Works out the real chunk packet layout from live traffic by structural fit:
// a candidate header parses correctly only if the column masks account for
// every remaining byte exactly.
//
//   node test/chunk-layout.mjs mc.arch.lol

import { EaglerConnection } from '../js/handshake.js';
import { Writer, toHex } from '../js/bytes.js';

const address = process.argv[2] || 'mc.arch.lol';
const protocol = Number(process.argv[3] || 47);

const connection = new EaglerConnection({
  address,
  username: 'ApricityTest',
  minecraftProtocol: protocol,
  brand: 'ApricityEagler',
  clientVersion: '0.1.0',
});

const popcount = (n) => {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
};

function fits(bytes, metaStart, count, sectionBytes, biomeBytes) {
  if (metaStart + count * 10 > bytes.length) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let sections = 0;
  for (let i = 0; i < count; i++) {
    const base = metaStart + i * 10;
    const x = view.getInt32(base);
    const z = view.getInt32(base + 4);
    const mask = view.getUint16(base + 8);
    if (Math.abs(x) > 100000 || Math.abs(z) > 100000) return null;
    sections += popcount(mask);
  }
  const used = metaStart + count * 10 + sections * sectionBytes + count * biomeBytes;
  return used === bytes.length ? { sections } : null;
}

function search(bytes) {
  const results = [];
  for (let metaStart = 1; metaStart <= 12; metaStart++) {
    for (let count = 1; count <= 128; count++) {
      for (const [sectionBytes, biomeBytes] of [
        [12288, 256],
        [10240, 256],
        [8192, 256],
        [12288, 0],
        [10240, 0],
        [8192, 0],
      ]) {
        const fit = fits(bytes, metaStart, count, sectionBytes, biomeBytes);
        if (fit) results.push({ metaStart, count, sectionBytes, biomeBytes, sections: fit.sections });
      }
    }
  }
  return results;
}

connection.on('log', () => {});

connection.on('ready', () => {
  const payload = new Writer();
  const locale = new TextEncoder().encode('en_US');
  payload.varint(locale.length).raw(locale);
  payload.u8(8);
  payload.u8(0);
  payload.bool(true);
  payload.u8(0x7f);
  connection.sendPlayPacket(0x15, payload);
});

let bulkSeen = 0;
let chunkSeen = 0;
let chunkPackets = 0;

connection.on('play-packet', ({ id, data }) => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  if (id === 0x26 && bulkSeen < 4) {
    bulkSeen++;
    console.log(`\n0x26 bulk #${bulkSeen} len=${bytes.length}`);
    console.log(`  head ${toHex(bytes.slice(0, 8))}`);
    const results = search(bytes);
    if (!results.length) console.log('  no structural fit');
    for (const r of results.slice(0, 6)) {
      console.log(
        `  meta@${r.metaStart} count=${r.count} sections=${r.sections}` +
          ` (${r.sectionBytes}B each, ${r.biomeBytes}B biomes)`
      );
    }
    if (bulkSeen === 3 && chunkPackets === 0) {
      connection.disconnect();
      setTimeout(() => process.exit(0), 150);
    }
  }

  if (id === 0x21 && chunkPackets < 2) {
    chunkPackets++;
    console.log(`\n0x21 chunk len=${bytes.length} head ${toHex(bytes.slice(0, 12))}`);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    console.log(
      `  x=${view.getInt32(1)} z=${view.getInt32(5)} groundUp=${bytes[9]} mask=0x${view
        .getUint16(10)
        .toString(16)}`
    );
    if (bulkSeen >= 2) {
      connection.disconnect();
      setTimeout(() => process.exit(0), 150);
    }
  }
});

connection.on('error', (message) => {
  console.log(`error: ${message}`);
  process.exit(1);
});

connection.connect();
setTimeout(() => {
  console.log(`\ndone (bulk=${bulkSeen} chunk=${chunkPackets})`);
  connection.disconnect();
  setTimeout(() => process.exit(0), 150);
}, 14000);
