// Eating: what fills the hunger bar, how much, and the furnace trip that makes
// raw meat worth more. Pure tables and Vitals, so no world here.
//
//   node test/food.test.mjs

import assert from 'node:assert/strict';
import { MAX_FOOD } from '../js/survival.js';
import { Vitals } from '../js/survival.js';
import { FOOD, eat, foodFor } from '../js/food.js';
import { SMELT } from '../js/smelting.js';

const passed = [];
function check(name, fn) {
  fn();
  passed.push(name);
}

const hungry = (food = 10) => {
  const vitals = new Vitals();
  vitals.food = food;
  vitals.saturation = 0;
  return vitals;
};

check('raw beef restores three hunger', () => {
  const vitals = hungry();
  assert.equal(eat(vitals, 'beef_raw'), 3);
  assert.equal(vitals.food, 13);
  assert.ok(vitals.saturation > 0);
});

check('cooked meat fills more than raw', () => {
  assert.ok(foodFor('beef_cooked').food > foodFor('beef_raw').food);
  assert.ok(foodFor('porkchop_cooked').food > foodFor('porkchop_raw').food);
  assert.ok(foodFor('chicken_cooked').food > foodFor('chicken_raw').food);
  assert.ok(foodFor('mutton_cooked').food > foodFor('mutton_raw').food);
});

check('eating stops at the top of the bar', () => {
  const vitals = hungry(19);
  eat(vitals, 'beef_cooked');
  assert.equal(vitals.food, MAX_FOOD);
});

check('a full stomach refuses food', () => {
  const vitals = new Vitals(); // full bar
  assert.equal(vitals.food, MAX_FOOD);
  assert.equal(eat(vitals, 'beef_cooked'), 0);
  assert.equal(vitals.food, MAX_FOOD);
});

check('junk is not food', () => {
  assert.equal(foodFor('coal'), null);
  const vitals = hungry(5);
  assert.equal(eat(vitals, 'coal'), 0);
  assert.equal(vitals.food, 5);
});

check('nothing is eaten when the player is dead', () => {
  const vitals = hungry(5);
  vitals.dead = true;
  assert.equal(eat(vitals, 'beef_cooked'), 0);
  assert.equal(vitals.food, 5);
});

check('every food entry is worth something', () => {
  for (const [key, food] of Object.entries(FOOD)) {
    assert.ok(food.food > 0, `${key} restores nothing`);
    assert.ok(food.saturation >= 0, `${key} has negative saturation`);
  }
});

check('raw meat cooks into the cooked cut', () => {
  const pairs = [
    ['beef_raw', 'beef_cooked'],
    ['porkchop_raw', 'porkchop_cooked'],
    ['chicken_raw', 'chicken_cooked'],
    ['mutton_raw', 'mutton_cooked'],
  ];
  for (const [raw, cooked] of pairs) {
    const recipe = SMELT[`item:${raw}`];
    assert.ok(recipe, `${raw} does not cook`);
    assert.equal(recipe.name, cooked);
    assert.equal(recipe.kind, 'item');
  }
});

check('every animal drop is edible, raw and cooked', () => {
  for (const key of ['beef_raw', 'porkchop_raw', 'chicken_raw', 'mutton_raw']) {
    assert.ok(FOOD[key], `${key} is not edible`);
    assert.ok(FOOD[key.replace('_raw', '_cooked')], `${key} has no cooked form`);
  }
});

console.log(`PASS ${passed.length} checks`);
for (const name of passed) console.log(`  ok  ${name}`);
