// Multiplayer bridge: runs the handshake/login client, then decodes the 1.8
// play packets that matter for standing in a real world — chunk data, position
// sync, chat and block changes.

import { EaglerConnection } from './handshake.js';
import { Reader, Writer } from './bytes.js';
import { CHUNK_VOLUME } from './world.js';

const SKY_LIGHT_FIELDS = 2048;

/**
 * 1.8 packs a block position into one long: 26 bits of x, 12 of y, 26 of z.
 * The play packets below (0x07 PlayerDigging) and the ones we read
 * (0x23 BlockChange) share it, so placing it here keeps both ends in one place.
 */
export function packPosition(x, y, z) {
  return (
    (BigInt(x & 0x3ffffff) << 38n) |
    (BigInt(y & 0xfff) << 26n) |
    BigInt(z & 0x3ffffff)
  );
}

/**
 * 1.8's face order, used by both digging and placement: 0 -Y, 1 +Y, 2 -Z, 3 +Z,
 * 4 -X, 5 +X. Our raycast hands back a face normal, so map it once here.
 */
export function faceIndex(face) {
  const [x, y, z] = face;
  if (y < 0) return 0;
  if (y > 0) return 1;
  if (z < 0) return 2;
  if (z > 0) return 3;
  if (x < 0) return 4;
  if (x > 0) return 5;
  return 2;
}

function readSection(reader, chunk, baseY, hasSkyLight) {
  const ids = reader.take(4096 * 2);
  for (let i = 0; i < 4096; i++) {
    const raw = ids[i * 2] | (ids[i * 2 + 1] << 8);
    const id = (raw >> 4) & 0xfff;
    if (!id) continue;
    const localY = i >> 8;
    chunk[((baseY + localY) << 8) | (i & 255)] = id > 255 ? 1 : id;
  }
  reader.take(SKY_LIGHT_FIELDS); // block light
  if (hasSkyLight) reader.take(SKY_LIGHT_FIELDS);
}

export class MultiplayerSession {
  constructor({ address, username, password = null, minecraftProtocol = 47, world, handlers = {} }) {
    this.address = address;
    this.username = username;
    this.world = world;
    this.handlers = handlers;
    this.joined = false;
    this.connected = false;

    this.connection = new EaglerConnection({
      address,
      username,
      password,
      minecraftProtocol,
      brand: 'ApricityEagler',
      clientVersion: '0.1.0',
    });

    this.connection.on('log', (line) => handlers.onLog?.(line));
    this.connection.on('server-version', (server) => handlers.onStatus?.(`connected to ${server.brand || 'server'}`));
    this.connection.on('allow-login', (player) => handlers.onStatus?.(`logged in as ${player.username}`));
    this.connection.on('ready', () => this._onReady());
    this.connection.on('joined', (info) => this._onJoin(info));
    this.connection.on('play-packet', (packet) => this._onPlayPacket(packet));
    this.connection.on('error', (message) => handlers.onKick?.(message));
    this.connection.on('close', () => {
      if (this.joined) handlers.onKick?.('connection closed');
    });
  }

  connect() {
    this.connection.connect();
  }

  disconnect() {
    this.connection.disconnect();
  }

  _onReady() {
    this.connected = true;
    this.connection.sendPlayPacket(0x15, this._clientSettings());
    this.connection.sendPlayPacket(0x17, this._brand());
    this.handlers.onStatus?.('entering world');
  }

  _clientSettings() {
    const payload = new Writer();
    const locale = new TextEncoder().encode('en_US');
    payload.varint(locale.length).raw(locale);
    payload.u8(8); // view distance
    payload.u8(0); // chat mode: full
    payload.bool(true); // chat colours
    payload.u8(0x7f); // skin parts
    return payload;
  }

  _brand() {
    const payload = new Writer();
    const channel = new TextEncoder().encode('MC|Brand');
    payload.varint(channel.length).raw(channel);
    const brand = new TextEncoder().encode('ApricityEagler');
    payload.varint(brand.length).raw(brand);
    return payload;
  }

