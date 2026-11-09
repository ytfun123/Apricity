// Passive animals: pigs, cows, sheep, chickens and rabbits that wander the
// surface, can be hit, and drop the raw meat that keeps the hunger bar full.
//
// They are deliberately cheap — a wander clock, the same point physics the item
// drops use, and a handful of boxes per animal. No pathfinding, no biome rules:
// a mob is an animal standing on solid ground near the player.
//
// The boxes are the ones 1.12.2 itself builds for each animal: the same texture
// offset, the same addBox size, the same rotation point and tilt, so the skin
// lands on the animal the way it does in game.

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
    model: 'pig',
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
    model: 'cow',
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
    model: 'sheep',
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
    model: 'chicken',
  },
  rabbit: {
    name: 'Rabbit',
    health: 3,
    width: 0.45,
    height: 0.5,
    speed: 1.3,
    body: [0.45, 0.32, 0.22],
    head: [0.5, 0.36, 0.26],
    snout: [0.6, 0.45, 0.32],
    drop: 'rabbit_raw',
    dropMin: 1,
    dropMax: 1,
    model: 'rabbit',
  },
};

// ── animal models ──────────────────────────────────────────────────────────
//
// Vanilla model space measures y down from 24 at the feet and puts the animal's
// face at -z. Everything here is converted to this game's space on the way out:
// y runs up from the feet, +z is the way the animal faces, and one unit is a
// sixteenth of a block.

/** A vanilla box centre (y down, face at -z) in this game's space. */
const at = (x, y, z) => [x, 24 - y, -z];

const HALF_TURN = Math.PI / 2;

function rotate(v, rx, ry) {
  let [x, y, z] = v;
  if (rx) {
    const c = Math.cos(rx);
    const s = Math.sin(rx);
    [y, z] = [y * c - z * s, y * s + z * c];
  }
  if (ry) {
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    [x, z] = [x * c + z * s, -x * s + z * c];
  }
  return [x, y, z];
}

/**
 * One box of a vanilla model: `uv` is the texture offset its ModelRenderer was
 * built with, `size` the addBox dimensions, `centre` the box centre in vanilla
 * model space, `grow` the inflate on every side (the sheep's wool uses it) and
 * `rx` / `ry` the tilt the model gives it.
 *
 * The six faces, their corner order and the rectangle of skin each one reads are
 * a straight port of ModelBox and TexturedQuad, so a box shows exactly the patch
 * of skin it shows in game — which is the whole point of copying the textures.
 */
function box(uv, size, centre, { grow = 0, rx = 0, ry = 0 } = {}) {
  const [w, h, d] = size;
  const hw = w / 2 + grow;
  const hh = h / 2 + grow;
  const hd = d / 2 + grow;
  const [u, v] = uv;
  const corner = [
    [-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd],
    [-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd],
  ];
  const [a0, a1, a2, a3, a4, a5, a6, a7] = corner;
  // Face order and skin rectangles exactly as ModelBox lays them out: a depth
  // column, a width column, another depth column and another width column for
  // the sides, with the top and bottom pair above them.
  const quads = [
    [[a5, a1, a2, a6], [u + d + w, v + d, u + d + w + d, v + d + h]],
    [[a0, a4, a7, a3], [u, v + d, u + d, v + d + h]],
    [[a5, a4, a0, a1], [u + d, v, u + d + w, v + d]],
    [[a2, a3, a7, a6], [u + d + w, v + d, u + d + w + w, v]],
    [[a1, a0, a3, a2], [u + d, v + d, u + d + w, v + d + h]],
    [[a4, a5, a6, a7], [u + d + w + d, v + d, u + d + w + d + w, v + d + h]],
  ];

  const faces = [];
  for (const [quad, [ux1, vy1, ux2, vy2]] of quads) {
    let pos = quad.map(([x, y, z]) => {
      const r = rotate([x, y, z], rx, ry);
      return [r[0], -r[1], -r[2]];
    });
    // TexturedQuad hands the corners (u2,v1), (u1,v1), (u1,v2), (u2,v2).
    let uvCorners = [[ux2, vy1], [ux1, vy1], [ux1, vy2], [ux2, vy2]];

    // The outward normal of the box's own face, so the face is shaded and wound
    // the same way a block face is. A face's corners average to a point on the
    // outside, which is all it takes to know which way is out of the box.
    const [p0, p1, p2] = pos;
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const normal = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];
    const out = pos.reduce((sum, p) => [sum[0] + p[0] / 4, sum[1] + p[1] / 4, sum[2] + p[2] / 4], [0, 0, 0]);
    if (normal[0] * out[0] + normal[1] * out[1] + normal[2] * out[2] < 0) {
      pos = pos.reverse();
      uvCorners = uvCorners.reverse();
      normal[0] = -normal[0];
      normal[1] = -normal[1];
      normal[2] = -normal[2];
    }

    const ax = Math.abs(normal[0]);
    const ay = Math.abs(normal[1]);
    const az = Math.abs(normal[2]);
    let shade = 0.8;
    if (ay >= ax && ay >= az) shade = normal[1] > 0 ? 1 : 0.5;
    else if (ax >= az) shade = 0.65;

    faces.push({ pos, uv: uvCorners, shade });
  }
  return { at: at(...centre), size, faces };
}

