// Voxel storage and procedural terrain. Chunks are 16 x 256 x 16 byte arrays of
// block ids, indexed as (y << 8) | (z << 4) | x.
//
// Terrain is seeded value noise: broad continents with ridged mountains on top,
// a temperature/humidity pass to pick biomes, 3D noise for caves, and depth-based
// ore scatter. Nothing here comes from a server; singleplayer is all local.

import { isSolid, isTransparent } from './blocks.js';

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 256;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT;
export const SEA_LEVEL = 34;

export function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

export function blockIndex(x, y, z) {
  return (y << 8) | ((z & 15) << 4) | (x & 15);
}

const smooth = (t) => t * t * (3 - 2 * t);

function hash2(x, z, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function hash3(x, y, z, seed) {
  let h =
    Math.imul(x, 374761393) ^
    Math.imul(y, 1103515245) ^
    Math.imul(z, 668265263) ^
    Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, z, seed) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = smooth(x - xi);
  const zf = smooth(z - zi);
  const a = hash2(xi, zi, seed);
  const b = hash2(xi + 1, zi, seed);
  const c = hash2(xi, zi + 1, seed);
  const d = hash2(xi + 1, zi + 1, seed);
  return (a * (1 - xf) + b * xf) * (1 - zf) + (c * (1 - xf) + d * xf) * zf;
}

function fbm(x, z, seed) {
  return (
    valueNoise(x / 96, z / 96, seed) * 0.55 +
    valueNoise(x / 41, z / 41, seed + 17) * 0.27 +
    valueNoise(x / 17, z / 17, seed + 31) * 0.12 +
    valueNoise(x / 8, z / 8, seed + 43) * 0.06
  );
}

function noise3(x, y, z, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const zf = smooth(z - zi);

  const c000 = hash3(xi, yi, zi, seed);
  const c100 = hash3(xi + 1, yi, zi, seed);
  const c010 = hash3(xi, yi + 1, zi, seed);
  const c110 = hash3(xi + 1, yi + 1, zi, seed);
  const c001 = hash3(xi, yi, zi + 1, seed);
  const c101 = hash3(xi + 1, yi, zi + 1, seed);
  const c011 = hash3(xi, yi + 1, zi + 1, seed);
  const c111 = hash3(xi + 1, yi + 1, zi + 1, seed);

  const x00 = c000 * (1 - xf) + c100 * xf;
  const x10 = c010 * (1 - xf) + c110 * xf;
  const x01 = c001 * (1 - xf) + c101 * xf;
  const x11 = c011 * (1 - xf) + c111 * xf;
  const y0 = x00 * (1 - yf) + x10 * yf;
  const y1 = x01 * (1 - yf) + x11 * yf;
  return y0 * (1 - zf) + y1 * zf;
}

/** Surface height in blocks for a world column. */
export function surfaceHeight(x, z, seed) {
  const continent = fbm(x, z, seed);
  const ridge = 1 - Math.abs(valueNoise(x / 110, z / 110, seed + 33) * 2 - 1);
  const mountainMask = Math.max(0, (valueNoise(x / 240, z / 240, seed + 71) - 0.56) / 0.44);
  const base = 26 + continent * 22;
  const mountains = Math.pow(ridge, 2.1) * mountainMask * 54;
  return Math.floor(base + mountains);
}

/** Which biome a column belongs to. */
export function biomeAt(x, z, seed, height = surfaceHeight(x, z, seed)) {
  const temperature = valueNoise(x / 300, z / 300, seed + 101);
  const humidity = valueNoise(x / 220, z / 220, seed + 202);
  if (height <= SEA_LEVEL + 1) return 'beach';
  if (height > 78) return 'snow';
  if (temperature > 0.64 && humidity < 0.45) return 'desert';
  if (humidity > 0.6) return 'forest';
  return 'plains';
}

function isCave(x, y, z, seed) {
  if (y < 4) return false;
  if (noise3(x / 17, y / 10, z / 17, seed + 7) > 0.66) return true;
  return noise3(x / 38, y / 24, z / 38, seed + 9) > 0.72;
}

function oreAt(x, y, z, seed) {
  const r = hash3(x, y, z, seed + 91);
  if (y < 15 && r > 0.9952) return 56; // diamond
  if (y < 22 && r > 0.9935) return 21; // lapis
  if (y < 28 && r > 0.9928) return 41; // gold
  if (y < 44 && r > 0.9905) return 15; // iron
  if (y < 70 && r > 0.9865) return 16; // coal
  if (y < 50 && r > 0.9855) return 73; // redstone
  return 1;
}

