// What the player can eat, and what one bite is worth. 1.12.2 measures hunger in
// half shanks; saturation is the hidden buffer that drains before the bar does.
//
// Keyed by item key, like drops.js and smelting.js, so the table can be checked
// in Node without a registry.

import { MAX_FOOD, MAX_SATURATION } from './survival.js';

export const FOOD = {
  beef_raw: { food: 3, saturation: 0.9 },
  beef_cooked: { food: 8, saturation: 6.4 },
  porkchop_raw: { food: 3, saturation: 0.9 },
  porkchop_cooked: { food: 8, saturation: 6.4 },
  chicken_raw: { food: 2, saturation: 0.6 },
  chicken_cooked: { food: 6, saturation: 3.6 },
  mutton_raw: { food: 2, saturation: 0.6 },
  mutton_cooked: { food: 6, saturation: 4.8 },
  apple: { food: 4, saturation: 2.4 },
  bread: { food: 5, saturation: 3.0 },
};

export function foodFor(key) {
  return FOOD[key] ?? null;
}

/**
 * Eat one of `key`: hunger and saturation go up, and the bar is clamped. Returns
 * how much hunger it was worth, or 0 when the item is not food or the bar is
 * already full (which is when 1.12.2 refuses to eat).
 */
export function eat(vitals, key) {
  const food = foodFor(key);
  if (!food || !vitals || vitals.dead) return 0;
  if (vitals.food >= MAX_FOOD) return 0;
  vitals.feed(vitals.food + food.food, Math.min(MAX_SATURATION, vitals.saturation + food.saturation));
  return food.food;
}
