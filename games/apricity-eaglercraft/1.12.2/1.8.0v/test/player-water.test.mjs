// Getting out of water must not depend on which way you happen to be looking.
// In 1.12.2 the surface floats you just under a one block lip, so walking into
// the bank carries you onto it. These checks drive the player against a bank at
// several pitches, and make sure deep water does not become a ladder.
//
//   node test/player-water.test.mjs

import assert from 'node:assert/strict';
import { Player } from '../js/player.js';

const k = (x, y, z) => `${x},${y},${z}`;

const WATER = 8;
const STONE = 1;

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
  surfaceAt() {
    return 64;
  }
}

/** Water filling 61..63, a floor at 60, and a bank on the +x side. */
function pond({ lip = 64 } = {}) {
  const world = new FakeWorld();
  for (let x = -4; x <= 4; x++) {
    for (let z = -2; z <= 2; z++) world.set(x, 60, z, STONE);
  }
  for (let x = -4; x <= 0; x++) {
    for (let z = -2; z <= 2; z++) {
      for (let y = 61; y <= 63; y++) world.set(x, y, z, WATER);
    }
  }
  for (let x = 1; x <= 4; x++) {
    for (let z = -2; z <= 2; z++) {
      for (let y = 61; y < lip; y++) world.set(x, y, z, STONE);
    }
  }
  return world;
}

const input = { forward: true, back: false, left: false, right: false, jump: false, sprint: false };
const swim = { ...input, jump: true };

function swimmer(world, { x = 0.7, y = 63.7, pitch = 0 } = {}) {
  const player = new Player(world);
  player.x = x;
  player.y = y;
  player.z = 0.5;
  player.yaw = -Math.PI / 2; // forward is +x, straight into the bank
  player.pitch = pitch;
  return player;
}

const run = (player, frames = 30, held = input) => {
  for (let i = 0; i < frames; i++) player.update(1 / 60, held);
};

const passed = [];
function check(name, fn) {
  fn();
  passed.push(name);
}

check('a swimmer at the surface steps onto the shore at any pitch', () => {
  for (const pitch of [-1.5, -0.8, 0, 0.8, 1.5]) {
    const player = swimmer(pond(), { pitch });
    run(player, 20);
    assert.ok(player.y >= 63.999, `pitch ${pitch}: stuck at y ${player.y}`);
    assert.ok(player.x > 1, `pitch ${pitch}: did not reach the shore (x ${player.x})`);
    assert.equal(player.inWater, false, `pitch ${pitch}: still in the water`);
  }
});

check('holding jump from the bottom swims up and out', () => {
  const player = swimmer(pond(), { y: 61.4 });
  run(player, 120, swim);
  assert.ok(player.y >= 63.999, `y ${player.y}`);
  assert.ok(player.x > 1, `x ${player.x}`);
});

check('deep water does not turn a wall into a ladder', () => {
  const player = swimmer(pond(), { y: 61.4 });
  run(player, 30);
  assert.ok(player.y < 62.5, `climbed to y ${player.y}`);
  assert.ok(player.x < 1, `moved into the bank (x ${player.x})`);
});

check('a two block bank is not a step out', () => {
  const player = swimmer(pond({ lip: 65 }), { y: 63.7 });
  run(player, 30, swim);
  assert.ok(player.y < 64, `climbed to y ${player.y}`);
});

check('dry land gets no step up help', () => {
  const world = pond();
  const player = swimmer(world, { x: 0.7, y: 64.2 });
  const y = player.y;
  run(player, 10, { ...input, jump: false });
  assert.ok(player.y <= y + 1e-6, 'the player did not rise');
});

console.log(`PASS ${passed.length} checks`);
for (const name of passed) console.log(`  ok  ${name}`);
