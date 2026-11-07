// Dropped items: break a block in survival and it falls out of the world as a
// small spinning cube that you can walk over to pick up, exactly as 1.12.2 does
// it. Physics is the same cheap AABB-free point simulation the game uses for
// items: gravity, a resting snap onto the block below, and a little drag.

import { blockColor } from './blocks.js';

const GRAVITY = 20;
const ITEM_SIZE = 0.25;
export const PICKUP_DELAY = 0.5;
export const PICKUP_RADIUS = 1.4;

export class Drops {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.nextId = 1;
  }

  get count() {
    return this.list.length;
  }

  clear() {
    this.list.length = 0;
  }

  /** Throw one stack into the world. Returns the entity, or null for air. */
  spawn(itemId, x, y, z, { count = 1, vx = 0, vy = 2.2, vz = 0, spread = 0.6 } = {}) {
    if (!itemId) return null;
    const drop = {
      id: this.nextId++,
      itemId,
      count: Math.max(1, Math.floor(count)),
      x,
      y,
      z,
      vx: vx || (Math.random() - 0.5) * spread * 2,
      vy,
      vz: vz || (Math.random() - 0.5) * spread * 2,
      age: 0,
      onGround: false,
    };
    this.list.push(drop);
    return drop;
  }

  /**
   * Step every drop and collect the ones the player can now pick up.
   * `player` is the first-person Player; pass null to just run the physics.
   */
  update(dt, player = null) {
    const picked = [];

    for (const drop of this.list) {
      drop.age += dt;
      drop.vy -= GRAVITY * dt;

      // Vertical: land on the block below, or pop out of one that was placed
      // inside us.
      let nextY = drop.y + drop.vy * dt;
      const bx = Math.floor(drop.x);
      const bz = Math.floor(drop.z);
      if (drop.vy <= 0 && this.world.isSolid(bx, Math.floor(nextY), bz)) {
        nextY = Math.floor(nextY) + 1;
        drop.vy = 0;
        drop.onGround = true;
      } else if (this.world.isSolid(bx, Math.floor(drop.y), bz)) {
        nextY = Math.floor(drop.y) + 1;
        drop.vy = 0;
        drop.onGround = true;
      } else {
        drop.onGround = false;
      }
      drop.y = nextY;

      // Horizontal: stop at walls instead of sliding through them.
      const nextX = drop.x + drop.vx * dt;
      if (!this.world.isSolid(Math.floor(nextX), Math.floor(drop.y + 0.05), bz)) drop.x = nextX;
      else drop.vx = -drop.vx * 0.3;
      const nextZ = drop.z + drop.vz * dt;
      if (!this.world.isSolid(Math.floor(drop.x), Math.floor(drop.y + 0.05), Math.floor(nextZ))) drop.z = nextZ;
      else drop.vz = -drop.vz * 0.3;

      const drag = drop.onGround ? 0.55 : 0.99;
      drop.vx *= drag;
      drop.vz *= drag;
      if (drop.y < -8) drop.age = Infinity; // fell out of the world

      if (player && drop.age >= PICKUP_DELAY) {
        const dx = player.x - drop.x;
        const dy = player.y + 0.9 - drop.y;
        const dz = player.z - drop.z;
        if (dx * dx + dy * dy + dz * dz <= PICKUP_RADIUS * PICKUP_RADIUS) picked.push(drop);
      }
    }

    if (picked.length) {
      const taken = new Set(picked.map((drop) => drop.id));
      this.list = this.list.filter((drop) => !taken.has(drop.id));
    }
    this.list = this.list.filter((drop) => Number.isFinite(drop.age));

    return picked;
  }

  /** Geometry for the renderer: a small spinning cube in the block's colour. */
  cubes() {
    return this.list.map((drop) => ({
      x: drop.x,
      y: drop.y + 0.18 + Math.sin(drop.age * 2.4) * 0.06,
      z: drop.z,
      size: ITEM_SIZE,
      spin: drop.age * 1.8,
      color: blockColor(drop.itemId),
    }));
  }
}
