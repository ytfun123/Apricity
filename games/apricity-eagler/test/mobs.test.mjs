// The animals: they stand on the ground, wander, can be picked with the
// crosshair and hit until they drop the raw meat that survival eats.
//
//   node test/mobs.test.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_MOBS, MOB_MODELS, MOB_TYPES, Mobs, rayBox } from '../js/mobs.js';

const k = (x, y, z) => `${x},${y},${z}`;

class FakeWorld {
  constructor() {
    this.blocks = new Map();
  }
  getBlock(x, y, z) {
    return this.blocks.get(k(x, y, z)) ?? 0;
  }
  set(x, y, z, id) {
    this.blocks.set(k(x, y, z), id);
    return this;
  }
  floor(y = 0, radius = 40, id = 1) {
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) this.set(x, y, z, id);
    }
    return this;
  }
}

const world = () => new FakeWorld().floor(0);

const player = {
  x: 0.5,
  y: 1,
  z: 0.5,
  eyeY() {
    return this.y + 1.62;
  },
  lookDirection() {
    return [0, 0, 1];
  },
};

// Eye height 1.62 above a whole block, so a level look meets an animal's body.
const looker = { ...player, y: 0, eyeY: () => 1.62 };

const run = (mobs, seconds, p = null) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) mobs.update(1 / 60, p);
};

const passed = [];
function check(name, fn) {
  fn();
  passed.push(name);
}

check('an animal dropped in the air lands on the ground and stays there', () => {
  const mobs = new Mobs(world());
  const pig = mobs.spawn('pig', 0.5, 6, 0.5);
  run(mobs, 3);
  assert.ok(Math.abs(pig.y - 1) < 0.01, `pig ended at y ${pig.y}`);
});

check('they wander around without sinking or flying off', () => {
  const mobs = new Mobs(world());
  const cow = mobs.spawn('cow', 0.5, 1, 0.5);
  run(mobs, 6);
  assert.ok(Math.abs(cow.y - 1) < 0.02, `cow ended at y ${cow.y}`);
  assert.ok(Number.isFinite(cow.x) && Number.isFinite(cow.z));
});

check('a wall stops them', () => {
  const scene = world();
  for (let y = 1; y <= 3; y++) for (let z = -3; z <= 3; z++) scene.set(3, y, z, 1);
  const mobs = new Mobs(scene);
  const sheep = mobs.spawn('sheep', 2.2, 1, 0.5);
  run(mobs, 4);
  assert.ok(sheep.x < 3, `sheep walked through the wall to x ${sheep.x}`);
});

check('the crosshair picks the animal in front of it', () => {
  const mobs = new Mobs(world());
  const mob = mobs.spawn('pig', 0.5, 1, 2.5);
  assert.equal(mobs.underCrosshair(looker, 3.4), mob, 'looking straight at it');

  const behind = { ...looker, lookDirection: () => [0, 0, -1] };
  assert.equal(mobs.underCrosshair(behind, 3.4), null, 'nothing behind you');
});

check('reach is limited', () => {
  const mobs = new Mobs(world());
  mobs.spawn('cow', 0.5, 1, 12.5);
  assert.equal(mobs.underCrosshair(looker, 3.4), null);
});

check('hits take health and the last one kills', () => {
  const mobs = new Mobs(world());
  const cow = mobs.spawn('cow', 0.5, 1, 0.5);
  assert.equal(mobs.hit(cow, 4, [0, 0, 1]), false);
  assert.equal(cow.health, 6);
  assert.equal(mobs.hit(cow, 4, [0, 0, 1]), false);
  assert.equal(mobs.hit(cow, 4, [0, 0, 1]), true, 'the third hit kills');
});

check('removing a mob takes it out of the list and the boxes', () => {
  const mobs = new Mobs(world());
  const mob = mobs.spawn('chicken', 0.5, 1, 0.5);
  assert.equal(mobs.boxes().length, 3);
  mobs.remove(mob);
  assert.equal(mobs.count, 0);
  assert.equal(mobs.boxes().length, 0);
});