/**
 * The stock four-legged animal of 1.12.2: a head, a body that is modelled
 * upright and then tipped a quarter turn (which is why a pig is long and not
 * tall) and four legs as tall as the model's leg height.
 */
function quadruped(legHeight) {
  const legTop = 24 - legHeight / 2;
  return [
    box([0, 0], [8, 8, 8], [0, 18 - legHeight, -10]),
    box([28, 8], [10, 16, 8], [0, 20 - legHeight, 0], { rx: HALF_TURN }),
    box([0, 16], [4, legHeight, 4], [-3, legTop, 7]),
    box([0, 16], [4, legHeight, 4], [3, legTop, 7]),
    box([0, 16], [4, legHeight, 4], [-3, legTop, -5]),
    box([0, 16], [4, legHeight, 4], [3, legTop, -5]),
  ];
}

const MODELS = {
  pig: {
    texture: 'pig',
    scale: 1,
    parts: [
      ...quadruped(6),
      box([16, 16], [4, 3, 1], [0, 13.5, -14.5]),
    ],
  },
  cow: {
    texture: 'cow',
    scale: 1,
    parts: [
      box([0, 0], [8, 8, 6], [0, 4, -11]),
      box([22, 0], [1, 3, 1], [-4.5, 0.5, -11.5]),
      box([22, 0], [1, 3, 1], [4.5, 0.5, -11.5]),
      box([18, 4], [12, 18, 10], [0, 7, 1], { rx: HALF_TURN }),
      box([52, 0], [4, 6, 1], [0, 12.5, 7], { rx: HALF_TURN }),
      box([0, 16], [4, 12, 4], [-4, 18, 7]),
      box([0, 16], [4, 12, 4], [4, 18, 7]),
      box([0, 16], [4, 12, 4], [-4, 18, -6]),
      box([0, 16], [4, 12, 4], [4, 18, -6]),
    ],
  },
  // A sheep in game is the wool coat, ModelSheep2, over the shaved skin. The
  // wool is thinner than the skin it covers, which is what the grow is for.
  sheep: {
    texture: 'sheep_fur',
    scale: 1,
    parts: [
      box([0, 0], [6, 6, 8], [0, 5, -10], { grow: 0.6 }),
      box([28, 8], [8, 16, 6], [0, 9, 0], { grow: 1.75, rx: HALF_TURN }),
      box([0, 16], [4, 12, 4], [-3, 18, 7]),
      box([0, 16], [4, 12, 4], [3, 18, 7]),
      box([0, 16], [4, 12, 4], [-3, 18, -5]),
      box([0, 16], [4, 12, 4], [3, 18, -5]),
    ],
  },
  chicken: {
    texture: 'chicken',
    scale: 1,
    parts: [
      box([0, 0], [4, 6, 3], [0, 12, -4.5]),
      box([14, 0], [4, 2, 2], [0, 12, -7]),
      box([14, 4], [2, 2, 2], [0, 14, -6]),
      box([0, 9], [6, 8, 6], [0, 16, 0], { rx: HALF_TURN }),
      box([26, 0], [3, 5, 3], [-1.5, 21.5, -0.5]),
      box([26, 0], [3, 5, 3], [1.5, 21.5, -0.5]),
      box([24, 13], [1, 4, 6], [-3.5, 15, 0]),
      box([24, 13], [1, 4, 6], [3.5, 15, 0]),
    ],
  },
  // The rabbit is its own model: a slim body tipped forward, a separate nose,
  // two long ears splayed apart, and arms and thighs on their own tilts.
  rabbit: {
    texture: 'rabbit',
    scale: 1,
    parts: [
      box([0, 0], [6, 5, 10], [0, 17.7597, 3.1305], { rx: -0.34906584 }),
      box([32, 0], [5, 4, 5], [0, 14, -3.5]),
      box([32, 9], [1, 1, 1], [0, 14, -6]),
      box([52, 0], [2, 5, 1], [-1.32, 9.5, -1.87], { ry: -0.2617994 }),
      box([58, 0], [2, 5, 1], [1.32, 9.5, -1.87], { ry: 0.2617994 }),
      box([26, 24], [2, 1, 7], [3, 23, 3.5]),
      box([8, 24], [2, 1, 7], [-3, 23, 3.5]),
      box([30, 15], [2, 4, 5], [3, 20.234, 5.3652], { rx: -0.34906584 }),
      box([16, 15], [2, 4, 5], [-3, 20.234, 5.3652], { rx: -0.34906584 }),
      box([8, 15], [2, 7, 2], [3, 20.4472, -1.608], { rx: -0.17453292 }),
      box([0, 15], [2, 7, 2], [-3, 20.4472, -1.608], { rx: -0.17453292 }),
      box([52, 6], [3, 3, 2], [0, 20.342, 7.9397], { rx: -0.3490659 }),
    ],
  },
};

