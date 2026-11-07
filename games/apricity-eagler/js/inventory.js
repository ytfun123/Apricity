// The hotbar as real stacks, which is what makes a clean survival start, block
// drops and item pickup possible: a slot is `{ id, count }` and nothing else.
//
// Id 0 means empty, so a fresh hotbar is nine empty slots rather than the nine
// blocks the client used to hand out.

export const HOTBAR_SIZE = 9;
export const STACK_LIMIT = 64;

export function slot(id = 0, count = 0) {
  return { id: id || 0, count: id ? Math.max(0, count) : 0 };
}

export function emptyHotbar(size = HOTBAR_SIZE) {
  return Array.from({ length: size }, () => slot(0, 0));
}

export function slotIsEmpty(entry) {
  return !entry || !entry.id || entry.count <= 0;
}

/**
 * Add items to the hotbar: existing stacks of the same block first, then empty
 * slots, exactly like 1.12.2 filling an inventory. Returns how many did not fit.
 */
export function addToHotbar(hotbar, id, count = 1) {
  if (!id) return Math.max(0, Math.floor(count));
  let left = Math.max(0, Math.floor(count));
  if (left === 0) return 0;

  for (const entry of hotbar) {
    if (left === 0) break;
    if (entry.id === id && entry.count > 0 && entry.count < STACK_LIMIT) {
      const moved = Math.min(STACK_LIMIT - entry.count, left);
      entry.count += moved;
      left -= moved;
    }
  }

  for (const entry of hotbar) {
    if (left === 0) break;
    if (!slotIsEmpty(entry)) continue;
    const moved = Math.min(STACK_LIMIT, left);
    entry.id = id;
    entry.count = moved;
    left -= moved;
  }

  return left;
}

/** Remove up to `count` items, emptying the slot when it runs out. */
export function takeFromSlot(entry, count = 1) {
  if (slotIsEmpty(entry)) return 0;
  const taken = Math.min(entry.count, Math.max(0, Math.floor(count)));
  entry.count -= taken;
  if (entry.count <= 0) {
    entry.id = 0;
    entry.count = 0;
  }
  return taken;
}

/** Fill the first slots with the given block ids, one of each. */
export function fillHotbarWith(hotbar, ids) {
  ids.forEach((id, index) => {
    if (index < hotbar.length) hotbar[index] = slot(id, 1);
  });
  return hotbar;
}

/** How many of a block the hotbar holds, for HUD summaries. */
export function countInHotbar(hotbar, id) {
  return hotbar.reduce((total, entry) => total + (entry.id === id ? entry.count : 0), 0);
}
