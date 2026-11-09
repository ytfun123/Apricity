// What each block drops in 1.12.2, and what you need in your hand for it to
// drop at all. Kept data-only and free of ids so it can be checked in Node: a
// drop names a block or an item, and the caller resolves the name to an id
// through the registry.
//
//   dropsFor(blockId, { heldKey, rand }) -> [{ kind, name, count }]
//
// `kind` is 'block' for things that come back as blocks and 'item' for things
// with no block form (coal, diamonds, apples, sticks...). An empty array means
// nothing drops -- stone punched by hand, glass, ice.

import { blockDef } from './blocks.js';

/** Tool tiers, straight out of 1.12.2: wood and gold are level 1, stone 2,
 *  iron 3 and diamond 4. */
export const TOOL_TIERS = { wood: 1, gold: 1, stone: 2, iron: 3, diamond: 4 };

const TOOL_KINDS = ['pickaxe', 'axe', 'shovel', 'shears'];

/**
 * What a held item is, tool-wise: { type, tier } for the five tool materials,
 * or null for anything else. Item keys are the pack's texture names
 * ('wood_pickaxe', 'diamond_shovel', 'shears').
 */
export function toolInfo(key) {
  if (!key) return null;
  const text = String(key);
  if (text === 'shears') return { type: 'shears', tier: 1 };
  for (const type of TOOL_KINDS) {
    if (!text.endsWith(`_${type}`)) continue;
    const material = text.slice(0, -(type.length + 1));
    const tier = TOOL_TIERS[material];
    if (tier) return { type, tier };
  }
  return null;
}

/** 1.12.2 harvest rules: the right tool class at the right tier, or a bare hand
 *  for blocks that never needed one. */
export function canHarvest(id, heldKey) {
  const def = blockDef(id);
  if (!def) return false;
  if (def.hardness < 0) return false;
  if (!def.tool) return true;
  // Leaves, grass, vines and webs all drop their own things by hand; only the
  // block itself needs shears, and dropsFor() handles that split.
  if (def.tool === 'shears') return true;
  const tool = toolInfo(heldKey);
  if (!tool) return def.tier === 0;
  if (tool.type !== def.tool) return def.tier === 0;
  return tool.tier >= def.tier;
}

const one = (kind, name, count = 1) => ({ kind, name, count });

const chance = (rand, probability) => rand() < probability;

// Ores and the handful of blocks whose drop is not simply themselves.
const FIXED = {
  1: [one('block', 'Cobblestone')], // stone
  2: [one('block', 'Dirt')], // grass block
  60: [one('block', 'Dirt')], // farmland
  16: [one('item', 'coal')], // coal ore
  56: [one('item', 'diamond')], // diamond ore
  129: [one('item', 'emerald')], // emerald ore
  153: [one('item', 'quartz')], // nether quartz ore
  21: [{ kind: 'item', name: 'dye_powder_blue', count: [4, 8] }], // lapis ore
  73: [{ kind: 'item', name: 'redstone_dust', count: [4, 5] }], // redstone ore
  82: [one('item', 'clay_ball', 4)], // clay
  78: [one('item', 'snowball')], // snow layer
  80: [one('item', 'snowball', 4)], // snow block
  30: [one('item', 'string')], // cobweb, with shears only (see below)
  106: [], // vines: only the block itself, with shears
  59: [one('item', 'wheat'), { kind: 'item', name: 'seeds_wheat', count: [0, 3] }], // wheat
  31: [{ kind: 'item', name: 'seeds_wheat', chance: 0.125 }], // tall grass
  32: [{ kind: 'item', name: 'stick', count: [0, 2] }], // dead bush
  47: [one('item', 'book_normal', 3)], // bookshelf
  103: [{ kind: 'item', name: 'melon', count: [3, 7] }], // melon
  141: [{ kind: 'item', name: 'carrot', count: [1, 4] }], // carrots
  142: [{ kind: 'item', name: 'potato', count: [1, 4] }], // potatoes
  20: [], // glass shatters
  79: [], // ice
  174: [], // packed ice
  95: [], // stained glass
  160: [], // stained glass pane
  102: [], // glass pane
};

// Leaves: saplings from their own species, apples only from oak and dark oak,
// sticks from any of them. Shears hand back the leaf block instead.
// 1.12.2's tree species are metadata variants of the one sapling block id, so
// every tree hands back the oak sapling, which is the form the atlas can draw.
const SAPLING = { kind: 'block', name: 'Oak Sapling' };
const LEAF_TREES = {
  18: { sapling: SAPLING, apple: true },
  161: { sapling: SAPLING, apple: false },
};

// Blocks 1.12.2 lets shears cut whole: tall grass, ferns, dead bushes, vines.
const SHEARABLE = new Set([31, 32, 106, 175]);

export function leafDrops(id, { heldKey = null, rand = Math.random } = {}) {
  const tree = LEAF_TREES[id];
  if (!tree) return [];
  if (toolInfo(heldKey)?.type === 'shears') return [one('block', id === 18 ? 'Oak Leaves' : 'Spruce Leaves')];
  const drops = [];
  if (chance(rand, 0.05)) drops.push({ ...tree.sapling, count: 1 });
  if (tree.apple && chance(rand, 0.005)) drops.push(one('item', 'apple'));
  if (chance(rand, 0.02)) drops.push(one('item', 'stick'));
  return drops;
}

/** Resolve a [min, max] range (or a plain number) into a concrete count. */
function roll(count, rand) {
  if (Array.isArray(count)) {
    const [min, max] = count;
    return min + Math.floor(rand() * (max - min + 1));
  }
  return count ?? 1;
}

export function dropsFor(id, { heldKey = null, rand = Math.random } = {}) {
  const def = blockDef(id);
  if (!def || id === 0) return [];

  // Leaves are the one family that drops by hand but gives up the block itself
  // to shears, so they bypass canHarvest()'s tool check.
  if (LEAF_TREES[id]) return leafDrops(id, { heldKey, rand });

  if (!canHarvest(id, heldKey)) return [];

  // Shears are the only way to get plants, vines, ferns and cobwebs as blocks.
  if (def.tool === 'shears' && toolInfo(heldKey)?.type !== 'shears') {
    if (id === 106) return []; // vines by hand: nothing
    if (id === 30) return []; // cobweb by hand: nothing
  }

  // Shears hand back the plant itself, which is the whole point of using them on
  // grass, ferns, dead bushes and vines. Cobwebs are the exception: they give
  // string, which FIXED handles below.
  if (SHEARABLE.has(id) && toolInfo(heldKey)?.type === 'shears') {
    return [one('block', def.name)];
  }

  const fixed = FIXED[id];
  if (fixed) {
    return fixed
      .filter((drop) => drop.chance === undefined || chance(rand, drop.chance))
      .map((drop) => ({ ...drop, count: roll(drop.count, rand) }))
      .filter((drop) => drop.count > 0);
  }

  if (id === 13) {
    // Gravel sometimes gives flint instead of itself.
    return chance(rand, 0.1) ? [one('item', 'flint')] : [one('block', 'Gravel')];
  }

  return [one('block', def.name)];
}

/** The tool class and tier a block needs, for the "you need a pickaxe" hint. */
export function harvestNeed(id) {
  const def = blockDef(id);
  if (!def || !def.tool) return null;
  return { tool: def.tool, tier: def.tier };
}
