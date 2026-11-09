// Block physics: sand and gravel fall, water and lava flow and dry up when the
// source goes away. Runs against a fake world, so no chunks or rendering here.
//
//   node test/physics.test.mjs

import assert from 'node:assert/strict';
import { BlockPhysics, FALLING, WATER, WATER_FLOW, LAVA, LAVA_FLOW } from '../js/physics.js';
import { isSolid } from '../js/blocks.js';

const k = (x, y, z) => `${x},${y},${z}`;

class FakeWorld {
  constructor() {
    this.blocks = new Map();
    this.onBlockSet = null;
  }
  getBlock(x, y, z) {
    return this.blocks.get(k(x, y, z)) ?? 0;
  }
  setBlock(x, y, z, id) {
    if (id) this.blocks.set(k(x, y, z), id);
    else this.blocks.delete(k(x, y, z));
    this.onBlockSet?.(x, y, z, id);
    return true;
  }
  isSolid(x, y, z) {
    return isSolid(this.getBlock(x, y, z));
  }
  place(x, y, z, id) {
    this.setBlock(x, y, z, id);
    return this;
  }
  floor(id = 1, radius = 10, y = 0) {
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) this.place(x, y, z, id);
    }
    return this;
  }
}

function make(world) {
  const physics = new BlockPhysics(world);
  world.onBlockSet = (x, y, z) => physics.touch(x, y, z);
  return physics;
}

const steps = (physics, n, fn) => {
  for (let i = 0; i < n; i++) {
    physics.stepFalls();
    if (fn) fn(physics, i);
  }
};
const fluidSteps = (physics, n, kind = 'water') => {
  for (let i = 0; i < n; i++) physics.stepFluids(kind);
};

const passed = [];
function check(name, fn) {
  fn();
  passed.push(name);
}

check('sand falls to the floor and stops', () => {
  const world = new FakeWorld().floor();
  const physics = make(world);
  world.place(0, 5, 0, 12);
  steps(physics, 12);
  assert.equal(world.getBlock(0, 1, 0), 12, 'sand came to rest on the floor');
  assert.equal(world.getBlock(0, 5, 0), 0, 'and left the air above empty');
});

check('gravel falls too', () => {
  const world = new FakeWorld().floor();
  const physics = make(world);
  world.place(2, 4, 2, 13);
  steps(physics, 12);
  assert.equal(world.getBlock(2, 1, 2), 13);
});

check('a sand stack lands in a column, top last', () => {
  const world = new FakeWorld().floor();
  const physics = make(world);
  for (const y of [4, 5, 6]) world.place(0, y, 0, 12);
  steps(physics, 30);
  assert.deepEqual([1, 2, 3].map((y) => world.getBlock(0, y, 0)), [12, 12, 12]);
  assert.equal(world.getBlock(0, 4, 0), 0);
});

check('sand rests on any solid block and does not sink', () => {
  const world = new FakeWorld();
  world.place(0, 0, 0, 4); // cobblestone
  const physics = make(world);
  world.place(0, 6, 0, 12);
  steps(physics, 20);
  assert.equal(world.getBlock(0, 1, 0), 12);
  assert.equal(world.getBlock(0, 0, 0), 4);
});

check('sand sinks through water and lands on the bottom', () => {
  const world = new FakeWorld().floor();
  for (const y of [1, 2, 3]) world.place(0, y, 0, WATER);
  const physics = make(world);
  world.place(0, 5, 0, 12);
  steps(physics, 20);
  assert.equal(world.getBlock(0, 1, 0), 12, 'sand displaces the water at the bottom');
  assert.equal(world.getBlock(0, 2, 0), WATER);
});

check('water spreads seven blocks across a floor', () => {
  const world = new FakeWorld().floor();
  const physics = make(world);
  world.place(0, 1, 0, WATER);
  fluidSteps(physics, 12);
  const cells = [...world.blocks.entries()].filter(([, id]) => id === WATER || id === WATER_FLOW);
  const reach = Math.max(...cells.map(([cell]) => {
    const [x, , z] = cell.split(',').map(Number);
    return Math.abs(x) + Math.abs(z);
  }));
  assert.equal(cells.length, 113, 'a seven block diamond of water, source included');
  assert.equal(reach, 7);
});

