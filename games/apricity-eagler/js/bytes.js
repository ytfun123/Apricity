// Minimal big-endian byte reader/writer for the Eaglercraft handshake and the
// Minecraft packet stream. Everything the protocol needs and nothing else.

export class Writer {
  constructor(size = 64) {
    this.buf = new Uint8Array(size);
    this.len = 0;
  }

  _grow(n) {
    if (this.len + n <= this.buf.length) return;
    let cap = this.buf.length * 2;
    while (cap < this.len + n) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }

  u8(v) {
    this._grow(1);
    this.buf[this.len++] = v & 0xff;
    return this;
  }

  i8(v) {
    return this.u8(v);
  }

  bool(v) {
    return this.u8(v ? 1 : 0);
  }

  u16(v) {
    this._grow(2);
    this.buf[this.len++] = (v >>> 8) & 0xff;
    this.buf[this.len++] = v & 0xff;
    return this;
  }

  u32(v) {
    this._grow(4);
    this.buf[this.len++] = (v >>> 24) & 0xff;
    this.buf[this.len++] = (v >>> 16) & 0xff;
    this.buf[this.len++] = (v >>> 8) & 0xff;
    this.buf[this.len++] = v & 0xff;
    return this;
  }

  i32(v) {
    return this.u32(v);
  }

  // 64-bit values are passed around as BigInt so UUID halves survive intact.
  i64(v) {
    const big = BigInt.asUintN(64, BigInt(v));
    return this.u32(Number((big >> 32n) & 0xffffffffn)).u32(Number(big & 0xffffffffn));
  }

  varint(v) {
    let value = Number(v);
    if (!Number.isFinite(value)) throw new Error('varint needs a finite number');
    value = value < 0 ? value + 4294967296 : value;
    do {
      let byte = value & 0x7f;
      value >>>= 7;
      if (value !== 0) byte |= 0x80;
      this.u8(byte);
    } while (value !== 0);
    return this;
  }

  // Eaglercraft writes strings one byte per char; callers keep them ASCII.
  ascii(str) {
    for (let i = 0; i < str.length; i++) this.u8(str.charCodeAt(i) & 0xff);
    return this;
  }

  utf8(str) {
    const bytes = new TextEncoder().encode(str);
    return this.raw(bytes);
  }

  raw(bytes) {
    this._grow(bytes.length);
    this.buf.set(bytes, this.len);
    this.len += bytes.length;
    return this;
  }

  toUint8Array() {
    return this.buf.slice(0, this.len);
  }
}

export class Reader {
  constructor(bytes, offset = 0, length = undefined) {
    this.view = bytes;
    this.pos = offset;
    this.end = length === undefined ? bytes.length : offset + length;
  }

  remaining() {
    return this.end - this.pos;
  }

  _need(n) {
    if (this.pos + n > this.end) {
      throw new Error(`Truncated packet: needed ${n} byte(s), ${this.remaining()} left`);
    }
  }

  u8() {
    this._need(1);
    return this.view[this.pos++];
  }

  i8() {
    const v = this.u8();
    return v > 127 ? v - 256 : v;
  }

  bool() {
    return this.u8() !== 0;
  }

  u16() {
    this._need(2);
    const v = (this.view[this.pos] << 8) | this.view[this.pos + 1];
    this.pos += 2;
    return v;
  }

  u32() {
    this._need(4);
    const v =
      (this.view[this.pos] * 0x1000000) +
      ((this.view[this.pos + 1] << 16) | (this.view[this.pos + 2] << 8) | this.view[this.pos + 3]);
    this.pos += 4;
    return v;
  }

  i32() {
    return this.u32() | 0;
  }

  i64() {
    const hi = this.u32();
    const lo = this.u32();
    return (BigInt(hi) << 32n) | BigInt(lo);
  }

  varint() {
    let value = 0;
    let shift = 0;
    for (let i = 0; i < 5; i++) {
      const byte = this.u8();
      value |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) {
        return value >>> 0;
      }
      shift += 7;
    }
    throw new Error('varint is longer than 5 bytes');
  }

  take(n) {
    this._need(n);
    const out = this.view.subarray(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }

  rest() {
    return this.take(this.remaining());
  }

  ascii(n) {
    const bytes = this.take(n);
    let out = '';
    for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return out;
  }

  utf8(n) {
    return new TextDecoder('utf-8').decode(this.take(n));
  }

  varintString() {
    return this.utf8(this.varint());
  }
}

export function concatBytes(...chunks) {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function toHex(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

export function formatUuid(msb, lsb) {
  const hex =
    BigInt.asUintN(64, msb).toString(16).padStart(16, '0') +
    BigInt.asUintN(64, lsb).toString(16).padStart(16, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