check('spawning puts animals on solid ground near the player', () => {
  const mobs = new Mobs(world());
  const made = mobs.spawnNear(player, { count: 4, radius: 12 });
  assert.ok(made.length >= 1, 'at least one animal found a spot');
  for (const mob of made) {
    assert.ok(Math.abs(mob.y - 1) < 0.01, `${mob.type.name} spawned at y ${mob.y}`);
    assert.equal(mob.health, mob.type.health);
  }
});

check('the population is capped', () => {
  const mobs = new Mobs(world());
  mobs.spawnNear(player, { count: 40, radius: 20 });
  assert.ok(mobs.count <= MAX_MOBS, `${mobs.count} animals`);
});

check('animals left far behind are dropped', () => {
  const mobs = new Mobs(world());
  const far = mobs.spawn('pig', 300.5, 1, 300.5);
  mobs.update(1 / 60, player);
  assert.ok(!mobs.list.includes(far), 'the far animal was removed');
});

check('every animal drops meat that exists in the pack', () => {
  const registry = JSON.parse(readFileSync(new URL('../assets/registry.json', import.meta.url), 'utf8'));
  const keys = new Set(registry.items.map((item) => item.key));
  for (const [kind, type] of Object.entries(MOB_TYPES)) {
    assert.ok(keys.has(type.drop), `${kind} drops ${type.drop}, which is not an item`);
    assert.ok(type.dropMax >= type.dropMin);
    assert.ok(type.health > 0 && type.width > 0 && type.height > 0);
  }
});

check('every animal has a textured model that fits inside its own skin', () => {
  const atlas = JSON.parse(readFileSync(new URL('../assets/mob-atlas.json', import.meta.url), 'utf8'));
  for (const [kind, type] of Object.entries(MOB_TYPES)) {
    const model = MOB_MODELS[type.model];
    assert.ok(model, `${kind} has no model`);
    assert.ok(atlas.mobs[type.model], `${type.model} is not in the mob atlas`);
    assert.ok(model.parts.length >= 3, `${kind} has only ${model.parts.length} parts`);
    for (const part of model.parts) {
      const [w, h, d] = part.size;
      const [u, v] = part.uv;
      // A box unwraps into two depth columns and two width columns side by side,
      // with the top and bottom pair above them, so it has to fit the 64x32 skin.
      assert.ok(u + 2 * d + 2 * w <= 64, `${kind} part at u=${u} runs off the skin`);
      assert.ok(v + d + h <= 32, `${kind} part at v=${v} runs off the skin`);
      assert.ok(part.at.every((n) => Number.isFinite(n)), `${kind} part has no position`);
    }
  }
});

check('parts are turned, scaled and sample the atlas', () => {
  const mobs = new Mobs(world());
  const pig = mobs.spawn('pig', 0.5, 1, 0.5);
  const parts = pig.parts();
  assert.equal(parts.length, MOB_MODELS.pig.parts.length);
  for (const part of parts) {
    assert.equal(part.mob, 'pig');
    assert.equal(part.uv.length, 2);
    assert.equal(part.px.length, 3);
    assert.ok(part.size.every((s) => s > 0), 'part has volume');
    assert.ok(part.y > 0.9 && part.y < 2.4, `part sits at y ${part.y}`);
  }
});

check('the render boxes carry a size and a colour', () => {
  const mobs = new Mobs(world());
  mobs.spawn('pig', 0.5, 1, 0.5);
  const boxes = mobs.boxes();
  assert.equal(boxes.length, 3);
  for (const box of boxes) {
    assert.ok(box.size > 0);
    assert.equal(box.color.length, 3);
    assert.ok(Number.isFinite(box.y));
  }
});

check('the ray test agrees with a simple box', () => {
  const box = { minX: -0.5, maxX: 0.5, minY: 0, maxY: 1, minZ: 2, maxZ: 3 };
  const hit = rayBox({ x: 0, y: 0.5, z: 0 }, { x: 0, y: 0, z: 1 }, box, 5);
  assert.ok(Math.abs(hit - 2) < 1e-6, `hit at ${hit}`);
  assert.equal(rayBox({ x: 5, y: 0.5, z: 0 }, { x: 0, y: 0, z: 1 }, box, 5), null);
});

console.log(`PASS ${passed.length} checks`);
for (const name of passed) console.log(`  ok  ${name}`);
