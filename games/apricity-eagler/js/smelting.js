// What a furnace cooks, and what it will burn to do it.
//
// Kept name-keyed and free of ids, the way drops.js and recipes.js are, so the
// whole table can be checked in Node: an entry names the block or item that goes
// in, and the caller resolves the name back to an id through the registry.

/** 1.12.2 smelts everything in ten seconds. */
export const SMELT_SECONDS = 10;

/** One smelting operation: what it produces, as { kind, name, count }. */
const out = (kind, name, count = 1) => ({ kind, name, count });

export const SMELT = {
  // Ores that 1.12.2 turns into ingots in a furnace.
  'block:Iron Ore': out('item', 'iron_ingot'),
  'block:Gold Ore': out('item', 'gold_ingot'),
  // The classic conversions.
  'block:Sand': out('block', 'Glass'),
  'block:Cobblestone': out('block', 'Stone'),
  'block:Clay': out('block', 'Terracotta'),
  'item:clay_ball': out('item', 'brick'),
  'block:Cactus': out('item', 'dye_powder_green'),
  // Logs burn down to charcoal, which the pack calls coal. This client has no
  // block metadata, so the two log ids it knows are the ones listed here.
  'block:Oak Wood': out('item', 'coal'),
  'block:Dark Oak Wood': out('item', 'coal'),
};

/** Seconds each fuel burns for, from 1.12.2's fuel table (coal is its 80s). */
export const FUEL = {
  'item:coal': 80,
  'item:stick': 5,
  'block:Oak Wood Planks': 15,
  'block:Oak Wood': 15,
  'block:Dark Oak Wood': 15,
  'block:Crafting Table': 15,
  'block:Bookshelf': 15,
  'block:Chest': 15,
  'block:Oak Sapling': 5,
  'block:Block of Coal': 800,
};

/**
 * The 'block:Name' / 'item:key' key for an id, using the same resolvers the
 * recipes use. Ids above the item base are items; everything else is a block.
 */
export function keyFor(id, { blockName, itemKey, isItemId }) {
  if (!id) return null;
  if (isItemId(id)) {
    const key = itemKey(id);
    return key ? `item:${key}` : null;
  }
  const name = blockName(id);
  return name ? `block:${name}` : null;
}

/** What this id smelts into, or null if it is not a furnace input. */
export function smeltFor(id, resolvers) {
  const key = keyFor(id, resolvers);
  return key ? SMELT[key] ?? null : null;
}

/** How many seconds of heat this id is worth, or 0 if it will not burn. */
export function fuelFor(id, resolvers) {
  const key = keyFor(id, resolvers);
  return key ? FUEL[key] ?? 0 : 0;
}

/**
 * One tick of a furnace's three slots. Pure: it mutates the slots object it is
 * handed and reports what happened, so the game loop and the tests agree.
 */
export function tickFurnace(slots, dt, resolvers) {
  const result = { burned: false, smelted: null, active: false };

  if (slots.burn > 0) slots.burn = Math.max(0, slots.burn - dt);

  const recipe = slots.input?.id ? smeltFor(slots.input.id, resolvers) : null;
  // The table names its output; the caller's resolver turns that into an id.
  const outId = recipe ? (resolvers.resolve?.(recipe) ?? 0) : 0;
  const outputRoom = () => {
    if (!outId) return 0;
    if (!slots.output?.id) return 64;
    return slots.output.id === outId ? 64 - slots.output.count : 0;
  };

  if (recipe) {
    // Light up first: an unlit furnace with fuel and something to cook starts
    // burning, which is what makes the flame appear at the same tick as the work.
    if (slots.burn <= 0) {
      const seconds = slots.fuel?.id ? fuelFor(slots.fuel.id, resolvers) : 0;
      if (seconds > 0) {
        slots.fuel.count -= 1;
        if (slots.fuel.count <= 0) {
          slots.fuel.id = 0;
          slots.fuel.count = 0;
        }
        slots.burn = seconds;
        slots.burnMax = seconds;
        result.burned = true;
      }
    }

    if (slots.burn > 0 && outputRoom() > 0) {
      result.active = true;
      slots.cook = (slots.cook ?? 0) + dt;
      if (slots.cook >= SMELT_SECONDS) {
        slots.cook = 0;
        const made = slots.output?.id === outId ? slots.output.count : 0;
        const produced = { id: outId, count: made + recipe.count };
        slots.output = produced;
        slots.input.count -= 1;
        if (slots.input.count <= 0) {
          slots.input.id = 0;
          slots.input.count = 0;
        }
        result.smelted = produced;
      }
    } else {
      // No heat or no room: the cooking clock runs back down, as it does in game.
      slots.cook = Math.max(0, (slots.cook ?? 0) - dt * 2);
    }
  } else {
    slots.cook = Math.max(0, (slots.cook ?? 0) - dt * 2);
  }

  return result;
}
