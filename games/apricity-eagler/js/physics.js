// Block physics: sand and gravel fall, water and lava flow.
//
// The world stores one byte per block and no metadata, so a flowing cell
// remembers its distance from the source here instead. Cells only enter the
// active sets when something disturbs them, which keeps the oceans the terrain
// generator lays down perfectly still instead of flooding the world on boot.

import { isSolid } from './blocks.js';

export const FALLING = new Set([12, 13]); // sand, gravel
export const WATER = 8;
export const WATER_FLOW = 9;
export const LAVA = 10;
export const LAVA_FLOW = 11;

export const isFluid = (id) => id === WATER || id === WATER_FLOW || id === LAVA || id === LAVA_FLOW;
const isWater = (id) => id === WATER || id === WATER_FLOW;
const flowId = (id) => (isWater(id) ? WATER_FLOW : LAVA_FLOW);
const maxLevel = (id) => (isWater(id) ? 7 : 3);

// 1.12.2 drops a falling block about five ticks a block, flows water every five
// ticks and lava every thirty.
export const FALL_STEP = 0.1;
export const WATER_STEP = 0.25;
export const LAVA_STEP = 0.5;

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const AROUND = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0, 1, 1],
];

const key = (x, y, z) => `${x},${y},${z}`;

export class BlockPhysics {
  constructor(world) {
    this.world = world;
    // Cells whose block above may be unsupported, and fluid cells to re-check.
    this.falls = new Set();
    this.active = new Set();
    // "x,y,z" -> distance from the source, for flowing cells only. The world
    // owns the map too, because the mesher draws water lower the further it has
    // flow from its source.
    this.levels = world.fluidLevels ?? new Map();
    this.fallClock = 0;
    this.waterClock = 0;
    this.lavaClock = 0;
  }

  /** Something changed here: queue the neighbours that should react. */
  touch(x, y, z) {
    // The cell itself may be a block that has just been placed in the air.
    this.falls.add(key(x, y, z));
    this.falls.add(key(x, y + 1, z));
    this.wake(x, y, z);
    for (const [dx, dz] of SIDES) this.wake(x + dx, y, z + dz);
    this.wake(x, y + 1, z);
    this.wake(x, y - 1, z);
  }

  wake(x, y, z) {
    if (isFluid(this.world.getBlock(x, y, z))) this.active.add(key(x, y, z));
  }

  levelAt(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (id === WATER || id === LAVA) return 0;
    return this.levels.get(key(x, y, z)) ?? 1;
  }

  /** Nothing may move into a chunk that is not loaded, or it vanishes. */
  loaded(x, y, z) {
    if (y < 0) return false;
    if (typeof this.world.hasChunk !== 'function') return true;
    return this.world.hasChunk(x >> 4, z >> 4);
  }

  /** Advance the clocks; `dt` is seconds of game time. */
  tick(dt) {
    this.fallClock += dt;
    this.waterClock += dt;
    this.lavaClock += dt;
    for (let i = 0; i < 8 && this.fallClock >= FALL_STEP; i++) {
      this.fallClock -= FALL_STEP;
      this.stepFalls();
    }
    for (let i = 0; i < 4 && this.waterClock >= WATER_STEP; i++) {
      this.waterClock -= WATER_STEP;
      this.stepFluids('water');
    }
    for (let i = 0; i < 2 && this.lavaClock >= LAVA_STEP; i++) {
      this.lavaClock -= LAVA_STEP;
      this.stepFluids('lava');
    }
  }

  /** One step of gravity for every queued block. */
  stepFalls() {
    if (!this.falls.size) return 0;
    const queue = [...this.falls];
    this.falls.clear();
    let moved = 0;
    for (const cell of queue) {
      if (moved >= 96) {
        this.falls.add(cell);
        continue;
      }
      const [x, y, z] = cell.split(',').map(Number);
      if (!this.loaded(x, y, z)) continue;
      const id = this.world.getBlock(x, y, z);
      if (!FALLING.has(id) || y <= 1) continue;
      const below = this.world.getBlock(x, y - 1, z);
      if (!this.loaded(x, y - 1, z)) continue;
      if (isFluid(below)) {
        // Sand and gravel sink through water and lava: the liquid rises into
        // the cell the block just left, so the column is not drained.
        this.levels.delete(key(x, y - 1, z));
        this.world.setBlock(x, y, z, below, { record: true });
        this.world.setBlock(x, y - 1, z, id, { record: true });
      } else if (below === 0) {
        this.world.setBlock(x, y, z, 0, { record: true });
        this.world.setBlock(x, y - 1, z, id, { record: true });
      } else {
        continue;
      }
      // Whatever was riding on top, and the column underneath, come next.
      this.falls.add(key(x, y + 1, z));
      this.falls.add(key(x, y - 1, z));
      moved++;
    }
    return moved;
  }

