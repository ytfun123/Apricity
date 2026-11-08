// Passive animals: pigs, cows, sheep and chickens that wander the surface, can
// be hit, and drop the raw meat that keeps the hunger bar full.
//
// They are deliberately cheap — a few coloured boxes for the renderer, a wander
// clock and the same point physics the item drops use. No pathfinding, no biome
// rules: a mob is an animal standing on solid ground near the player.

import { isSolid } from './blocks.js';

export const MAX_MOBS = 10;

const GRAVITY = 22;

export const MOB_TYPES = {
  pig: {
    name: 'Pig',
    health: 10,
    width: 0.9,
    height: 0.9,
    speed: 1.1,
    body: [0.96, 0.66, 0.66],
    head: [0.98, 0.72, 0.72],
    snout: [0.86, 0.5, 0.55],
    drop: 'porkchop_raw',
    dropMin: 1,
    dropMax: 3,
  },
  cow: {
    name: 'Cow',
    health: 10,
    width: 0.9,
    height: 1.35,
    speed: 0.9,
    body: [0.24, 0.21, 0.2],
    head: [0.3, 0.27, 0.25],
    snout: [0.82, 0.78, 0.76],
    drop: 'beef_raw',
    dropMin: 1,
    dropMax: 3,
  },
  sheep: {
    name: 'Sheep',
    health: 8,
    width: 0.9,
    height: 1.25,
    speed: 1.0,
    body: [0.93, 0.93, 0.91],
    head: [0.88, 0.85, 0.82],
    snout: [0.7, 0.64, 0.6],
    drop: 'mutton_raw',
    dropMin: 1,
    dropMax: 2,
  },
  chicken: {
    name: 'Chicken',
    health: 4,
    width: 0.55,
    height: 0.75,
    speed: 0.8,
    body: [0.97, 0.97, 0.93],
    head: [0.98, 0.96, 0.9],
    snout: [0.92, 0.55, 0.18],
    drop: 'chicken_raw',
    dropMin: 1,
    dropMax: 1,
  },
};

const rand = (min, max) => min + Math.random() * (max - min);

