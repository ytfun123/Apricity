// PNG read/write for the asset pack: every bit depth and colour type Minecraft
// textures actually use (1/2/4/8/16-bit greyscale, RGB, palette, grey+alpha,
// RGBA), non-interlaced.

import { inflateSync, deflateSync } from 'node:zlib';

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

export function decodePNG(buf) {
  let pos = 8;
  let ihdr = null;
  let palette = null;
  let trns = null;
  const idat = [];

  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!ihdr) throw new Error('not a png');
  if (ihdr.interlace) throw new Error('interlaced png not supported');

  const { width, height, depth, colorType } = ihdr;
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`unsupported colour type ${colorType}`);
  if (colorType === 3 && !palette) throw new Error('palette png without PLTE');

  const bitsPerPixel = channels * depth;
  const bpp = Math.max(1, Math.ceil(bitsPerPixel / 8));
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  const raw = inflateSync(Buffer.concat(idat));

  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const dst = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? dst[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) value += paeth(a, b, c);
      dst[x] = value & 0xff;
    }
  }

  const maxSample = (1 << depth) - 1;
  const readSample = (rowStart, x, channel) => {
    if (depth === 8) return pixels[rowStart + x * channels + channel];
    if (depth === 16) return pixels[rowStart + (x * channels + channel) * 2];
    const bitIndex = (x * channels + channel) * depth;
    const byte = pixels[rowStart + (bitIndex >> 3)];
    const shift = 8 - depth - (bitIndex & 7);
    return (byte >> shift) & maxSample;
  };
  const toByte = (value) =>
    depth === 16 ? value : depth === 8 ? value : Math.round((value * 255) / maxSample);

  // tRNS can declare one fully transparent colour for grey/RGB images.
  let transparentGrey = null;
  let transparentRgb = null;
  if (trns && colorType === 0) transparentGrey = (trns[0] << 8) | trns[1];
  if (trns && colorType === 2) transparentRgb = [(trns[0] << 8) | trns[1], (trns[2] << 8) | trns[3], (trns[4] << 8) | trns[5]];

  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    for (let x = 0; x < width; x++) {
      let r;
      let g;
      let b;
      let a = 255;
      if (colorType === 6) {
        r = toByte(readSample(rowStart, x, 0));
        g = toByte(readSample(rowStart, x, 1));
        b = toByte(readSample(rowStart, x, 2));
        a = toByte(readSample(rowStart, x, 3));
      } else if (colorType === 4) {
        r = g = b = toByte(readSample(rowStart, x, 0));
        a = toByte(readSample(rowStart, x, 1));
      } else if (colorType === 2) {
        const rawR = readSample(rowStart, x, 0);
        const rawG = readSample(rowStart, x, 1);
        const rawB = readSample(rowStart, x, 2);
        if (transparentRgb && rawR === transparentRgb[0] && rawG === transparentRgb[1] && rawB === transparentRgb[2]) a = 0;
        r = toByte(rawR);
        g = toByte(rawG);
        b = toByte(rawB);
      } else if (colorType === 0) {
        const rawGrey = readSample(rowStart, x, 0);
        if (transparentGrey !== null && rawGrey === transparentGrey) a = 0;
        r = g = b = toByte(rawGrey);
      } else {
        const index = readSample(rowStart, x, 0);
        r = palette[index * 3];
        g = palette[index * 3 + 1];
        b = palette[index * 3 + 2];
        if (trns && index < trns.length) a = trns[index];
      }
      const out = (y * width + x) * 4;
      rgba[out] = r;
      rgba[out + 1] = g;
      rgba[out + 2] = b;
      rgba[out + 3] = a;
    }
  }

  return { width, height, data: rgba };
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encode RGBA8 pixels at {width, height, data}. */
export function encodePNG({ width, height, data }) {
  const stride = width * 4;
  const source = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer ?? data);
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    source.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Nearest-neighbour copy of a whole image into an RGBA target at (dx, dy).
 * `scale` is the pixel multiplier of the destination (1 = one atlas pixel per
 * source pixel) so source images larger than the tile are subsampled instead of
 * spilling over their neighbours.
 */
export function blitTile(target, tileW, img, dx, dy, scale = 1) {
  for (let y = 0; y < img.height * scale; y++) {
    for (let x = 0; x < img.width * scale; x++) {
      const src = (Math.floor(y / scale) * img.width + Math.floor(x / scale)) * 4;
      const dst = ((dy + y) * tileW + (dx + x)) * 4;
      target[dst] = img.data[src];
      target[dst + 1] = img.data[src + 1];
      target[dst + 2] = img.data[src + 2];
      target[dst + 3] = img.data[src + 3];
    }
  }
}

/** Nearest-neighbour resize of a decoded image to size x size. */
export function resizeTile(img, size) {
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y * img.height) / size));
    for (let x = 0; x < size; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x * img.width) / size));
      const src = (sy * img.width + sx) * 4;
      const dst = (y * size + x) * 4;
      data[dst] = img.data[src];
      data[dst + 1] = img.data[src + 1];
      data[dst + 2] = img.data[src + 2];
      data[dst + 3] = img.data[src + 3];
    }
  }
  return { width: size, height: size, data };
}

/** Crop the top-left square of an animated strip (frame one). */
export function firstFrame(img) {
  const size = Math.min(img.width, img.height);
  if (size === img.width && size === img.height) return img;
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    img.data.copy(data, y * size * 4, y * img.width * 4, (y * img.width + size) * 4);
  }
  return { width: size, height: size, data };
}
