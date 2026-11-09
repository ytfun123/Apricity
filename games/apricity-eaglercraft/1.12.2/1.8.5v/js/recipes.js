// 1.12.2 crafting recipes, written as patterns of ingredient specs. A spec is
// one of
//
//   'block:Cobblestone'   a block, by its 1.12.2 name
//   'item:stick'          a non-block item, by its texture key
//   'tag:planks'          any member of a family (all six woods, all logs...)
//   null                  empty (only inside shapeless lists)
//
// The matcher is pure: it takes the grid's ids plus a resolver that turns a
// spec into the ids it accepts, so the whole recipe book is testable in Node.

const PLANKS = (tag) => tag;

export const TAGS = {
  planks: [
    'block:Oak Wood Planks',
    'block:Spruce Wood Planks',
    'block:Birch Wood Planks',
    'block:Jungle Wood Planks',
    'block:Acacia Wood Planks',
    'block:Dark Oak Wood Planks',
  ],
  log: [
    'block:Oak Wood',
    'block:Spruce Wood',
    'block:Birch Wood',
    'block:Jungle Wood',
    'block:Acacia Wood',
    'block:Dark Oak Wood',
  ],
  stone: ['block:Stone', 'block:Cobblestone'],
};

const row = (...cells) => cells;

/** Shaped recipes: `pattern` rows run top to bottom, `keys` maps a character to
 *  a spec. A space is an empty cell. */