/** Slab test: distance along the ray where it enters the box, or null. */
export function rayBox(origin, dir, box, maxT = Infinity) {
  let near = 0;
  let far = maxT;
  for (const axis of ['x', 'y', 'z']) {
    const o = origin[axis];
    const d = dir[axis];
    const lo = box[`min${axis.toUpperCase()}`];
    const hi = box[`max${axis.toUpperCase()}`];
    if (Math.abs(d) < 1e-6) {
      if (o < lo || o > hi) return null;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    near = Math.max(near, t1);
    far = Math.min(far, t2);
    if (near > far) return null;
  }
  return near;
}

export class Mob {
  constructor(typeKey, x, y, z) {
    this.typeKey = typeKey;
    this.type = MOB_TYPES[typeKey];
    if (!this.type) throw new Error(`unknown mob ${typeKey}`);
    this.x = x;
    this.y = y;
    this.z = z;
    this.vy = 0;
    this.yaw = Math.random() * Math.PI * 2;
    this.heading = this.yaw;
    this.idle = true;
    this.thinkTimer = rand(0.2, 1.5);
    this.health = this.type.health;
    this.onGround = false;
    this.hurt = 0;
    this.knockX = 0;
    this.knockZ = 0;
  }

  bounds() {
    const half = this.type.width / 2;
    return {
      minX: this.x - half,
      maxX: this.x + half,
      minY: this.y,
      maxY: this.y + this.type.height,
      minZ: this.z - half,
      maxZ: this.z + half,
    };
  }

  /** Pick a new direction, or decide to stand still for a while. */
  think() {
    this.thinkTimer = rand(1.6, 4.2);
    this.idle = Math.random() < 0.3;
    this.heading = Math.random() * Math.PI * 2;
  }

  /** Would the body fit at this spot, or is there a wall (or a step) there? */
  blocked(world, x, z) {
    const half = this.type.width / 2;
    const feet = Math.floor(this.y + 0.1);
    const head = Math.floor(this.y + this.type.height - 0.1);
    for (const bx of [Math.floor(x - half + 0.01), Math.floor(x + half - 0.01)]) {
      for (const bz of [Math.floor(z - half + 0.01), Math.floor(z + half - 0.01)]) {
        for (let by = feet; by <= head; by++) {
          if (isSolid(world.getBlock(bx, by, bz))) return true;
        }
      }
    }
    return false;
  }

  update(dt, world) {
    if (this.hurt > 0) this.hurt = Math.max(0, this.hurt - dt);
    this.thinkTimer -= dt;
    if (this.thinkTimer <= 0) this.think();

    const speed = this.idle ? 0 : this.type.speed;
    this.knockX *= 0.86;
    this.knockZ *= 0.86;

    const feet = world.getBlock(Math.floor(this.x), Math.floor(this.y + 0.1), Math.floor(this.z));
    const inWater = feet === 8 || feet === 9;
    if (inWater) this.vy = Math.min(this.vy + 30 * dt, 2.4);
    else this.vy = Math.max(this.vy - GRAVITY * dt, -24);

    const stepX = (Math.sin(this.heading) * speed + this.knockX) * dt;
    const stepZ = (Math.cos(this.heading) * speed + this.knockZ) * dt;
    if (stepX) {
      if (!this.blocked(world, this.x + stepX, this.z)) this.x += stepX;
      else this.thinkTimer = 0;
    }
    if (stepZ) {
      if (!this.blocked(world, this.x, this.z + stepZ)) this.z += stepZ;
      else this.thinkTimer = 0;
    }
    if (speed > 0) {
      let diff = ((this.heading - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.yaw += diff * Math.min(1, dt * 6);
    }

    // A one block step up is a hop, not a wall.
    if (this.onGround && speed > 0) {
      const aheadX = this.x + Math.sin(this.heading) * 0.35;
      const aheadZ = this.z + Math.cos(this.heading) * 0.35;
      if (this.blocked(world, aheadX, aheadZ)) this.vy = 6.2;
    }

    let nextY = this.y + this.vy * dt;
    if (this.vy <= 0) {
      const below = Math.floor(nextY);
      if (isSolid(world.getBlock(Math.floor(this.x), below, Math.floor(this.z)))) {
        nextY = below + 1;
        this.vy = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false;
    }
    this.y = nextY;
  }

  /** Renderer boxes: a body, a head and a snout, turned to face the walk. */
  boxes() {
    const t = this.type;
    const bodySize = t.width * 0.95;
    const headSize = t.width * 0.62;
    const snoutSize = headSize * 0.5;
    const forwardX = Math.sin(this.yaw);
    const forwardZ = Math.cos(this.yaw);
    const bodyY = this.y + t.height * 0.5;
    const headY = this.y + t.height * 0.76;
    const reach = bodySize * 0.55;
    const snoutReach = reach + headSize * 0.45;
    return [
      { x: this.x, y: bodyY, z: this.z, size: bodySize, spin: this.yaw, color: t.body },
      { x: this.x + forwardX * reach, y: headY, z: this.z + forwardZ * reach, size: headSize, spin: this.yaw, color: t.head },
      {
        x: this.x + forwardX * snoutReach,
        y: headY,
        z: this.z + forwardZ * snoutReach,
        size: snoutSize,
        spin: this.yaw,
        color: t.snout,
      },
    ];
  }
}

export class Mobs {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.spawnTimer = 8;
  }

  get count() {
    return this.list.length;
  }

  clear() {
    this.list.length = 0;
  }

  spawn(typeKey, x, y, z) {
    if (this.list.length >= MAX_MOBS) return null;
    const mob = new Mob(typeKey, x, y, z);
    this.list.push(mob);
    return mob;
  }

  remove(mob) {
    const index = this.list.indexOf(mob);
    if (index >= 0) this.list.splice(index, 1);
  }

  /**
   * Highest standing spot in a column, scanning from `fromY` up a little and
   * down a lot, with two free blocks above it. Null when there is nowhere.
   */
  groundAt(x, z, fromY) {
    for (let y = fromY + 4; y >= fromY - 8 && y >= 0; y--) {
      if (!isSolid(this.world.getBlock(x, y, z))) continue;
      if (this.world.getBlock(x, y + 1, z) !== 0) continue;
      if (this.world.getBlock(x, y + 2, z) !== 0) continue;
      return y + 1;
    }
    return null;
  }

  /** Spread a handful of animals over the surface around the player. */
  spawnNear(player, { count = 1, radius = 16 } = {}) {
    const made = [];
    const kinds = Object.keys(MOB_TYPES);
    for (let i = 0; i < count; i++) {
      if (this.list.length >= MAX_MOBS) break;
      for (let tries = 0; tries < 24; tries++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 6 + Math.random() * radius;
        const x = Math.floor(player.x + Math.cos(angle) * distance);
        const z = Math.floor(player.z + Math.sin(angle) * distance);
        const y = this.groundAt(x, z, Math.floor(player.y));
        if (y === null) continue;
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        const mob = this.spawn(kind, x + 0.5, y, z + 0.5);
        if (mob) made.push(mob);
        break;
      }
    }
    return made;
  }

  update(dt, player = null) {
    for (const mob of this.list) mob.update(dt, this.world);
    if (!player) return;
    this.list = this.list.filter((mob) => Math.hypot(mob.x - player.x, mob.z - player.z) <= 64);
    this.spawnTimer -= dt;
    if (this.list.length < MAX_MOBS - 4 && this.spawnTimer <= 0) {
      this.spawnTimer = 10;
      this.spawnNear(player, { count: 1, radius: 30 });
    }
  }

  /** The closest animal the crosshair is on, within reach. */
  underCrosshair(player, reach = 3.4) {
    const dir = player.lookDirection();
    const origin = { x: player.x, y: player.eyeY(), z: player.z };
    let best = null;
    let bestT = reach;
    for (const mob of this.list) {
      const t = rayBox(origin, { x: dir[0], y: dir[1], z: dir[2] }, mob.bounds(), reach);
      if (t === null || t >= bestT) continue;
      bestT = t;
      best = mob;
    }
    return best;
  }

  /** Damage a mob. Returns true when this hit killed it. */
  hit(mob, damage, dir = null) {
    mob.health -= damage;
    mob.hurt = 0.35;
    if (dir) {
      mob.knockX += dir[0] * 5;
      mob.knockZ += dir[2] * 5;
      mob.vy = Math.max(mob.vy, 4.5);
    }
    return mob.health <= 0;
  }

  boxes() {
    const out = [];
    for (const mob of this.list) out.push(...mob.boxes());
    return out;
  }
}