  /** One step of spreading for water or lava. */
  stepFluids(kind) {
    if (!this.active.size) return 0;
    const cells = [...this.active];
    this.active.clear();
    let changes = 0;
    for (const cell of cells) {
      const [x, y, z] = cell.split(',').map(Number);
      if (!this.loaded(x, y, z)) {
        // Keep the cell queued; it resumes once its chunk comes back.
        this.active.add(cell);
        continue;
      }
      const id = this.world.getBlock(x, y, z);
      if (!isFluid(id)) {
        this.levels.delete(cell);
        continue;
      }
      // Leave the other liquid's cells to its own, slower, clock.
      if ((kind === 'water') !== isWater(id)) {
        this.active.add(cell);
        continue;
      }
      if (id === WATER_FLOW || id === LAVA_FLOW) {
        if (this.drain(x, y, z, id)) {
          changes++;
          continue;
        }
      }
      changes += this.flowFrom(x, y, z, id);
    }
    return changes;
  }

  flowFrom(x, y, z, id) {
    const level = this.levelAt(x, y, z);
    // A liquid with somewhere to fall does not spread sideways, and a fall
    // resets the distance from the source: dig the floor out from under the last
    // cell and the water keeps going from where it lands, as it does in 1.12.2.
    if (this.tryFlow(x, y - 1, z, id, 0)) return 1;
    if (level >= maxLevel(id)) return 0;
    let spread = 0;
    for (const [dx, dz] of SIDES) {
      if (this.tryFlow(x + dx, y, z + dz, id, level + 1)) spread++;
    }
    return spread;
  }

  tryFlow(x, y, z, id, level) {
    if (!this.loaded(x, y, z)) return 0;
    const target = this.world.getBlock(x, y, z);
    if (isFluid(target)) {
      if (isWater(target) === isWater(id)) {
        const existing = this.levelAt(x, y, z);
        if (existing <= level) return 0;
        this.levels.set(key(x, y, z), level);
        this.world.setBlock(x, y, z, flowId(id), { record: true });
        this.active.add(key(x, y, z));
        return 1;
      }
      // Water running into lava makes cobblestone, as it does in 1.12.2.
      this.levels.delete(key(x, y, z));
      this.world.setBlock(x, y, z, 4, { record: true });
      this.touch(x, y, z);
      return 1;
    }
    if (target !== 0) return 0;
    this.world.setBlock(x, y, z, flowId(id), { record: true });
    this.levels.set(key(x, y, z), level);
    this.active.add(key(x, y, z));
    this.wake(x, y - 1, z);
    return 1;
  }

  /**
   * A flowing cell with no supply dries up. Straight up keeps a cell alive at
   * the same level (water falling down a hole); sideways it must be strictly
   * closer to a source, so two neighbours cannot keep each other wet.
   */
  drain(x, y, z, id) {
    const mine = this.levelAt(x, y, z);
    const supplied = (nx, ny, nz, fromAbove) => {
      const nid = this.world.getBlock(nx, ny, nz);
      if (!isFluid(nid) || isWater(nid) !== isWater(id)) return false;
      // Water directly above always feeds the cell below it: a falling column
      // has no level of its own to compare against.
      if (fromAbove) return true;
      return this.levelAt(nx, ny, nz) < mine;
    };
    if (supplied(x, y + 1, z, true)) return false;
    for (const [dx, dz] of SIDES) {
      if (supplied(x + dx, y, z + dz, false)) return false;
    }
    this.world.setBlock(x, y, z, 0, { record: true });
    this.levels.delete(key(x, y, z));
    for (const [dx, dz] of SIDES) this.wake(x + dx, y, z + dz);
    this.wake(x, y + 1, z);
    this.falls.add(key(x, y + 1, z));
    return true;
  }

  /** Count fluid cells and the deepest level, for tests and diagnostics. */
  get stats() {
    let cells = 0;
    let deepest = 0;
    for (const [cell] of this.levels) {
      const [x, y, z] = cell.split(',').map(Number);
      if (!isFluid(this.world.getBlock(x, y, z))) continue;
      cells++;
      deepest = Math.max(deepest, this.levelAt(x, y, z));
    }
    return { cells, deepest };
  }
}

/** True for the blocks that fall when nothing is under them. */
export const falls = (id) => FALLING.has(id);

/** True for blocks a liquid can displace (air, other liquid). */
export const canDisplace = (id) => id === 0 || isFluid(id) || !isSolid(id);