function plantTree(blocks, lx, y, lz, seed, sprucelike) {
  if (lx < 2 || lx > 13 || lz < 2 || lz > 13) return;
  const height = (sprucelike ? 6 : 4) + Math.floor(hash2(lx, lz, seed + 5) * 3);
  const logId = sprucelike ? 162 : 17;
  const leafId = sprucelike ? 161 : 18;

  for (let i = 1; i <= height; i++) {
    if (y + i < WORLD_HEIGHT) blocks[blockIndex(lx, y + i, lz)] = logId;
  }

  const top = y + height;
  for (let dy = -2; dy <= 2; dy++) {
    const radius = dy >= 2 ? 1 : dy === 1 ? 2 : 2;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx === 0 && dz === 0 && dy <= 0) continue;
        if (Math.abs(dx) === radius && Math.abs(dz) === radius && hash2(lx + dx, lz + dz, seed + dy) > 0.45) {
          continue;
        }
        const yy = top + dy;
        const xx = lx + dx;
        const zz = lz + dz;
        if (xx < 0 || xx > 15 || zz < 0 || zz > 15 || yy < 1 || yy >= WORLD_HEIGHT) continue;
        if (!blocks[blockIndex(xx, yy, zz)]) blocks[blockIndex(xx, yy, zz)] = leafId;
      }
    }
  }
}

function plantCactus(blocks, lx, y, lz, seed) {
  if (lx < 1 || lx > 14 || lz < 1 || lz > 14) return;
  const height = 2 + Math.floor(hash2(lx, lz, seed + 11) * 3);
  for (let i = 1; i <= height; i++) {
    if (y + i < WORLD_HEIGHT) blocks[blockIndex(lx, y + i, lz)] = 81;
  }
}

export function generateChunk(blocks, cx, cz, seed) {
  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;

  for (let lx = 0; lx < 16; lx++) {
    for (let lz = 0; lz < 16; lz++) {
      const x = baseX + lx;
      const z = baseZ + lz;
      const height = surfaceHeight(x, z, seed);
      const biome = biomeAt(x, z, seed, height);

      const topId = biome === 'desert' || biome === 'beach' ? 12 : biome === 'snow' ? 80 : 2;
      const subId = biome === 'desert' || biome === 'beach' ? 12 : biome === 'snow' ? 80 : 3;

      for (let y = 0; y <= Math.max(height, SEA_LEVEL); y++) {
        let id = 0;
        if (y === 0) {
          id = 7;
        } else if (y <= height) {
          if (y === height) id = topId;
          else if (y > height - 4) id = subId;
          else id = y > 4 && isCave(x, y, z, seed) ? 0 : oreAt(x, y, z, seed);
        } else if (y <= SEA_LEVEL) {
          id = biome === 'snow' && y === SEA_LEVEL ? 79 : 8;
        }
        if (id) blocks[blockIndex(lx, y, lz)] = id;
      }

      if (biome === 'forest' && hash2(x, z, seed + 99) > 0.955) {
        plantTree(blocks, lx, height, lz, seed, false);
      } else if (biome === 'plains' && hash2(x, z, seed + 99) > 0.988) {
        plantTree(blocks, lx, height, lz, seed, false);
      } else if (biome === 'snow' && hash2(x, z, seed + 99) > 0.97) {
        plantTree(blocks, lx, height, lz, seed, true);
      } else if (biome === 'desert' && hash2(x, z, seed + 99) > 0.985) {
        plantCactus(blocks, lx, height, lz, seed);
      }
    }
  }
  return blocks;
}

export class World {
  constructor({ seed = Math.floor(Math.random() * 1e9), generate = true, edits = [] } = {}) {
    this.seed = seed;
    this.generate = generate;
    this.chunks = new Map();
    this.dirty = new Set();
    this.edits = new Map();
    for (const [x, y, z, id] of edits) this.edits.set(`${x},${y},${z}`, id);
  }

  hasChunk(cx, cz) {
    return this.chunks.has(chunkKey(cx, cz));
  }

  getChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (chunk) return chunk;
    if (!this.generate) return null;