  _onJoin(info) {
    this.joined = true;
    // Gamemode decides nothing yet, but servers echo it and it makes the log
    // honest about whether breaking blocks is instantaneous.
    this.gamemode = info?.gamemode ?? 0;
    this.handlers.onJoin?.(info);
  }

  _onPlayPacket({ id, data }) {
    const reader = new Reader(data);
    reader.varint(); // packet id already known

    try {
      switch (id) {
        case 0x02:
          this._chat(reader);
          break;
        case 0x08:
          this._position(reader);
          break;
        case 0x21:
          this._chunkData(reader);
          break;
        case 0x26:
          this._chunkBulk(data);
          break;
        case 0x23:
          this._blockChange(reader);
          break;
        default:
          break;
      }
    } catch (err) {
      this.handlers.onLog?.(`packet 0x${id.toString(16)} failed: ${err.message}`);
    }
  }

  _chat(reader) {
    const json = reader.varintString();
    let text = json;
    try {
      const parsed = JSON.parse(json);
      const collect = (part) => {
        if (!part) return '';
        if (typeof part === 'string') return part;
        let out = part.text || '';
        for (const extra of part.extra || []) out += collect(extra);
        return out;
      };
      text = collect(parsed) || json;
    } catch {
      /* some servers send plain text */
    }
    if (text.trim()) this.handlers.onChat?.(text);
  }

  _position(reader) {
    const x = reader.f64();
    const y = reader.f64();
    const z = reader.f64();
    const yaw = reader.f32();
    const pitch = reader.f32();
    reader.u8(); // flags
    this.handlers.onTeleport?.({ x, y, z, yaw, pitch });
    this.sendPosition(x, y, z, yaw, pitch, true);
  }

  _chunkData(reader) {
    const cx = reader.i32();
    const cz = reader.i32();
    const groundUp = reader.bool();
    const mask = reader.u16();
    const size = reader.varint();
    let sectionData;
    try {
      sectionData = reader.take(size);
    } catch (err) {
      // A single unreadable chunk must not take the session down.
      this.handlers.onLog?.(`chunk ${cx},${cz} skipped: ${err.message}`);
      return;
    }
    const body = new Reader(sectionData);

    const chunk = new Uint8Array(CHUNK_VOLUME);
    for (let section = 0; section < 16; section++) {
      if (!(mask & (1 << section))) continue;
      readSection(body, chunk, section * 16, true);
    }

    if (!groundUp) {
      // Partial update: keep whatever already exists for the untouched sections.
      const existing = this.world.getChunk(cx, cz);
      if (existing) {
        for (let i = 0; i < CHUNK_VOLUME; i++) if (!chunk[i]) chunk[i] = existing[i];
      }
    }

    this.world.setChunk(cx, cz, chunk);
    this.handlers.onChunk?.(cx, cz);
  }

  /**
   * MapChunkBulk as EaglerXServer actually frames it: the packet id, one flags
   * byte (bit 0 = sky light present), a varint column count, then per column an
   * int x, int z and a ushort section mask, then the payload. Each column is its
   * masked sections (block ids, block light, sky light) followed by 256 biome
   * bytes. Verified against live traffic with a byte-exact structural fit.
   */
  _chunkBulk(data) {
    let pos = 0;
    const varint = () => {
      let value = 0;
      let shift = 0;
      let byte = 0;
      do {
        if (pos >= data.length) throw new Error('truncated varint');
        byte = data[pos++];
        value |= (byte & 0x7f) << shift;
        shift += 7;
      } while (byte & 0x80);
      return value;
    };
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    varint(); // packet id
    const flags = data[pos++];
    const hasSkyLight = (flags & 0x01) !== 0;
    const count = varint();

    const columns = [];
    for (let i = 0; i < count; i++) {
      if (pos + 10 > data.length) throw new Error('truncated column table');
      columns.push({ cx: view.getInt32(pos), cz: view.getInt32(pos + 4), mask: view.getUint16(pos + 8) });
      pos += 10;
    }

    const sectionBytes = 4096 * 2 + 2048 + (hasSkyLight ? 2048 : 0);

    for (const column of columns) {
      const chunk = new Uint8Array(CHUNK_VOLUME);
      for (let section = 0; section < 16; section++) {
        if (!(column.mask & (1 << section))) continue;
        if (pos + sectionBytes > data.length) throw new Error('truncated section data');
        for (let i = 0; i < 4096; i++) {
          const raw = data[pos + i * 2] | (data[pos + i * 2 + 1] << 8);
          const id = (raw >> 4) & 0xfff;
          if (!id) continue;
          const localY = i >> 8;
          chunk[(((section << 4) + localY) << 8) | (i & 255)] = id > 255 ? 1 : id;
        }
        pos += sectionBytes;
      }
      pos += 256; // biome array
      this.world.setChunk(column.cx, column.cz, chunk);
      this.handlers.onChunk?.(column.cx, column.cz);
    }
  }

