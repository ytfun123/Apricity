// Block table: names, fallback colours, and which texture each face uses.
// Textures themselves are assembled into assets/atlas.png by tools/build-assets.mjs
// from the Eaglercraft asset pack; every key below resolves to a tile in it.

const RAW = {
  0: ['Air', 0x000000, false, true],
  1: ['Stone', 0x7f7f7f, true],
  2: ['Grass Block', 0x6a9c3a, true],
  3: ['Dirt', 0x8b5a2b, true],
  4: ['Cobblestone', 0x6b6b6b, true],
  5: ['Oak Planks', 0xb08b52, true],
  6: ['Sapling', 0x4a802a, false, true],
  7: ['Bedrock', 0x282828, true],
  8: ['Water', 0x3a5fc8, false, true],
  9: ['Water', 0x3a5fc8, false, true],
  10: ['Lava', 0xd25a14, false, true],
  11: ['Lava', 0xd25a14, false, true],
  12: ['Sand', 0xe0d8a8, true],
  13: ['Gravel', 0x8a8a8a, true],
  14: ['Gold Ore', 0xc8b450, true],
  15: ['Iron Ore', 0xbe9682, true],
  16: ['Coal Ore', 0x464646, true],
  17: ['Oak Log', 0x6b4f2a, true],
  18: ['Oak Leaves', 0x3f7a2a, true, true],
  19: ['Sponge', 0xc8c850, true],
  20: ['Glass', 0xdbefff, true, true],
  21: ['Lapis Ore', 0x3c50b4, true],
  22: ['Lapis Block', 0x283c96, true],
  24: ['Sandstone', 0xd8cda0, true],
  25: ['Note Block', 0x785a46, true],
  35: ['Wool', 0xe6e6e6, true],
  41: ['Gold Block', 0xf0c83c, true],
  42: ['Iron Block', 0xdcdcdc, true],
  43: ['Stone Slab', 0x969696, true],
  44: ['Stone Slab', 0x969696, true],
  45: ['Bricks', 0x9c5a4a, true],
  46: ['TNT', 0xc83c32, true],
  47: ['Bookshelf', 0xa0825a, true],
  48: ['Mossy Cobblestone', 0x5a6e50, true],
  49: ['Obsidian', 0x1e1428, true],
  50: ['Torch', 0xfadc78, false, true],
  51: ['Fire', 0xf0a028, false, true],
  52: ['Mob Spawner', 0x28303c, true, true],
  54: ['Chest', 0xa0783c, true],
  56: ['Diamond Ore', 0x5adcdc, true],
  57: ['Diamond Block', 0x64e6e6, true],
  58: ['Crafting Table', 0x8c643c, true],
  59: ['Wheat', 0x9cb84a, false, true],
  60: ['Farmland', 0x5a3c1e, true],
  61: ['Furnace', 0x6e6e6e, true],
  65: ['Ladder', 0x8a6a3c, false, true],
  66: ['Rail', 0x8a8a8a, false, true],
  73: ['Redstone Ore', 0x962828, true],
  78: ['Snow Layer', 0xf0faff, false, true],
  79: ['Ice', 0xa0c8f0, true, true],
  80: ['Snow Block', 0xf5faff, true],
  81: ['Cactus', 0x3c7832, true],
  82: ['Clay', 0x9ea4b0, true],
  83: ['Sugar Cane', 0x8ac85a, false, true],
  87: ['Netherrack', 0x6e3232, true],
  88: ['Soul Sand', 0x5a4637, true],
  89: ['Glowstone', 0xe6c878, true],
  98: ['Stone Bricks', 0x828282, true],
  106: ['Vines', 0x3c6e28, false, true],
  110: ['Mycelium', 0x82707a, true],
  111: ['Lily Pad', 0x3c7828, false, true],
  112: ['Nether Brick', 0x3c282d, true],
  121: ['End Stone', 0xdcdca0, true],
  155: ['Quartz Block', 0xebe6e1, true],
  159: ['Stained Clay', 0x967e6e, true],
  161: ['Dark Leaves', 0x2f6a24, true, true],
  162: ['Dark Log', 0x4a3620, true],
  163: ['Stairs', 0x8a7a5a, true],
  168: ['Prismarine', 0x5a9c8c, true],
  172: ['Hardened Clay', 0x96704c, true],
  179: ['Red Sandstone', 0xc86a3c, true],
};

function unpack(hex) {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}

const FALLBACK = [0.6, 0.6, 0.6];

export const BLOCKS = new Map();
for (const [id, [name, color, solid, transparent]] of Object.entries(RAW)) {
  BLOCKS.set(Number(id), {
    id: Number(id),
    name,
    color: unpack(color),
    solid: solid !== false,
    transparent: Boolean(transparent),
  });
}

export function blockDef(id) {
  return BLOCKS.get(id) || null;
}

