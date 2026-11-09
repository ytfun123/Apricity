// Dumps the raw leading bytes of play packets so the parser can be checked
// against what the server actually sends instead of against a guess.
//
//   node test/chunk-dump.mjs mc.arch.lol

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

const NAMES = {
  0x00: 'KeepAlive', 0x01: 'JoinGame', 0x02: 'ChatMessage', 0x03: 'TimeUpdate',
  0x05: 'SpawnPosition', 0x07: 'Respawn', 0x08: 'PosLook', 0x21: 'ChunkData',
  0x26: 'MapChunkBulk', 0x3f: 'PluginMessage', 0x46: 'SetCompression',
};

let seen = 0;
const counts = new Map();

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
  const key = `0x${id.toString(16)}`;
  counts.set(key, (counts.get(key) || 0) + 1);

  const looksDuplicated = data.length > 0 && data[0] === id;
  if (seen < 26 || id === 0x26 || id === 0x21) {
    console.log(
      `0x${id.toString(16).padStart(2, '0')} ${(NAMES[id] || '').padEnd(14)} len=${String(data.length).padStart(6)}` +
        `  first=${data[0]} dupId=${looksDuplicated}  ${toHex(data.slice(0, 16))}`
    );
    seen++;
  }

  if (counts.get('0x26') && counts.get('0x21') && seen > 24) {
    console.log('\ncounts:', [...counts].map(([k, v]) => `${k}x${v}`).join(' '));
    connection.disconnect();
    setTimeout(() => process.exit(0), 150);
  }
});

connection.on('error', (message) => {
  console.log(`error: ${message}`);
  process.exit(1);
});

connection.connect();
setTimeout(() => {
  console.log('\ncounts:', [...counts].map(([k, v]) => `${k}x${v}`).join(' '));
  connection.disconnect();
  setTimeout(() => process.exit(0), 150);
}, 12000);
