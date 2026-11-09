// Brute-forces the 0x21 ChunkData layout from live traffic by structural fit.
//   node test/chunk-21.mjs mc.arch.lol

import { EaglerConnection } from '../js/handshake.js';
import { Writer, toHex } from '../js/bytes.js';

const address = process.argv[2] || 'mc.arch.lol';
const connection = new EaglerConnection({
  address,
  username: 'ApricityTest',
  minecraftProtocol: 47,
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

function readVarint(bytes, offset) {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (i < bytes.length && shift < 35) {
    const byte = bytes[i++];
    value |= (byte & 0x7f) << shift;
    if (!(byte & 0x80)) return { value, length: i - offset, ok: true };
    shift += 7;
  }
  return { value: 0, length: 0, ok: false };
}

function analyze(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const total = bytes.length;
  const out = [];

  for (let header = 9; header <= 16; header++) {
    for (const sky of [true, false]) {
      for (const biome of [true, false]) {
        // mask at 10, size varint somewhere after
        const mask = view.getUint16(10);
        const sections = popcount(mask);
        const sectionBytes = 8192 + 2048 + (sky ? 2048 : 0);
        const payload = sections * sectionBytes + (biome ? 256 : 0);
        const varint = readVarint(bytes, 12);
        const fits = 12 + varint.length + payload === total;
        if (fits) out.push({ header, sky, biome, mask, sections, payload, sizeField: 'varint', size: varint.value });
        const noSize = total - 12 === payload;
        if (noSize) out.push({ header, sky, biome, mask, sections, payload, sizeField: 'none' });
      }
    }
  }
  return out;
}

let seen = 0;
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

connection.on('play-packet', ({ id, data }) => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (id !== 0x21 || seen >= 5) return;
  seen++;
  console.log(`\n0x21 len=${bytes.length} head ${toHex(bytes.slice(0, 16))}`);
  const hits = analyze(bytes);
  if (!hits.length) console.log('  no layout fit');
  for (const hit of hits.slice(0, 4)) {
    console.log(
      `  mask=0x${hit.mask.toString(16)} sections=${hit.sections} sky=${hit.sky} biomes=${hit.biome}` +
        ` sizeField=${hit.sizeField}${hit.size !== undefined ? ` size=${hit.size}` : ''}`
    );
  }
  if (seen >= 5) {
    connection.disconnect();
    setTimeout(() => process.exit(0), 150);
  }
});

connection.on('error', (m) => {
  console.log('error:', m);
  process.exit(1);
});

connection.connect();
setTimeout(() => {
  console.log(`done (${seen} chunk packets)`);
  connection.disconnect();
  setTimeout(() => process.exit(0), 150);
}, 14000);