    chunk = new Uint8Array(CHUNK_VOLUME);
    generateChunk(chunk, cx, cz, this.seed);
    this._applyEdits(chunk, cx, cz);
    this.chunks.set(key, chunk);
    this.dirty.add(key);
    return chunk;
  }

  setChunk(cx, cz, chunk) {
    const key = chunkKey(cx, cz);
    this.chunks.set(key, chunk);
    this.dirty.add(key);
  }

  _applyEdits(chunk, cx, cz) {
    if (this.edits.size === 0) return;
    for (const [key, id] of this.edits) {
      const [x, y, z] = key.split(',').map(Number);
      if (x >> 4 !== cx || z >> 4 !== cz) continue;
      chunk[blockIndex(x, y, z)] = id;
    }
  }

  getBlock(x, y, z) {
    if (y < 0) return 7;
    if (y >= WORLD_HEIGHT) return 0;
    const chunk = this.getChunk(x >> 4, z >> 4);
    if (!chunk) return 0;
    return chunk[blockIndex(x, y, z)];
  }

  setBlock(x, y, z, id, { record = true } = {}) {
    if (y < 0 || y >= WORLD_HEIGHT) return false;
    const cx = x >> 4;
    const cz = z >> 4;
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return false;

    chunk[blockIndex(x, y, z)] = id;
    if (record) this.edits.set(`${x},${y},${z}`, id);

    this.dirty.add(chunkKey(cx, cz));
    if ((x & 15) === 0) this.dirty.add(chunkKey(cx - 1, cz));
    if ((x & 15) === 15) this.dirty.add(chunkKey(cx + 1, cz));
    if ((z & 15) === 0) this.dirty.add(chunkKey(cx, cz - 1));
    if ((z & 15) === 15) this.dirty.add(chunkKey(cx, cz + 1));
    // Block physics listens here so sand, gravel and liquids react to changes.
    this.onBlockSet?.(x, y, z, id);
    return true;
  }

  isSolid(x, y, z) {
    if (y < 0) return true;
    if (y >= WORLD_HEIGHT) return false;
    return isSolid(this.getBlock(x, y, z));
  }

  isOpaque(x, y, z) {
    return !isTransparent(this.getBlock(x, y, z));
  }

  /**
   * Read a block without generating its chunk. Meshing looks one block past the
   * chunk edge; generating from there would make every new chunk spawn its
   * neighbours, an endless cascade that costs frames.
   */
  probeBlock(x, y, z) {
    if (y < 0) return 7;
    if (y >= WORLD_HEIGHT) return 0;
    const chunk = this.chunks.get(chunkKey(x >> 4, z >> 4));
    if (!chunk) return 0;
    return chunk[blockIndex(x, y, z)];
  }

  probeIsOpaque(x, y, z) {
    return !isTransparent(this.probeBlock(x, y, z));
  }

  takeDirty() {
    const list = [...this.dirty];
    this.dirty.clear();
    return list;
  }

  serializeEdits() {
    return [...this.edits].map(([key, id]) => [...key.split(',').map(Number), id]);
  }

  /** Highest non-air block at a column, for spawning. */
  surfaceAt(x, z) {
    for (let y = WORLD_HEIGHT - 1; y > 0; y--) {
      const id = this.getBlock(x, y, z);
      if (id && isSolid(id)) return y + 1;
    }
    return SEA_LEVEL + 1;
  }

  /**
   * A dry spot near the origin. Without this a new world can drop you onto the
   * sea surface, which reads as a broken world rather than an ocean.
   */
  findSpawn(radius = 192) {
    for (let r = 0; r <= radius; r += 8) {
      const steps = r === 0 ? 1 : Math.max(8, Math.floor(r / 2));
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const x = Math.round(Math.cos(angle) * r);
        const z = Math.round(Math.sin(angle) * r);
        if (surfaceHeight(x, z, this.seed) <= SEA_LEVEL + 2) continue;
        this.getChunk(x >> 4, z >> 4);
        const y = this.surfaceAt(x, z);
        // Land on ground, not on the leaves of a tree.
        const below = this.getBlock(x, y - 1, z);
        if (y > SEA_LEVEL + 2 && (below === 2 || below === 3 || below === 12 || below === 80)) {
          return { x, y, z };
        }
      }
    }
    this.getChunk(0, 0);
    return { x: 8, y: this.surfaceAt(8, 8), z: 8 };
  }
}