export function blockName(id) {
  return BLOCKS.get(id)?.name ?? `Block ${id}`;
}

export function blockColor(id) {
  return BLOCKS.get(id)?.color ?? FALLBACK;
}

export function isSolid(id) {
  return BLOCKS.get(id)?.solid ?? false;
}

/** True when a face between this block and a neighbour should be drawn. */
export function isTransparent(id) {
  if (id === 0) return true;
  return BLOCKS.get(id)?.transparent ?? false;
}

// Which atlas tile each face uses: `all`, or `top` / `side` / `bottom`.
export const BLOCK_TEX = {
  1: { all: 'stone' },
  2: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' },
  3: { all: 'dirt' },
  4: { all: 'cobblestone' },
  5: { all: 'planks_oak' },
  6: { all: 'sapling_oak' },
  7: { all: 'bedrock' },
  8: { all: 'water_still' },
  9: { all: 'water_still' },
  10: { all: 'lava_still' },
  11: { all: 'lava_still' },
  12: { all: 'sand' },
  13: { all: 'gravel' },
  14: { all: 'gold_ore' },
  15: { all: 'iron_ore' },
  16: { all: 'coal_ore' },
  17: { top: 'log_oak_top', side: 'log_oak', bottom: 'log_oak_top' },
  18: { all: 'leaves_oak' },
  19: { all: 'sponge' },
  20: { all: 'glass' },
  21: { all: 'lapis_ore' },
  22: { all: 'lapis_block' },
  24: { all: 'sandstone_normal' },
  25: { top: 'noteblock', side: 'planks_oak', bottom: 'planks_oak' },
  35: { all: 'wool_colored_white' },
  41: { all: 'gold_block' },
  42: { all: 'iron_block' },
  43: { all: 'stone_slab_side' },
  44: { all: 'stone_slab_side' },
  45: { all: 'brick' },
  46: { top: 'tnt_top', side: 'tnt_top', bottom: 'tnt_top' },
  47: { all: 'bookshelf' },
  48: { all: 'cobblestone_mossy' },
  49: { all: 'obsidian' },
  50: { all: 'torch_on' },
  51: { all: 'fire_layer_0' },
  52: { all: 'mob_spawner' },
  54: { all: 'planks_oak' },
  56: { all: 'diamond_ore' },
  57: { all: 'diamond_block' },
  58: { top: 'crafting_table_top', side: 'crafting_table_side', bottom: 'planks_oak' },
  59: { all: 'wheat_stage_7' },
  60: { all: 'farmland_wet' },
  61: { top: 'furnace_top', side: 'furnace_side', bottom: 'furnace_top' },
  65: { all: 'ladder' },
  66: { all: 'rail_normal' },
  73: { all: 'redstone_ore' },
  78: { all: 'snow' },
  79: { all: 'ice' },
  80: { all: 'snow' },
  81: { top: 'cactus_top', side: 'cactus_side', bottom: 'cactus_top' },
  82: { all: 'clay' },
  83: { all: 'reeds' },
  87: { all: 'netherrack' },
  88: { all: 'soul_sand' },
  89: { all: 'glowstone' },
  98: { all: 'stonebrick' },
  106: { all: 'vine' },
  110: { top: 'mycelium_top', side: 'mycelium_side', bottom: 'dirt' },
  111: { all: 'waterlily' },
  112: { all: 'nether_brick' },
  121: { all: 'end_stone' },
  155: { all: 'quartz_block_top' },
  159: { all: 'hardened_clay' },
  161: { all: 'leaves_spruce' },
  162: { top: 'log_oak_top', side: 'log_big_oak', bottom: 'log_oak_top' },
  163: { all: 'planks_oak' },
  168: { all: 'prismarine_rough' },
  172: { all: 'hardened_clay' },
  179: { all: 'red_sandstone_normal' },
};

export function blockTextureKey(id, face) {
  const entry = BLOCK_TEX[id];
  if (!entry) return null;
  return entry[face] || entry.side || entry.all || null;
}

// Filled in by setAtlas() once assets/atlas.json and atlas.png have loaded.
let atlasMeta = null;
let atlasImage = null;

export function setAtlas(meta, image = null) {
  atlasMeta = meta;
  if (image) atlasImage = image;
}

export function getAtlas() {
  return atlasMeta;
}

/** The atlas as a drawable image, for the HUD's isometric block icons. */
export function getAtlasImage() {
  return atlasImage;
}

/** [column, row] of this block face in the atlas, or null when unknown. */
export function tileFor(id, face) {
  if (!atlasMeta) return null;
  const key = blockTextureKey(id, face);
  if (!key) return null;
  return atlasMeta.tiles[key] || null;
}

export const HOTBAR = [2, 3, 4, 5, 12, 17, 18, 20, 1];

export function hotbarBlock(index) {
  return HOTBAR[index] ?? HOTBAR[0];
}