export const MOB_MODELS = MODELS;

// Model units per block. Faces are scaled once per animal rather than on every
// frame, since a model never changes shape.
const scaledModels = new Map();

function scaledParts(model) {
  let cached = scaledModels.get(model);
  if (cached) return cached;
  const k = model.scale / 16;
  cached = model.parts.map((part) => ({
    at: part.at,
    faces: part.faces.map((face) => ({
      shade: face.shade,
      pos: face.pos.map(([x, y, z]) => [x * k, y * k, z * k]),
      uv: face.uv,
    })),
  }));
  scaledModels.set(model, cached);
  return cached;
}

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

  /**
   * The textured parts for the renderer: every box of the model, turned to face
   * the walk, with the six faces it samples out of the animal's own skin.
   */
  parts() {
    const model = MODELS[this.type.model];
    if (!model) return [];
    const k = model.scale / 16;
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    const out = [];
    for (const part of scaledParts(model)) {
      const [px, py, pz] = part.at;
      out.push({
        mob: model.texture,
        x: this.x + (px * cos - pz * sin) * k,
        y: this.y + py * k,
        z: this.z + (px * sin + pz * cos) * k,
        yaw: this.yaw,
        faces: part.faces,
      });
    }
    return out;
  }

  /**
   * The same animal as plain coloured boxes, for when the entity textures are
   * missing: a body, a head and a snout, turned to face the walk.
   */
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

  /** Every animal part, textured from the entity atlas. */
  parts() {
    const out = [];
    for (const mob of this.list) out.push(...mob.parts());
    return out;
  }
}