check('lava only reaches three blocks', () => {
  const world = new FakeWorld().floor();
  const physics = make(world);
  world.place(0, 1, 0, LAVA);
  fluidSteps(physics, 8, 'lava');
  const cells = [...world.blocks.entries()].filter(([, id]) => id === LAVA || id === LAVA_FLOW);
  const reach = Math.max(...cells.map(([cell]) => {
    const [x, , z] = cell.split(',').map(Number);
    return Math.abs(x) + Math.abs(z);
  }));
  assert.equal(reach, 3);
  assert.equal(cells.length, 25);
});

check('water runs down a hole instead of spreading on top', () => {
  const world = new FakeWorld();
  world.floor(1, 2, 0);
  world.place(0, 0, 0, 0); // the hole
  const physics = make(world);
  world.place(0, 1, 0, WATER);
  fluidSteps(physics, 4);
  assert.equal(world.getBlock(0, 0, 0), WATER_FLOW, 'water fell into the hole');
});

check('water does not flow into solid blocks', () => {
  const world = new FakeWorld().floor();
  world.place(1, 1, 0, 1);
  const physics = make(world);
  world.place(0, 1, 0, WATER);
  fluidSteps(physics, 12);
  assert.equal(world.getBlock(1, 1, 0), 1);
  assert.ok(world.getBlock(1, 2, 0) === 0 || world.getBlock(1, 2, 0) === WATER_FLOW);
});

check('removing the source drains the flow', () => {
  const world = new FakeWorld().floor();
  const physics = make(world);
  world.place(0, 1, 0, WATER);
  fluidSteps(physics, 12);
  const before = [...world.blocks.values()].filter((id) => id === WATER_FLOW).length;
  assert.ok(before > 0, 'there is flow to drain');
  world.place(0, 1, 0, 0);
  fluidSteps(physics, 24);
  const after = [...world.blocks.values()].filter((id) => id === WATER_FLOW).length;
  assert.equal(after, 0, 'all flowing water dried up');
});

check('water running into lava makes cobblestone', () => {
  const world = new FakeWorld().floor();
  const physics = make(world);
  world.place(3, 1, 0, LAVA);
  world.place(0, 1, 0, WATER);
  fluidSteps(physics, 12);
  assert.equal(world.getBlock(3, 1, 0), 4);
});

check('only sand and gravel are in the falling set', () => {
  assert.deepEqual([...FALLING].sort((a, b) => a - b), [12, 13]);
});

check('the clocks step on their own timers', () => {
  const world = new FakeWorld().floor();
  const physics = make(world);
  world.place(0, 5, 0, 12);
  physics.tick(0.05); // shorter than FALL_STEP
  assert.equal(world.getBlock(0, 5, 0), 12, 'nothing moved yet');
  physics.tick(0.1);
  assert.equal(world.getBlock(0, 5, 0), 0, 'the sand dropped once the clock ran out');
});

check('breaking the floor under the last cell lets the flow carry on', () => {
  // Ground at y=2 with a one block room underneath it, so a hole in the ground
  // has somewhere for the water to go.
  const world = new FakeWorld().floor(1, 16, 0).floor(1, 16, 2);
  const physics = make(world);
  world.place(0, 3, 0, WATER);
  fluidSteps(physics, 30);
  assert.equal(world.getBlock(7, 3, 0), WATER_FLOW, 'the stream reached its seventh block');
  assert.equal(world.getBlock(8, 3, 0), 0, 'and could not go further');

  // Dig the ground out from under the last cell: the water falls into the room,
  // and landing resets its distance from the source, so it spreads seven more
  // blocks across the room floor instead of stopping dead.
  world.place(7, 2, 0, 0);
  fluidSteps(physics, 60);
  assert.equal(world.getBlock(7, 1, 0), WATER_FLOW, 'the water dropped into the room');
  assert.equal(world.getBlock(7, 3, 0), WATER_FLOW, 'the cell above the hole still feeds the fall');
  assert.equal(world.getBlock(12, 1, 0), WATER_FLOW, 'the new pool spread five blocks out');
  assert.equal(world.getBlock(14, 1, 0), WATER_FLOW, 'and all the way to seven');
});

console.log(`physics: PASS ${passed.length}`);
for (const name of passed) console.log(`  ok  ${name}`);
