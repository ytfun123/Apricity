// 1.12.2 drops without a browser: which tool harvests what, and what each block
// actually leaves behind (ores dropping their mineral, leaves giving saplings
// instead of themselves, stone needing a pickaxe).
//
//   node test/drops.test.mjs

import assert from 'node:assert/strict';
import { canHarvest, dropsFor, harvestNeed, toolInfo } from '../js/drops.js';

const passed = [];
const check = (name, fn) => {
  fn();
  passed.push(name);
};

const names = (drops) => drops.map((drop) => drop.name);
const always = () => 0; // every chance roll succeeds
const never = () => 0.99; // every chance roll fails

// ── tools ──────────────────────────────────────────────────────────────────

check('tool keys map to a class and a 1.12.2 tier', () => {
  assert.deepEqual(toolInfo('wood_pickaxe'), { type: 'pickaxe', tier: 1 });
  assert.deepEqual(toolInfo('stone_pickaxe'), { type: 'pickaxe', tier: 2 });
  assert.deepEqual(toolInfo('iron_axe'), { type: 'axe', tier: 3 });
  assert.deepEqual(toolInfo('diamond_shovel'), { type: 'shovel', tier: 4 });
  assert.deepEqual(toolInfo('gold_pickaxe'), { type: 'pickaxe', tier: 1 });
  assert.deepEqual(toolInfo('shears'), { type: 'shears', tier: 1 });
  assert.equal(toolInfo('apple'), null);
  assert.equal(toolInfo(null), null);
});

// ── harvest requirements ───────────────────────────────────────────────────

check('stone and cobblestone need a pickaxe to drop anything', () => {
  assert.deepEqual(dropsFor(1, { heldKey: null }), []);
  assert.deepEqual(dropsFor(4, { heldKey: null }), []);
  assert.deepEqual(names(dropsFor(1, { heldKey: 'wood_pickaxe' })), ['Cobblestone']);
  assert.deepEqual(names(dropsFor(4, { heldKey: 'wood_pickaxe' })), ['Cobblestone']);
});

check('the wrong tool class is no better than a bare hand', () => {
  assert.deepEqual(dropsFor(1, { heldKey: 'wood_axe' }), []);
  assert.deepEqual(dropsFor(3, { heldKey: 'wood_pickaxe' }), [{ kind: 'block', name: 'Dirt', count: 1 }]);
});

check('diamond ore wants iron or better, coal ore takes wood', () => {
  assert.deepEqual(dropsFor(56, { heldKey: 'stone_pickaxe' }), []);
  assert.deepEqual(names(dropsFor(56, { heldKey: 'iron_pickaxe' })), ['diamond']);
  assert.deepEqual(names(dropsFor(56, { heldKey: 'diamond_pickaxe' })), ['diamond']);
  assert.deepEqual(names(dropsFor(16, { heldKey: 'wood_pickaxe' })), ['coal']);
  assert.deepEqual(dropsFor(16, { heldKey: null }), []);
});

check('iron and gold ore drop the ore block, not an ingot', () => {
  assert.deepEqual(names(dropsFor(15, { heldKey: 'stone_pickaxe' })), ['Iron Ore']);
  assert.deepEqual(names(dropsFor(14, { heldKey: 'stone_pickaxe' })), []);
  assert.deepEqual(names(dropsFor(14, { heldKey: 'iron_pickaxe' })), ['Gold Ore']);
});

check('the tool a block needs is reported for the hint', () => {
  assert.deepEqual(harvestNeed(1), { tool: 'pickaxe', tier: 1 });
  assert.deepEqual(harvestNeed(56), { tool: 'pickaxe', tier: 3 });
  assert.equal(harvestNeed(3)?.tool, 'shovel');
  assert.equal(harvestNeed(12)?.tool, 'shovel');
  assert.deepEqual(harvestNeed(18), { tool: 'shears', tier: 0 }, 'leaves only want shears for the block itself');
});

