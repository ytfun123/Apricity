// The crafting grid as data: a flat list of { id, count } slots, 4 cells for the
// inventory's own 2x2 and 9 for a crafting table. Everything here is pure so the
// click behaviour can be checked without a browser.

import { STACK_LIMIT, slot, slotIsEmpty } from './inventory.js';

export function emptyGrid(size) {
  return Array.from({ length: size * size }, () => slot(0, 0));
}

export const gridIds = (grid) => grid.map((cell) => cell?.id ?? 0);

export function gridHasItems(grid) {
  return grid.some((cell) => !slotIsEmpty(cell));
}

export function gridCopy(grid) {
  return grid.map((cell) => ({ id: cell.id, count: cell.count }));
}

/**
 * Put one of `id` into a cell, stacking with what is already there. Returns true
 * when the cell took it.
 */
export function putOne(grid, index, id, limit = STACK_LIMIT) {
  if (index < 0 || index >= grid.length || !id) return false;
  const cell = grid[index];
  if (cell.id && cell.id !== id) return false;
  if (!cell.id) {
    cell.id = id;
    cell.count = 1;
    return true;
  }
  if (cell.count >= limit) return false;
  cell.count += 1;
  return true;
}

/** Empty a cell and hand back what was in it. */
/**
 * Put up to `count` of `id` into one cell, stacking with what is already there.
 * Returns how many landed, so the caller can take exactly that off the cursor.
 */
export function putMany(grid, index, id, count, limit = STACK_LIMIT) {
  let placed = 0;
  const want = Math.max(0, Math.floor(count));
  while (placed < want && putOne(grid, index, id, limit)) placed++;
  return placed;
}

export function takeAt(grid, index) {
  const cell = grid[index];
  if (!cell || slotIsEmpty(cell)) return null;
  const taken = { id: cell.id, count: cell.count };
  cell.id = 0;
  cell.count = 0;
  return taken;
}

/** Spend one of each ingredient, the way taking a crafted result does. */
export function consumeIngredients(grid) {
  for (const cell of grid) {
    if (slotIsEmpty(cell)) continue;
    cell.count -= 1;
    if (cell.count <= 0) {
      cell.id = 0;
      cell.count = 0;
    }
  }
}

/** Return every ingredient to the player -- used when a screen is closed. */
export function drainGrid(grid) {
  const taken = grid.filter((cell) => !slotIsEmpty(cell)).map((cell) => ({ id: cell.id, count: cell.count }));
  for (const cell of grid) {
    cell.id = 0;
    cell.count = 0;
  }
  return taken;
}

/**
 * Craft once: verify the recipe still matches, then consume and report the
 * output. The caller decides where the output goes.
 */
export function craftOnce(grid, size, matcher) {
  const match = matcher(gridIds(grid), size);
  if (!match || !match.out) return null;
  consumeIngredients(grid);
  return { id: match.out.id, count: match.out.count };
}
