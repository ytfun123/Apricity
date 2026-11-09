// Survival systems without a browser: the vitals rules (hunger, regeneration,
// starvation, fall damage), the stack-based hotbar, and dropped items that rest
// on the ground and get picked up.
//
//   node test/survival.test.mjs

import assert from 'node:assert/strict';
import { Vitals, MAX_HEALTH, fallDamage, EXHAUSTION } from '../js/survival.js';
import {
  STACK_LIMIT,
  addToHotbar,
  countInHotbar,
  emptyHotbar,
  slot,
  slotIsEmpty,
  takeFromSlot,
} from '../js/inventory.js';
import { Drops, PICKUP_DELAY } from '../js/items.js';
import { World, CHUNK_VOLUME, blockIndex } from '../js/world.js';

const passed = [];
const check = (name, fn) => {
  fn();
  passed.push(name);
};

// ── vitals ────────────────────────────────────────────────────────────────

check('a new player starts fed and unhurt, with a clean hotbar', () => {
  const vitals = new Vitals();
  assert.equal(vitals.health, MAX_HEALTH);
  assert.equal(vitals.food, 20);
  assert.equal(vitals.dead, false);
  const hotbar = emptyHotbar();
  assert.equal(hotbar.length, 9);
  assert.ok(hotbar.every(slotIsEmpty), 'every slot starts empty');
});

check('fall damage is free for three blocks, then one per extra block', () => {
  assert.equal(fallDamage(2.9), 0);
  assert.equal(fallDamage(3), 0);
  assert.equal(fallDamage(4), 1);
  assert.equal(fallDamage(23.4), 20);
});

check('walking drains saturation before food', () => {
  const vitals = new Vitals();
  vitals.update(1 / 20, { distance: 400 });
  assert.equal(vitals.saturation, 4, 'one point of saturation went');
  assert.equal(vitals.food, 20, 'food is untouched while saturation lasts');
});

check('walking, sprinting and jumping cost 1.12.2 exhaustion', () => {
  const walk = new Vitals();
  walk.saturation = 0;
  walk.update(0.05, { distance: 400 });
  assert.equal(walk.food, 19, '400 m of walking is one food point');

  const sprint = new Vitals();
  sprint.saturation = 0;
  sprint.update(0.05, { distance: 40, sprinting: true });
  assert.equal(sprint.food, 19, 'sprinting is ten times as expensive');

  const jump = new Vitals();
  jump.update(0.05, { jumped: true });
  assert.equal(Number(jump.exhaustion.toFixed(4)), Number((EXHAUSTION.jump).toFixed(4)));
});

check('a full stomach regenerates one health every four seconds', () => {
  const vitals = new Vitals();
  vitals.health = 15;
  const events = vitals.update(4.01, {});
  assert.equal(vitals.health, 16);
  assert.equal(events.healed, 1);
});

check('regeneration needs food, and stops when hunger drops', () => {
  const vitals = new Vitals();
  vitals.health = 10;
  vitals.food = 10;
  vitals.update(20, {});
  assert.equal(vitals.health, 10);
});

check('starvation hurts but stops at half a heart, as on Normal', () => {
  const vitals = new Vitals();
  vitals.health = 5;
  vitals.food = 0;
  vitals.saturation = 0;
  for (let i = 0; i < 40; i++) vitals.update(1, {});
  assert.equal(vitals.health, 1);
  assert.equal(vitals.dead, false);
});

check('taking damage adds exhaustion and can kill', () => {
  const vitals = new Vitals();
  assert.equal(vitals.damage(3), 3);
  assert.equal(vitals.damage(3), 3);
  assert.equal(vitals.exhaustion, 0.6);
  vitals.damage(100);
  assert.equal(vitals.health, 0);
  assert.equal(vitals.dead, true);
  assert.equal(vitals.damage(1), 0, 'a dead player takes no more damage');
});

// ── hotbar stacks ─────────────────────────────────────────────────────────

check('picked-up blocks stack, then spill into the next slot', () => {
  const hotbar = emptyHotbar();
  addToHotbar(hotbar, 3, 2);
  assert.deepEqual({ ...hotbar[0] }, { id: 3, count: 2 });
  addToHotbar(hotbar, 3, 70);
  assert.equal(hotbar[0].count, STACK_LIMIT);
  assert.equal(hotbar[1].count, 8, 'the overflow goes to the next empty slot');
});

check('a full hotbar keeps what does not fit', () => {
  const hotbar = emptyHotbar();
  for (const entry of hotbar) {
    entry.id = 1;
    entry.count = STACK_LIMIT;
  }
  assert.equal(addToHotbar(hotbar, 2, 10), 10);
  assert.equal(countInHotbar(hotbar, 2), 0);
});

check('placing the last block of a stack empties the slot', () => {
  const entry = slot(5, 1);
  assert.equal(takeFromSlot(entry, 1), 1);
  assert.ok(slotIsEmpty(entry));
  assert.equal(entry.id, 0);
  assert.equal(takeFromSlot(entry, 1), 0);
});

// ── dropped items ─────────────────────────────────────────────────────────

const world = new World({ generate: false });
const chunk = new Uint8Array(CHUNK_VOLUME);
for (let x = 0; x < 16; x++) {
  for (let z = 0; z < 16; z++) chunk[blockIndex(x, 40, z)] = 1;
}
world.setChunk(0, 0, chunk);

const simulate = (drops, seconds, player) => {
  const step = 1 / 60;
  for (let t = 0; t < seconds; t += step) drops.update(step, player);
};

check('a dropped block falls and comes to rest on the floor', () => {
  const drops = new Drops(world);
  drops.spawn(3, 8.5, 45, 8.5, { vx: 0, vy: 0, vz: 0 });
  simulate(drops, 1.5, null);
  assert.equal(drops.count, 1, 'nothing picked it up');
  const y = drops.list[0].y;
  assert.ok(Math.abs(y - 41) < 0.02, `rests on top of the floor, at ${y}`);
});

check('an item cannot be collected during the pickup delay', () => {
  const drops = new Drops(world);
  drops.spawn(3, 8.5, 41, 8.5, { vx: 0, vy: 0, vz: 0 });
  const player = { x: 8.5, y: 41, z: 8.5 };
  simulate(drops, PICKUP_DELAY / 2, player);
  assert.equal(drops.count, 1);
});

check('walking over an item collects it', () => {
  const drops = new Drops(world);
  drops.spawn(3, 8.5, 41, 8.5, { vx: 0, vy: 0, vz: 0 });
  const player = { x: 8.5, y: 41, z: 8.5 };
  simulate(drops, PICKUP_DELAY + 0.4, player);
  const picked = drops.list.length === 0 ? [{ itemId: 3, count: 1 }] : [];
  assert.equal(drops.count, 0, 'the item left the world');
  assert.equal(picked[0].itemId, 3);
});

check('drops carry a colour and a spin for the renderer', () => {
  const drops = new Drops(world);
  drops.spawn(1, 4.5, 41, 4.5, { vx: 0, vy: 0, vz: 0 });
  simulate(drops, 0.5, null);
  const [cube] = drops.cubes();
  assert.ok(cube.size > 0);
  assert.ok(cube.spin > 0);
  assert.equal(cube.color.length, 3);
});

console.log(`PASS ${passed.length} checks`);
for (const name of passed) console.log(`  ok  ${name}`);
