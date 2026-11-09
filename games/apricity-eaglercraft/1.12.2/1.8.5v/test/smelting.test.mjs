// Furnace rules: what smelts into what, which items are fuel, and that the tick
// loop lights up, cooks and fills the output slot the way 1.12.2 does.
//
//   node test/smelting.test.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SMELT, FUEL, SMELT_SECONDS, smeltFor, fuelFor, tickFurnace, keyFor } from '../js/smelting.js';
import { blockName, blockIdByName } from '../js/blocks.js';
import { setItems, itemIdByKey, itemKey, isItemId } from '../js/registry.js';

const registry = JSON.parse(readFileSync(new URL('../assets/registry.json', import.meta.url), 'utf8'));
setItems(registry.items);

const resolve = (out) => (out.kind === 'block' ? blockIdByName(out.name) : itemIdByKey(out.name));
const ref = { blockName, itemKey, isItemId, resolve };
const idOf = (key) => {
  const [kind, name] = key.split(':');
  return kind === 'block' ? blockIdByName(name) : itemIdByKey(name);
};

const passed = [];
function check(name, fn) {
  fn();
  passed.push(name);
}

check('iron and gold ore smelt into ingots', () => {
  assert.deepEqual(smeltFor(blockIdByName('Iron Ore'), ref), { kind: 'item', name: 'iron_ingot', count: 1 });
  assert.deepEqual(smeltFor(blockIdByName('Gold Ore'), ref), { kind: 'item', name: 'gold_ingot', count: 1 });
});

check('sand glass and cobblestone stone are smeltable', () => {
  assert.equal(smeltFor(blockIdByName('Sand'), ref)?.name, 'Glass');
  assert.equal(smeltFor(blockIdByName('Cobblestone'), ref)?.name, 'Stone');
});

check('logs become charcoal, which the pack calls coal', () => {
  // No block metadata here, so the two log ids the client knows are these two.
  for (const name of ['Oak Wood', 'Dark Oak Wood']) {
    assert.equal(smeltFor(blockIdByName(name), ref)?.name, 'coal', `${name} should smelt`);
  }
});

check('blocks that are not furnace inputs return null', () => {
  for (const name of ['Stone', 'Dirt', 'Glass', 'Terracotta', 'Diamond Block']) {
    assert.equal(smeltFor(blockIdByName(name), ref), null, `${name} must not smelt`);
  }
  assert.equal(smeltFor(0, ref), null);
});

check('fuel values follow 1.12.2', () => {
  assert.equal(fuelFor(itemIdByKey('coal'), ref), 80);
  assert.equal(fuelFor(itemIdByKey('stick'), ref), 5);
  assert.equal(fuelFor(blockIdByName('Oak Wood Planks'), ref), 15);
  assert.equal(fuelFor(blockIdByName('Diamond Block'), ref), 0);
});

check('a furnace lights, cooks and fills its output', () => {
  const ore = blockIdByName('Iron Ore');
  const slots = {
    input: { id: ore, count: 2 },
    fuel: { id: itemIdByKey('coal'), count: 1 },
    output: { id: 0, count: 0 },
    cook: 0,
    burn: 0,
    burnMax: 0,
  };
  const first = tickFurnace(slots, 0.1, ref);
  assert.equal(first.burned, true, 'fuel is consumed to light up');
  assert.equal(slots.burn > 0, true, 'the furnace is now burning');

  for (let i = 0; i < SMELT_SECONDS * 10; i++) tickFurnace(slots, 0.1, ref);
  assert.equal(slots.output.id, itemIdByKey('iron_ingot'));
  assert.equal(slots.output.count, 1);
  assert.equal(slots.input.count, 1, 'one ore was spent');
});

check('nothing cooks without fuel', () => {
  const slots = {
    input: { id: blockIdByName('Iron Ore'), count: 1 },
    fuel: { id: 0, count: 0 },
    output: { id: 0, count: 0 },
    cook: 0,
    burn: 0,
    burnMax: 0,
  };
  for (let i = 0; i < 200; i++) tickFurnace(slots, 0.1, ref);
  assert.equal(slots.output.id, 0, 'no fuel means no ingot');
  assert.equal(slots.input.count, 1);
});

check('every input and output in the table resolves in the game', () => {
  const missing = [];
  for (const [key, out] of Object.entries(SMELT)) {
    if (!idOf(key)) missing.push(`input ${key}`);
    const outKey = `${out.kind}:${out.name}`;
    if (!idOf(outKey)) missing.push(`output ${outKey}`);
  }
  for (const key of Object.keys(FUEL)) if (!idOf(key)) missing.push(`fuel ${key}`);
  assert.deepEqual(missing, []);
});

check('keyFor maps ids back to the table keys', () => {
  assert.equal(keyFor(blockIdByName('Iron Ore'), ref), 'block:Iron Ore');
  assert.equal(keyFor(itemIdByKey('coal'), ref), 'item:coal');
  assert.equal(keyFor(0, ref), null);
});

console.log(`smelting: PASS ${passed.length}`);
for (const name of passed) console.log(`  ok  ${name}`);
