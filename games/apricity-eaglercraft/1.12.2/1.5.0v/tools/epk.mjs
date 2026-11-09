// Reader for Eaglercraft .epk asset packs (EAGPKG$$ container).
//
//   node tools/epk.mjs <pack.epk> --list <substring>
//   node tools/epk.mjs <pack.epk> --extract <outDir> <substring>
//   node tools/epk.mjs <client.html> --from-html --list <substring>
//
// Layout: "EAGPKG$$", length-prefixed ASCII strings (version + name), a comment
// block, then a raw deflate stream (gzip header stripped) holding the asset
// tree. Inside, entries repeat as
//   'HEAD' u8 nameLen name u32 valueLen value
//   'FILE' u8 nameLen name u32 crc u32 dataLen data
//
// Records are found by scanning every 'FILE' tag rather than walking forward:
// a single mis-sized record would otherwise skip a whole run of entries.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { inflateRawSync, constants } from 'node:zlib';

const NAME_OK = /^[\x21-\x7e][\x20-\x7e]*$/;
const GZIP_MAGIC = Buffer.from([0x1f, 0x8b, 0x08]);

/** Bytes of a pack: everything after the header strings, inflated. */
function inflatePack(raw) {
  if (raw.subarray(0, 8).toString('latin1') !== 'EAGPKG$$') throw new Error('not an epk');
  let p = 8;
  for (let i = 0; i < 2; i++) p += 1 + raw[p];
  const gzipStart = raw.indexOf(GZIP_MAGIC, p);
  if (gzipStart < 0) throw new Error('no deflate stream found');
  return inflateRawSync(raw.subarray(gzipStart + 10), { finishFlush: constants.Z_SYNC_FLUSH });
}

function recordAt(inner, tagAt, tag) {
  const nameLen = inner[tagAt + 4];
  if (nameLen <= 0 || nameLen > 220) return null;
  const nameStart = tagAt + 5;
  const nameEnd = nameStart + nameLen;
  if (nameEnd > inner.length) return null;
  const name = inner.subarray(nameStart, nameEnd).toString('utf8');
  if (!NAME_OK.test(name) || !name.includes('/')) return null;
  let q = nameEnd;
  if (tag === 'FILE') {
    const len = inner.readUInt32BE(q);
    q += 8; // length, then CRC
    if (len <= 0 || q + len > inner.length) return null;
    return { tag, name, data: inner.subarray(q, q + len), end: q + len };
  }
  const len = inner.readUInt32BE(q);
  q += 4;
  if (q + len > inner.length) return null;
  return { tag, name, data: inner.subarray(q, q + len), end: q + len };
}

/** Parse an inflated pack body into a name -> Buffer map. */
export function parsePackBody(inner) {
  const files = new Map();
  const heads = new Map();
  for (const tag of ['FILE', 'HEAD']) {
    const needle = Buffer.from(tag, 'latin1');
    let at = inner.indexOf(needle, 0);
    while (at >= 0) {
      const entry = recordAt(inner, at, tag);
      if (entry) {
        const store = tag === 'FILE' ? files : heads;
        if (!store.has(entry.name)) store.set(entry.name, tag === 'FILE' ? entry.data : entry.data.toString('utf8'));
      }
      at = inner.indexOf(needle, at + 4);
    }
  }
  return { files, heads };
}

/** Read a .epk file from disk. */
export function readPack(raw) {
  const inner = inflatePack(raw);
  const parsed = parsePackBody(inner);
  parsed.body = inner;
  return parsed;
}

/**
 * Find the asset pack a client HTML file embeds as a base64 data URI, e.g.
 *   window.eaglercraftXOpts.assetsURI = "data:application/octet-stream;base64,EAGPKG$$..."
 */
export function findEmbeddedPack(htmlText) {
  const marker = 'base64,';
  let at = htmlText.indexOf(marker);
  while (at >= 0) {
    const start = at + marker.length;
    let end = start;
    while (end < htmlText.length && /[A-Za-z0-9+/=]/.test(htmlText[end])) end++;
    if (htmlText.startsWith('RUFHUE', start)) {
      return Buffer.from(htmlText.slice(start, end), 'base64');
    }
    at = htmlText.indexOf(marker, start);
  }
  return null;
}

/** Every pack embedded in a client HTML file, in file order. */
export function findAllEmbeddedPacks(htmlText) {
  const packs = [];
  const marker = 'base64,';
  let at = htmlText.indexOf(marker);
  while (at >= 0) {
    const start = at + marker.length;
    let end = start;
    while (end < htmlText.length && /[A-Za-z0-9+/=]/.test(htmlText[end])) end++;
    if (htmlText.startsWith('RUFHUE', start)) packs.push(Buffer.from(htmlText.slice(start, end), 'base64'));
    at = htmlText.indexOf(marker, start);
  }
  return packs;
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/epk.mjs');
if (invokedDirectly) {
  const [, , srcPath, a = '--list', b = '', c = ''] = process.argv;
  const fromHtml = a === '--from-html';
  const mode = fromHtml ? b : a;
  const filter = mode === '--extract' ? c : fromHtml ? c : b;
  const target = mode === '--extract' ? (fromHtml ? c : b) : '';
  const filterText = mode === '--extract' ? (fromHtml ? process.argv[6] ?? '' : process.argv[5] ?? '') : filter;

  const packs = fromHtml
    ? findAllEmbeddedPacks(readFileSync(srcPath).toString('latin1')).map(readPack)
    : [readPack(readFileSync(srcPath))];

  let written = 0;
  packs.forEach((pack, index) => {
    console.log(`pack #${index + 1}: ${pack.body.length} bytes inflated, ${pack.files.size} files`);
    for (const [name, data] of pack.files) {
      if (filterText && !name.includes(filterText)) continue;
      if (mode === '--list') {
        console.log(`  ${name} (${data.length} B)`);
      } else if (mode === '--extract') {
        const out = join(target, name);
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, data);
        written++;
      }
    }
  });
  if (mode === '--extract') console.log(`wrote ${written} files into ${target}`);
}