export const SHAPED = [
  // ── wood ──
  { pattern: row('##', '##'), keys: { '#': 'tag:planks' }, out: { 'block:Crafting Table': 1 } },
  { pattern: row('###', '# #', '###'), keys: { '#': 'tag:planks' }, out: { 'block:Chest': 1 } },
  { pattern: row('##', '##'), keys: { '#': 'block:Cobblestone' }, out: { 'block:Stone Bricks': 4 } },
  { pattern: row('# #', '###', '# #'), keys: { '#': 'item:stick' }, out: { 'block:Ladder': 3 } },
  { pattern: row('# #', ' # '), keys: { '#': 'tag:planks' }, out: { 'item:bowl': 4 } },
  { pattern: row('###', '###'), keys: { '#': 'tag:planks' }, out: { 'block:Oak Trapdoor': 2 } },
  { pattern: row('# #', '# #', '# #'), keys: { '#': 'tag:planks' }, out: { 'item:door_wood': 1 } },
  { pattern: row('###', '###', ' # '), keys: { '#': 'tag:planks', ' ': null }, out: { 'block:Oak Fence': 3 } },
  { pattern: row('# #', '###'), keys: { '#': 'tag:planks' }, out: { 'item:boat': 1 } },
  { pattern: row('###', '###', ' # '), keys: { '#': 'tag:planks' }, out: { 'item:sign': 3 } },

  // ── stone and metal blocks ──
  { pattern: row('###', '# #', '###'), keys: { '#': 'block:Cobblestone' }, out: { 'block:Furnace': 1 } },
  { pattern: row('###', '###', '###'), keys: { '#': 'item:iron_ingot' }, out: { 'block:Block of Iron': 1 } },
  { pattern: row('###', '###', '###'), keys: { '#': 'item:gold_ingot' }, out: { 'block:Block of Gold': 1 } },
  { pattern: row('###', '###', '###'), keys: { '#': 'item:diamond' }, out: { 'block:Block of Diamond': 1 } },
  { pattern: row('###', '###', '###'), keys: { '#': 'item:emerald' }, out: { 'block:Block of Emerald': 1 } },
  { pattern: row('###', '###', '###'), keys: { '#': 'item:coal' }, out: { 'block:Block of Coal': 1 } },
  { pattern: row('###', '###', '###'), keys: { '#': 'item:redstone_dust' }, out: { 'block:Block of Redstone': 1 } },
  { pattern: row('###', '###', '###'), keys: { '#': 'item:dye_powder_blue' }, out: { 'block:Lapis Lazuli Block': 1 } },
  { pattern: row('##', '##'), keys: { '#': 'block:Sand' }, out: { 'block:Sandstone': 1 } },
  { pattern: row('##', '##'), keys: { '#': 'item:snowball' }, out: { 'block:Snow Block': 1 } },
  { pattern: row('##', '##'), keys: { '#': 'item:clay_ball' }, out: { 'block:Clay': 1 } },
  { pattern: row('##', '##'), keys: { '#': 'item:string' }, out: { 'block:White Wool': 1 } },
  { pattern: row('###', '###', '###'), keys: { '#': 'item:wheat' }, out: { 'block:Hay Bale': 1 } },

  // ── tools, tier by tier ──
  ...[
    ['wood', 'tag:planks'],
    ['stone', 'block:Cobblestone'],
    ['iron', 'item:iron_ingot'],
    ['gold', 'item:gold_ingot'],
    ['diamond', 'item:diamond'],
  ].flatMap(([material, spec]) => [
    { pattern: row('###', ' / ', ' / '), keys: { '#': spec, '/': 'item:stick' }, out: { [`item:${material}_pickaxe`]: 1 } },
    { pattern: row('##', '#/', ' /'), keys: { '#': spec, '/': 'item:stick' }, out: { [`item:${material}_axe`]: 1 } },
    { pattern: row('#', '/', '/'), keys: { '#': spec, '/': 'item:stick' }, out: { [`item:${material}_shovel`]: 1 } },
    { pattern: row('#', '#', '/'), keys: { '#': spec, '/': 'item:stick' }, out: { [`item:${material}_sword`]: 1 } },
    { pattern: row('##', ' /', ' /'), keys: { '#': spec, '/': 'item:stick' }, out: { [`item:${material}_hoe`]: 1 } },
  ]),

  // ── the rest of the toolbox ──
  { pattern: row(' #', '# '), keys: { '#': 'item:iron_ingot' }, out: { 'item:shears': 1 } },
  { pattern: row('# #', ' # '), keys: { '#': 'item:iron_ingot' }, out: { 'item:bucket_empty': 1 } },
  { pattern: row('###', '# #', '# #'), keys: { '#': 'item:iron_ingot' }, out: { 'item:minecart_normal': 1 } },
  { pattern: row('# #', '# #'), keys: { '#': 'item:iron_ingot' }, out: { 'item:flint_and_steel': 1 } },
  { pattern: row('#', '/'), keys: { '#': 'item:coal', '/': 'item:stick' }, out: { 'block:Torch': 4 } },
  { pattern: row('#', '/'), keys: { '#': 'item:redstone_dust', '/': 'item:stick' }, out: { 'block:Redstone Torch': 1 } },
  { pattern: row('#', '/'), keys: { '#': 'block:Cobblestone', '/': 'item:stick' }, out: { 'block:Lever': 1 } },
  { pattern: row('###', '###', '# #'), keys: { '#': 'item:iron_ingot' }, out: { 'block:Rail': 16 } },
  { pattern: row('# #', ' # '), keys: { '#': 'block:Pumpkin' }, out: { 'block:Jack o\'Lantern': 1 } },

  // ── food ──
  { pattern: row('###'), keys: { '#': 'item:wheat' }, out: { 'item:bread': 1 } },
  { pattern: row('###', '# #', '###'), keys: { '#': 'item:gold_ingot' }, out: { 'item:apple_golden': 1 } },
];

/** Shapeless recipes: a bag of ingredients in any arrangement. */
export const SHAPELESS = [
  { ingredients: ['tag:log'], out: { 'block:Oak Wood Planks': 4 } },
  { ingredients: ['tag:planks', 'tag:planks'], out: { 'item:stick': 4 } },
  { ingredients: ['block:Block of Iron'], out: { 'item:iron_ingot': 9 } },
  { ingredients: ['block:Block of Gold'], out: { 'item:gold_ingot': 9 } },
  { ingredients: ['block:Block of Diamond'], out: { 'item:diamond': 9 } },
  { ingredients: ['block:Block of Emerald'], out: { 'item:emerald': 9 } },
  { ingredients: ['block:Block of Coal'], out: { 'item:coal': 9 } },
  { ingredients: ['block:Block of Redstone'], out: { 'item:redstone_dust': 9 } },
  { ingredients: ['block:Lapis Lazuli Block'], out: { 'item:dye_powder_blue': 9 } },
  { ingredients: ['block:White Wool'], out: { 'item:string': 4 } },
  { ingredients: ['block:Crafting Table'], out: { 'block:Crafting Table': 1 } },
  { ingredients: ['item:reeds'], out: { 'item:paper': 3 } },
  { ingredients: ['item:reeds'], out: { 'item:sugar': 1 } },
  { ingredients: ['item:bowl', 'block:Red Mushroom', 'block:Brown Mushroom'], out: { 'item:mushroom_stew': 1 } },
  { ingredients: ['item:iron_ingot', 'item:flint'], out: { 'item:flint_and_steel': 1 } },
];