check('bedrock and glass give nothing no matter what you hold', () => {
  assert.deepEqual(dropsFor(7, { heldKey: 'diamond_pickaxe' }), []);
  assert.deepEqual(dropsFor(20, { heldKey: 'diamond_pickaxe' }), []);
  assert.equal(canHarvest(7, 'diamond_pickaxe'), false);
});

// ── ores ───────────────────────────────────────────────────────────────────

check('ores drop their own mineral', () => {
  assert.deepEqual(names(dropsFor(129, { heldKey: 'iron_pickaxe' })), ['emerald']);
  assert.deepEqual(names(dropsFor(153, { heldKey: 'wood_pickaxe' })), ['quartz']);
  const lapis = dropsFor(21, { heldKey: 'stone_pickaxe', rand: always });
  assert.equal(lapis[0].name, 'dye_powder_blue');
  assert.equal(lapis[0].count, 4);
  const redstone = dropsFor(73, { heldKey: 'iron_pickaxe', rand: never });
  assert.equal(redstone[0].name, 'redstone_dust');
  assert.equal(redstone[0].count, 5);
});

// ── leaves: saplings, apples and sticks instead of the block ───────────────

check('leaves by hand give saplings, apples and sticks, never the leaf block', () => {
  const all = dropsFor(18, { heldKey: null, rand: always });
  assert.deepEqual(names(all), ['Oak Sapling', 'apple', 'stick']);
  assert.equal(all[0].kind, 'block', 'the sapling comes back as a placeable block');
  assert.deepEqual(dropsFor(18, { heldKey: null, rand: never }), []);
  const spruce = dropsFor(161, { heldKey: null, rand: always });
  assert.deepEqual(names(spruce), ['Oak Sapling', 'stick']);
});

check('shears are the only way to get the leaf block itself', () => {
  assert.deepEqual(dropsFor(18, { heldKey: 'shears', rand: never }), [
    { kind: 'block', name: 'Oak Leaves', count: 1 },
  ]);
  assert.deepEqual(names(dropsFor(161, { heldKey: 'shears', rand: never })), ['Spruce Leaves']);
});

// ── the odd ones ───────────────────────────────────────────────────────────

check('gravel sometimes hands back flint', () => {
  assert.deepEqual(names(dropsFor(13, { heldKey: null, rand: always })), ['flint']);
  assert.deepEqual(names(dropsFor(13, { heldKey: null, rand: never })), ['Gravel']);
});

check('everyday blocks drop themselves, or their useful part', () => {
  assert.deepEqual(names(dropsFor(12, { heldKey: null })), ['Sand']);
  assert.deepEqual(names(dropsFor(3, { heldKey: null })), ['Dirt']);
  assert.deepEqual(names(dropsFor(2, { heldKey: null })), ['Dirt']);
  assert.deepEqual(names(dropsFor(17, { heldKey: null })), ['Oak Wood']);
  assert.deepEqual(names(dropsFor(82, { heldKey: null })), ['clay_ball']);
  assert.equal(dropsFor(82, { heldKey: null })[0].count, 4);
  assert.deepEqual(names(dropsFor(47, { heldKey: null })), ['book_normal']);
  assert.deepEqual(names(dropsFor(30, { heldKey: null })), []);
  assert.deepEqual(names(dropsFor(30, { heldKey: 'shears' })), ['string']);
});

check('plants give seeds by hand and themselves to shears', () => {
  assert.equal(dropsFor(31, { heldKey: null, rand: always })[0].name, 'seeds_wheat');
  assert.deepEqual(dropsFor(31, { heldKey: 'shears', rand: never }), [
    { kind: 'block', name: 'Grass', count: 1 },
  ]);
  assert.deepEqual(names(dropsFor(32, { heldKey: null, rand: never })), ['stick']);
});

console.log(`drops: PASS ${passed.length}`);
for (const name of passed) console.log(`  ok - ${name}`);