  _blockChange(reader) {
    const packed = reader.i64();
    const x = Number((packed >> 38n) & 0x3ffffffn);
    const sx = x >= 0x2000000 ? x - 0x4000000 : x;
    const y = Number((packed >> 26n) & 0xfffn);
    const z = Number(packed & 0x3ffffffn);
    const sz = z >= 0x2000000 ? z - 0x4000000 : z;
    const state = reader.varint();
    const id = (state >> 4) & 0xfff;

    if (this.world.setBlock(sx, y, sz, id > 255 ? 1 : id, { record: false })) {
      this.handlers.onBlockChange?.(sx, y, sz);
    }
  }

  /**
   * 0x07 PlayerDigging. Status: 0 started, 1 cancelled, 2 finished, 3 drop
   * stack, 4 drop item, 5 use item. Vanilla accepts digging only within six
   * blocks of the eyes, which is exactly the reach the raycast uses.
   */
  dig(x, y, z, face, status = 2) {
    if (!this.joined) return;
    const payload = new Writer();
    payload.i8(status).i64(packPosition(x, y, z)).i8(face & 7);
    this.connection.sendPlayPacket(0x07, payload);
  }

  /** Break a block the way the 1.8 client does: started, then finished. */
  breakBlock(x, y, z, face) {
    this.dig(x, y, z, face, 0);
    this.dig(x, y, z, face, 2);
  }

  /**
   * 0x08 BlockPlacement against `face` of the block at x,y,z. 1.8 carries the
   * held stack inline — short item id, byte count, short damage, then an empty
   * NBT compound (a single TAG_End byte) — and the cursor position on the hit
   * face as three bytes scaled by 16, which is how the server orients logs,
   * stairs and slabs.
   */
  place(x, y, z, face, blockId, cursor = [0.5, 0.5, 0.5]) {
    if (!this.joined || !blockId) return;
    const payload = new Writer();
    payload.i64(packPosition(x, y, z));
    payload.i8(face & 7);
    if (blockId > 0) payload.u16(blockId & 0xffff).u8(1).u16(0);
    else payload.u16(0xffff);
    payload.u8(0); // no NBT on a plain block
    const byte = (v) => Math.max(0, Math.min(255, Math.round(Number(v) * 16)));
    payload.u8(byte(cursor[0])).u8(byte(cursor[1])).u8(byte(cursor[2]));
    this.connection.sendPlayPacket(0x08, payload);
  }

  /** 0x09 HeldItemChange, sent when the hotbar selection moves. */
  sendHeldItem(slot) {
    if (!this.joined) return;
    this.connection.sendPlayPacket(0x09, new Writer().u16(slot & 0xffff));
  }

  sendPosition(x, y, z, yaw, pitch, onGround) {
    if (!this.joined) return;
    const payload = new Writer();
    payload.f64(x).f64(y).f64(z);
    payload.f32(yaw).f32(pitch);
    payload.bool(onGround);
    this.connection.sendPlayPacket(0x06, payload);
  }

  sendChat(message) {
    if (!this.joined || !message) return;
    const payload = new Writer();
    const bytes = new TextEncoder().encode(message);
    payload.varint(bytes.length).raw(bytes);
    this.connection.sendPlayPacket(0x01, payload);
  }
}
