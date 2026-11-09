// A stand-in Eaglercraft server for the tests: one WebSocket endpoint, the
// login handshake, and enough 1.8 play packets for a client to stand in a
// world. It records every packet the client sends, so tests can assert the
// exact bytes rather than trusting a live server's tolerance.
//
//   node test/mock-server.mjs        # runs a server and logs what arrives
//
// Nothing here is a relay or a proxy: it is the server the client talks to,
// which is also how the real thing works.

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MC_PROTOCOL = 47; // 1.8, which is what every Eaglercraft server speaks
const EAGLER_PROTOCOL = 5;

// ── tiny WebSocket framing ─────────────────────────────────────────────────

const acceptKey = (key) => createHash('sha1').update(key + GUID).digest('base64');

function encodeFrame(payload) {
  const body = Buffer.from(payload);
  const length = body.length;
  let header;
  // 0x82: FIN + binary. 0x81 would be a text frame, which a Minecraft client
  // rightly ignores.
  if (length < 126) {
    header = Buffer.from([0x82, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x82;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x82;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  return Buffer.concat([header, body]);
}

function encodeControl(opcode, payload) {
  return Buffer.concat([Buffer.from([0x80 | opcode, payload.length]), Buffer.from(payload)]);
}

/** One frame off the front of `buffer`, or null when it is not all here yet. */
function readFrame(buffer) {
  if (buffer.length < 2) return null;
  const opcode = buffer[0] & 0x0f;
  const masked = (buffer[1] & 0x80) !== 0;
  let length = buffer[1] & 0x7f;
  let offset = 2;
  if (length === 126) {
    if (buffer.length < offset + 2) return null;
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    if (buffer.length < offset + 8) return null;
    length = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }
  let mask = null;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    mask = buffer.subarray(offset, offset + 4);
    offset += 4;
  }
  if (buffer.length < offset + length) return null;
  const payload = Buffer.from(buffer.subarray(offset, offset + length));
  if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
  return { opcode, payload, total: offset + length };
}

// ── packet building ────────────────────────────────────────────────────────

const u8 = (value) => Buffer.from([value & 0xff]);
const u16 = (value) => {
  const out = Buffer.alloc(2);
  out.writeUInt16BE(value & 0xffff);
  return out;
};
const u32 = (value) => {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value >>> 0);
  return out;
};
const i32 = (value) => {
  const out = Buffer.alloc(4);
  out.writeInt32BE(value);
  return out;
};
const f32 = (value) => {
  const out = Buffer.alloc(4);
  out.writeFloatBE(value);
  return out;
};
const f64 = (value) => {
  const out = Buffer.alloc(8);
  out.writeDoubleBE(value);
  return out;
};
const varint = (value) => {
  const bytes = [];
  let v = value;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (v !== 0);
  return Buffer.from(bytes);
};
const str8 = (text) => Buffer.concat([u8(text.length), Buffer.from(text, 'latin1')]);

function serverVersion() {
  return Buffer.concat([
    u8(0x02),
    u16(EAGLER_PROTOCOL),
    u16(MC_PROTOCOL),
    str8('MockEagler'),
    str8('1.0.0'),
    u8(0x00), // auth method none
    u16(0), // no salt
    u8(0), // nickname selection off: the server assigns the name
  ]);
}

function allowLogin(username) {
  return Buffer.concat([
    u8(0x05),
    str8(username),
    u32(0), // uuid high (eight bytes)
    u32(0),
    u32(0), // uuid low
    u32(0),
    varint(0), // no optional capabilities
    u8(0), // no extended capabilities
  ]);
}

function joinGame() {
  return Buffer.concat([
    u8(0x01),
    i32(7), // entity id
    u8(1), // gamemode: creative
    u8(0), // dimension overworld
    u8(0), // difficulty
    u8(20), // max players
    str8('default'),
    u8(1), // reduced debug info
  ]);
}

function positionAndLook(x, y, z) {
  return Buffer.concat([u8(0x08), f64(x), f64(y), f64(z), f32(0), f32(0), u8(0)]);
}

function chat(text) {
  const json = Buffer.from(JSON.stringify({ text }), 'utf8');
  return Buffer.concat([u8(0x02), varint(json.length), json]);
}

/** MapChunkBulk with two full sections of stone: the layout our client reads. */
function chunkBulk(cx, cz, mask = 0x0003) {
  const parts = [u8(0x26), u8(0x01) /* sky light present */, varint(1), i32(cx), i32(cz), u16(mask)];
  const section = Buffer.alloc(4096 * 2 + 2048 + 2048);
  for (let i = 0; i < 4096; i++) section.writeUInt16LE(1 << 4, i * 2); // stone
  section.fill(0xff, 4096 * 2, section.length); // full block and sky light
  for (let bit = 0; bit < 16; bit++) if (mask & (1 << bit)) parts.push(section);
  parts.push(Buffer.alloc(256, 1)); // biome array
  return Buffer.concat(parts);
}

// ── server ─────────────────────────────────────────────────────────────────

export async function startMockServer({ username = 'Tester' } = {}) {
  // Play packets only: the handshake reuses ids (0x01 client version, 0x07
  // profile data) that would otherwise be mistaken for play traffic.
  const received = [];
  const handshake = [];
  const waiters = [];
  let socket = null;
  let inPlay = false;

  const server = createServer((req, res) => {
    res.writeHead(426, { 'content-type': 'text/plain' }).end('websocket only');
  });

  const pump = () => {
    for (let i = waiters.length - 1; i >= 0; i--) {
      const waiter = waiters[i];
      const matches = received.filter((packet) => packet.id === waiter.id);
      if (matches.length < waiter.count) continue;
      waiters.splice(i, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(matches.slice(0, waiter.count));
    }
  };

  const send = (payload) => {
    if (socket && !socket.destroyed) socket.write(encodeFrame(payload));
  };

  const onPacket = (bytes) => {
    const packet = { id: bytes[0], bytes };
    (inPlay ? received : handshake).push(packet);
    if (inPlay) pump();

    if (inPlay) return;
    if (packet.id === 0x01) {
      send(serverVersion());
    } else if (packet.id === 0x04) {
      send(allowLogin(username));
    } else if (packet.id === 0x08) {
      // The client finished login: enter play and hand it a world.
      inPlay = true;
      send(u8(0x09));
      send(joinGame());
      send(positionAndLook(8.5, 70, 8.5));
      send(chat('Welcome to the mock server'));
      send(chunkBulk(0, 0));
      send(Buffer.concat([u8(0x00), varint(42)])); // keepalive the client must echo
    }
  };

  server.on('upgrade', (req, incoming) => {
    const key = req.headers['sec-websocket-key'] || '';
    socket = incoming;
    socket.setNoDelay(true);
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`
    );

    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const frame = readFrame(buffer);
        if (!frame) break;
        buffer = buffer.subarray(frame.total);
        if (frame.opcode === 0x08) {
          socket.end();
          return;
        }
        if (frame.opcode === 0x09) {
          socket.write(encodeControl(0x0a, frame.payload));
          continue;
        }
        if (frame.opcode === 0x01 || frame.opcode === 0x02) onPacket(frame.payload);
      }
    });
    socket.on('error', () => {});
    socket.on('close', () => {});
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    port,
    url: `ws://127.0.0.1:${port}/`,
    received,
    handshake,
    /** Wait until `count` packets with this id have arrived. */
    waitFor(id, count = 1, timeoutMs = 4000) {
      const ready = received.filter((packet) => packet.id === id);
      if (ready.length >= count) return Promise.resolve(ready.slice(0, count));
      return new Promise((resolve, reject) => {
        const waiter = { id, count, resolve, timer: null };
        waiter.timer = setTimeout(() => {
          const at = waiters.indexOf(waiter);
          if (at >= 0) waiters.splice(at, 1);
          reject(
            new Error(
              `timed out waiting for ${count}x packet 0x${id.toString(16)} ` +
                `(saw ${received.map((p) => '0x' + p.id.toString(16)).join(', ')})`
            )
          );
        }, timeoutMs);
        waiters.push(waiter);
      });
    },
    close() {
      try {
        socket?.end();
      } catch {
        /* already gone */
      }
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

// Run directly: log every packet the client sends, for eyeballing a session.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mock = await startMockServer();
  console.log(`mock server listening on ${mock.url}`);
  setInterval(() => {
    for (const packet of mock.received.splice(0)) {
      console.log(`0x${packet.id.toString(16).padStart(2, '0')} ${packet.bytes.length} B ${packet.bytes.toString('hex')}`);
    }
  }, 300);
}
