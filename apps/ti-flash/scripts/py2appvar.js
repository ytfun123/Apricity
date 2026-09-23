// Convert docs/games/python/<game>/*.py into Python AppVar (.8xv) files.
//
// Byte layout is modeled on a real "TI-Smartview CE 5.3.0.384" Python appvar:
//
//   payload   = "PYCD\0" + UTF-8 source
//   entry     = 0D 00 | varLen (LE u16) | 15 | name (8, nul-padded) | version 00
//               | flag 00 | varLen (LE u16) | payloadLen (LE u16) | payload
//   dataSec   = entry
//   checksum  = (sum of dataSec bytes) & 0xFFFF (LE u16)
//   file      = "**TI83F*" | 1A 0A 00 | comment (42 bytes) | dataLen (LE u16)
//               | dataSec | checksum
//
// varLen = 2 + payloadLen   (the variable data includes the 2-byte length word)
// dataLen = 17 + varLen
// Run from apps/ti-flash:  node scripts/py2appvar.js
'use strict';

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '..', 'docs', 'games', 'python');
const COMMENT = 'TI-84 Plus CE Python AppVar';

function u16le(n) {
  return Buffer.from([n & 0xff, (n >> 8) & 0xff]);
}

function ascii(s) {
  return Buffer.from(s, 'ascii');
}

function pad(buf, len) {
  if (buf.length > len) throw new Error(`"${buf.toString('ascii')}" longer than ${len} bytes`);
  const out = Buffer.alloc(len);
  buf.copy(out);
  return out;
}

function preprocessSource(raw) {
  if (raw.includes(0x0d)) {
    return Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf8');
  }
  return raw;
}

function buildEntry(name, payload) {
  const payloadLen = payload.length;
  if (payloadLen > 0xffff) throw new Error(`payload too large (${payloadLen} bytes)`);
  const varLen = 2 + payloadLen;
  return Buffer.concat([
    u16le(13),           // storage type 0x0D (version + flag present)
    u16le(varLen),       // variable data length
    Buffer.from([0x15]), // variable type ID: AppVar
    pad(ascii(name), 8), // variable name
    Buffer.from([0x00]), // version
    Buffer.from([0x00]), // flag (not archived)
    u16le(varLen),       // variable data length (copy)
    u16le(payloadLen),   // entry data length
    payload              // "PYCD\0" + source
  ]);
}

function buildFile(name, payload) {
  const entry = buildEntry(name, payload);
  const dataLen = entry.length;
  let sum = 0;
  for (const b of entry) sum = (sum + b) & 0xffff;
  return Buffer.concat([
    ascii('**TI83F*'),
    Buffer.from([0x1a, 0x0a, 0x00]),
    pad(ascii(COMMENT), 42),
    u16le(dataLen),
    entry,
    u16le(sum)
  ]);
}

const games = fs.readdirSync(GAMES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

for (const dir of games) {
  const folder = path.join(GAMES_DIR, dir.name);
  const pyFiles = fs.readdirSync(folder).filter((f) => f.toLowerCase().endsWith('.py'));

  for (const pyFile of pyFiles) {
    const base = path.basename(pyFile, '.py');
    const name = base.toUpperCase();

    if (!/^[A-Z0-9]{1,8}$/.test(name) || /^[0-9]/.test(name)) {
      throw new Error(`"${base}" is not a valid TI variable name (up to 8 A-Z/0-9 chars, must not start with a digit)`);
    }

    const raw = fs.readFileSync(path.join(folder, pyFile));
    const hadCRLF = raw.includes(0x0d);
    const src = preprocessSource(raw);
    const payload = Buffer.concat([ascii('PYCD\0'), src]);
    const outFile = path.join(folder, `${base}.8xv`);
    fs.writeFileSync(outFile, buildFile(name, payload));

    const manifestPath = path.join(folder, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      let changed = false;
      manifest = manifest.map((item) => {
        if (item.file.toLowerCase().endsWith('.py')) {
          const baseOfItem = path.basename(item.file, '.py');
          if (item.file !== `${baseOfItem}.8xv`) {
            changed = true;
            return { ...item, file: `${baseOfItem}.8xv` };
          }
        }
        return item;
      });
      if (changed) fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    }

    const size = fs.statSync(outFile).size;
    console.log(`${pyFile.padEnd(14)} -> ${base}.8xv (${size} bytes, appvar "${name}"${hadCRLF ? ', CRLF->LF' : ''})`);
  }
}