export const ALL_RECIPES = [...SHAPED, ...SHAPELESS];

/** Split 'block:Name' / 'item:key' / 'tag:name' into its parts. */
export function parseSpec(spec) {
  if (!spec) return null;
  const cut = spec.indexOf(':');
  if (cut < 0) return null;
  return { kind: spec.slice(0, cut), name: spec.slice(cut + 1) };
}

/**
 * Ids a spec accepts. `ref` supplies the lookups:
 *   { blockId(name), itemId(name), tag(name) }
 */
export function specIds(spec, ref) {
  const parsed = parseSpec(spec);
  if (!parsed) return [];
  if (parsed.kind === 'block') return [ref.blockId(parsed.name)].filter(Boolean);
  if (parsed.kind === 'item') return [ref.itemId(parsed.name)].filter(Boolean);
  if (parsed.kind === 'tag') {
    const members = TAGS[parsed.name] ?? [];
    return members.flatMap((member) => specIds(member, ref)).filter(Boolean);
  }
  return [];
}

const matches = (id, spec, ref) => {
  if (!spec) return !id;
  return specIds(spec, ref).includes(id);
};

/**
 * Match a crafting grid. `grid` is `size * size` ids in row-major order and
 * `size` is 2 for the inventory's own grid or 3 for a crafting table. Returns
 * `{ out, recipe }` or null.
 */
export function matchRecipe(grid, size, ref) {
  const ids = Array.from({ length: size * size }, (_, i) => grid[i] || 0);
  if (!ids.some(Boolean)) return null;

  // Shapeless: the sorted multiset of ingredients has to line up.
  const present = ids.filter(Boolean);
  for (const recipe of SHAPELESS) {
    if (recipe.ingredients.length !== present.length) continue;
    if (shapelessMatches(recipe.ingredients, present, ref)) {
      return { out: resolveOut(recipe.out, ref), recipe };
    }
  }

  for (const recipe of SHAPED) {
    const rows = recipe.pattern;
    const height = rows.length;
    const width = Math.max(...rows.map((r) => r.length));
    if (height > size || width > size) continue;
    for (let dy = 0; dy + height <= size; dy++) {
      for (let dx = 0; dx + width <= size; dx++) {
        if (gridMatches(ids, size, rows, width, dx, dy, recipe.keys, ref)) {
          return { out: resolveOut(recipe.out, ref), recipe };
        }
      }
    }
  }
  return null;
}

function gridMatches(ids, size, rows, width, dx, dy, keys, ref) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const insideX = x - dx;
      const insideY = y - dy;
      const char =
        insideX >= 0 && insideX < width && insideY >= 0 && insideY < rows.length
          ? rows[insideY][insideX] ?? ' '
          : ' ';
      const spec = char === ' ' ? null : keys[char];
      if (spec === undefined) return false;
      if (!matches(ids[y * size + x], spec, ref)) return false;
    }
  }
  return true;
}

function shapelessMatches(ingredients, present, ref) {
  const pool = present.slice();
  for (const spec of ingredients) {
    const accepted = specIds(spec, ref);
    const at = pool.findIndex((id) => accepted.includes(id));
    if (at < 0) return false;
    pool.splice(at, 1);
  }
  return pool.length === 0;
}

function resolveOut(out, ref) {
  const [spec] = Object.keys(out);
  const count = out[spec];
  const parsed = parseSpec(spec);
  if (!parsed) return null;
  const id = parsed.kind === 'block' ? ref.blockId(parsed.name) : ref.itemId(parsed.name);
  return id ? { id, count } : null;
}

export { PLANKS };
