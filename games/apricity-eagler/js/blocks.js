// Block table: 1.12.2's block ids, their names, textures, hardness and the tool
// needed to harvest them. Textures are assembled into assets/atlas.png by
// tools/build-assets.mjs from the Eaglercraft asset pack, so every texture key
// below is a 1.12.2 texture name (textures/blocks/<key>.png).
//
// Each entry is
//   [name, fallback colour, solid, transparent, hardness, tool, tier, texture]
// `tool` is the tool class that harvests the block ('pickaxe', 'axe', 'shovel',
// 'shears') and `tier` the lowest tool tier that works (1 wood, 2 stone, 3 iron,
// 4 diamond). A null tool means the block drops to a bare hand. `hardness` is
// 1.12.2's own value and only decides how long a block takes to break.

const RAW = {
  0: ['Air', 0x000000, false, true, 0, null, 0, null],
  1: ['Stone', 0x7f7f7f, true, false, 1.5, 'pickaxe', 1, 'stone'],
  2: ['Grass Block', 0x6a9c3a, true, false, 0.6, 'shovel', 0, { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }],
  3: ['Dirt', 0x8b5a2b, true, false, 0.5, 'shovel', 0, 'dirt'],
  4: ['Cobblestone', 0x6b6b6b, true, false, 2, 'pickaxe', 1, 'cobblestone'],
  5: ['Oak Wood Planks', 0xb08b52, true, false, 2, 'axe', 0, 'planks_oak'],
  6: ['Oak Sapling', 0x4a802a, false, true, 0, null, 0, 'sapling_oak'],
  7: ['Bedrock', 0x282828, true, false, -1, null, 0, 'bedrock'],
  8: ['Water', 0x3a5fc8, false, true, 100, null, 0, 'water_still'],
  9: ['Water', 0x3a5fc8, false, true, 100, null, 0, 'water_still'],
  10: ['Lava', 0xd25a14, false, true, 100, null, 0, 'lava_still'],
  11: ['Lava', 0xd25a14, false, true, 100, null, 0, 'lava_still'],
  12: ['Sand', 0xe0d8a8, true, false, 0.5, 'shovel', 0, 'sand'],
  13: ['Gravel', 0x8a8a8a, true, false, 0.6, 'shovel', 0, 'gravel'],
  14: ['Gold Ore', 0xc8b450, true, false, 3, 'pickaxe', 3, 'gold_ore'],
  15: ['Iron Ore', 0xbe9682, true, false, 3, 'pickaxe', 2, 'iron_ore'],
  16: ['Coal Ore', 0x464646, true, false, 3, 'pickaxe', 1, 'coal_ore'],
  17: ['Oak Wood', 0x6b4f2a, true, false, 2, 'axe', 0, { top: 'log_oak_top', side: 'log_oak', bottom: 'log_oak_top' }],
  18: ['Oak Leaves', 0x3f7a2a, true, true, 0.2, 'shears', 0, 'leaves_oak'],
  19: ['Sponge', 0xc8c850, true, false, 0.6, null, 0, 'sponge'],
  20: ['Glass', 0xdbefff, true, true, 0.3, null, 0, 'glass'],
  21: ['Lapis Lazuli Ore', 0x3c50b4, true, false, 3, 'pickaxe', 2, 'lapis_ore'],
  22: ['Lapis Lazuli Block', 0x283c96, true, false, 3, 'pickaxe', 2, 'lapis_block'],
  23: ['Dispenser', 0x6e6e6e, true, false, 3.5, 'pickaxe', 1, { top: 'furnace_top', side: 'dispenser_front_vertical', bottom: 'furnace_top' }],
  24: ['Sandstone', 0xd8cda0, true, false, 0.8, 'pickaxe', 1, { top: 'sandstone_top', side: 'sandstone_normal', bottom: 'sandstone_bottom' }],
  25: ['Note Block', 0x785a46, true, false, 0.8, 'axe', 0, { top: 'noteblock', side: 'noteblock', bottom: 'planks_oak' }],
  27: ['Powered Rail', 0xc8a03c, false, true, 0.7, 'pickaxe', 1, 'rail_golden'],
  28: ['Detector Rail', 0x8a8a8a, false, true, 0.7, 'pickaxe', 1, 'rail_detector'],
  30: ['Cobweb', 0xe8e8e8, false, true, 4, 'shears', 0, 'web'],
  31: ['Grass', 0x6a9c3a, false, true, 0, null, 0, 'tallgrass'],
  32: ['Dead Bush', 0x8a6a3c, false, true, 0, null, 0, 'deadbush'],
  35: ['White Wool', 0xe6e6e6, true, false, 0.8, 'shears', 0, 'wool_colored_white'],
  37: ['Dandelion', 0xf0d840, false, true, 0, null, 0, 'flower_dandelion'],
  38: ['Poppy', 0xc83c3c, false, true, 0, null, 0, 'flower_rose'],
  39: ['Brown Mushroom', 0x9c7a5a, false, true, 0, null, 0, 'mushroom_brown'],
  40: ['Red Mushroom', 0xc83c3c, false, true, 0, null, 0, 'mushroom_red'],
  41: ['Block of Gold', 0xf0c83c, true, false, 3, 'pickaxe', 3, 'gold_block'],
  42: ['Block of Iron', 0xdcdcdc, true, false, 5, 'pickaxe', 2, 'iron_block'],
  43: ['Stone Slab', 0x969696, true, false, 2, 'pickaxe', 1, { top: 'stone_slab_top', side: 'stone_slab_side', bottom: 'stone_slab_top' }],
  44: ['Stone Slab', 0x969696, true, false, 2, 'pickaxe', 1, { top: 'stone_slab_top', side: 'stone_slab_side', bottom: 'stone_slab_top' }],
  45: ['Bricks', 0x9c5a4a, true, false, 2, 'pickaxe', 1, 'brick'],
  46: ['TNT', 0xc83c32, true, false, 0, null, 0, { top: 'tnt_top', side: 'tnt_side', bottom: 'tnt_bottom' }],
  47: ['Bookshelf', 0xa0825a, true, false, 1.5, 'axe', 0, { top: 'planks_oak', side: 'bookshelf', bottom: 'planks_oak' }],
  48: ['Mossy Cobblestone', 0x5a6e50, true, false, 2, 'pickaxe', 1, 'cobblestone_mossy'],
  49: ['Obsidian', 0x1e1428, true, false, 50, 'pickaxe', 4, 'obsidian'],
  50: ['Torch', 0xfadc78, false, true, 0, null, 0, 'torch_on'],
  51: ['Fire', 0xf0a028, false, true, 0, null, 0, 'fire_layer_0'],
  52: ['Monster Spawner', 0x28303c, true, true, 5, 'pickaxe', 1, 'mob_spawner'],
  53: ['Oak Wood Stairs', 0xb08b52, true, false, 2, 'axe', 0, { all: 'planks_oak' }],
  54: ['Chest', 0xa0783c, true, false, 2.5, 'axe', 0, 'planks_oak'],
  56: ['Diamond Ore', 0x5adcdc, true, false, 3, 'pickaxe', 3, 'diamond_ore'],
  57: ['Block of Diamond', 0x64e6e6, true, false, 5, 'pickaxe', 3, 'diamond_block'],
  58: ['Crafting Table', 0x8c643c, true, false, 2.5, 'axe', 0, { top: 'crafting_table_top', side: 'crafting_table_side', bottom: 'planks_oak' }],
  59: ['Wheat Crops', 0x9cb84a, false, true, 0, null, 0, 'wheat_stage_7'],
  60: ['Farmland', 0x5a3c1e, true, false, 0.6, 'shovel', 0, { top: 'farmland_dry', side: 'dirt', bottom: 'dirt' }],
  61: ['Furnace', 0x6e6e6e, true, false, 3.5, 'pickaxe', 1, { top: 'furnace_top', side: 'furnace_front_off', bottom: 'furnace_top' }],
  62: ['Furnace', 0x6e6e6e, true, false, 3.5, 'pickaxe', 1, { top: 'furnace_top', side: 'furnace_front_on', bottom: 'furnace_top' }],
  65: ['Ladder', 0x8a6a3c, false, true, 0.4, 'axe', 0, 'ladder'],
  66: ['Rail', 0x8a8a8a, false, true, 0.7, 'pickaxe', 1, 'rail_normal'],
  67: ['Cobblestone Stairs', 0x6b6b6b, true, false, 2, 'pickaxe', 1, { all: 'cobblestone' }],
  69: ['Lever', 0x8a6a3c, false, true, 0.5, null, 0, 'lever'],
  70: ['Stone Pressure Plate', 0x969696, true, false, 0.5, 'pickaxe', 1, 'stone'],
  73: ['Redstone Ore', 0x962828, true, false, 3, 'pickaxe', 2, 'redstone_ore'],
  75: ['Redstone Torch', 0x962828, false, true, 0, null, 0, 'redstone_torch_on'],
  76: ['Redstone Torch', 0x962828, false, true, 0, null, 0, 'redstone_torch_on'],
  77: ['Stone Button', 0x969696, false, true, 0.5, 'pickaxe', 1, 'stone'],
  78: ['Snow Layer', 0xf0faff, false, true, 0.1, 'shovel', 0, 'snow'],
  79: ['Ice', 0xa0c8f0, true, true, 0.5, 'pickaxe', 1, 'ice'],
  80: ['Snow Block', 0xf5faff, true, false, 0.2, 'shovel', 0, 'snow'],
  81: ['Cactus', 0x3c7832, true, false, 0.4, null, 0, { top: 'cactus_top', side: 'cactus_side', bottom: 'cactus_bottom' }],
  82: ['Clay', 0x9ea4b0, true, false, 0.6, 'shovel', 0, 'clay'],
  83: ['Sugar Cane', 0x8ac85a, false, true, 0, null, 0, 'reeds'],
  84: ['Jukebox', 0x8a6a4a, true, false, 2, 'axe', 0, { top: 'jukebox_top', side: 'jukebox_side', bottom: 'planks_oak' }],
  85: ['Oak Fence', 0xb08b52, true, false, 2, 'axe', 0, 'planks_oak'],
  86: ['Pumpkin', 0xd88a2a, true, false, 1, 'axe', 0, { top: 'pumpkin_top', side: 'pumpkin_side', bottom: 'pumpkin_top' }],
  87: ['Netherrack', 0x6e3232, true, false, 0.4, 'pickaxe', 1, 'netherrack'],
  88: ['Soul Sand', 0x5a4637, true, false, 0.5, 'shovel', 0, 'soul_sand'],
  89: ['Glowstone', 0xe6c878, true, false, 0.3, null, 0, 'glowstone'],
  91: ['Jack o\'Lantern', 0xd88a2a, true, false, 1, 'axe', 0, { top: 'pumpkin_top', side: 'pumpkin_face_off', bottom: 'pumpkin_top' }],
  95: ['White Stained Glass', 0xffffff, true, true, 0.3, null, 0, 'glass_white'],
  96: ['Oak Trapdoor', 0xa8824c, true, false, 3, 'axe', 0, 'trapdoor'],
  98: ['Stone Bricks', 0x828282, true, false, 1.5, 'pickaxe', 1, 'stonebrick'],
  99: ['Brown Mushroom Block', 0x9c7a5a, true, false, 0.2, 'axe', 0, 'mushroom_block_inside'],
  100: ['Red Mushroom Block', 0xc83c3c, true, false, 0.2, 'axe', 0, 'mushroom_block_inside'],
  101: ['Iron Bars', 0xa8a8a8, true, true, 5, 'pickaxe', 2, 'iron_bars'],
  102: ['Glass Pane', 0xdbefff, true, true, 0.3, null, 0, 'glass'],
  103: ['Melon', 0x6ca832, true, false, 1, 'axe', 0, { top: 'melon_top', side: 'melon_side', bottom: 'melon_top' }],
  106: ['Vines', 0x3c6e28, false, true, 0.2, 'shears', 0, 'vine'],
  107: ['Oak Fence Gate', 0xb08b52, true, false, 2, 'axe', 0, 'planks_oak'],
  108: ['Brick Stairs', 0x9c5a4a, true, false, 2, 'pickaxe', 1, { all: 'brick' }],
  109: ['Stone Brick Stairs', 0x828282, true, false, 1.5, 'pickaxe', 1, { all: 'stonebrick' }],
  110: ['Mycelium', 0x82707a, true, false, 0.6, 'shovel', 0, { top: 'mycelium_top', side: 'mycelium_side', bottom: 'dirt' }],
  111: ['Lily Pad', 0x3c7828, false, true, 0, null, 0, 'waterlily'],
  112: ['Nether Brick', 0x3c282d, true, false, 2, 'pickaxe', 1, 'nether_brick'],
  113: ['Nether Brick Fence', 0x3c282d, true, false, 2, 'pickaxe', 1, 'nether_brick'],
  114: ['Nether Brick Stairs', 0x3c282d, true, false, 2, 'pickaxe', 1, { all: 'nether_brick' }],
  116: ['Enchantment Table', 0xa83030, true, false, 5, 'pickaxe', 1, { top: 'enchanting_table_top', side: 'enchanting_table_side', bottom: 'enchanting_table_bottom' }],
  118: ['Cauldron', 0x4a4a4a, true, false, 2, 'pickaxe', 1, { top: 'cauldron_top', side: 'cauldron_side', bottom: 'cauldron_bottom' }],
  120: ['End Portal Frame', 0x3c6e5a, true, false, -1, null, 0, { top: 'endframe_top', side: 'endframe_side', bottom: 'endframe_top' }],
  121: ['End Stone', 0xdcdca0, true, false, 3, 'pickaxe', 1, 'end_stone'],
  123: ['Redstone Lamp', 0x6e4a2a, true, false, 0.3, null, 0, 'redstone_lamp_off'],
  124: ['Redstone Lamp', 0xa06a1e, true, false, 0.3, null, 0, 'redstone_lamp_on'],
  125: ['Oak Wood Slab', 0xb08b52, true, false, 2, 'axe', 0, 'planks_oak'],
  126: ['Oak Wood Slab', 0xb08b52, true, false, 2, 'axe', 0, 'planks_oak'],
  128: ['Sandstone Stairs', 0xd8cda0, true, false, 0.8, 'pickaxe', 1, { all: 'sandstone_normal' }],
  129: ['Emerald Ore', 0x3cdc6a, true, false, 3, 'pickaxe', 2, 'emerald_ore'],
  130: ['Ender Chest', 0x2a3c46, true, true, 22.5, 'pickaxe', 1, 'obsidian'],
  133: ['Block of Emerald', 0x3cdc6a, true, false, 5, 'pickaxe', 2, 'emerald_block'],
  137: ['Command Block', 0xc8a06a, true, false, -1, null, 0, 'command_block_side'],
  138: ['Beacon', 0x7ce6dc, true, true, 3, null, 0, 'beacon'],
  139: ['Cobblestone Wall', 0x6b6b6b, true, false, 2, 'pickaxe', 1, { all: 'cobblestone' }],
  140: ['Flower Pot', 0x9c5a4a, false, true, 0, null, 0, 'flower_pot'],
  141: ['Carrots', 0x3c8a2a, false, true, 0, null, 0, 'carrots_stage_3'],
  142: ['Potatoes', 0x5a8a3c, false, true, 0, null, 0, 'potatoes_stage_3'],
  143: ['Oak Button', 0xb08b52, false, true, 0.5, null, 0, 'planks_oak'],
  145: ['Anvil', 0x4a4a4a, true, false, 5, 'pickaxe', 1, { top: 'anvil_top_damaged_0', side: 'anvil_base', bottom: 'anvil_base' }],
  146: ['Trapped Chest', 0xa0783c, true, false, 2.5, 'axe', 0, 'planks_oak'],
  149: ['Redstone Comparator', 0x9c9c9c, true, false, 0, null, 0, 'comparator_off'],
  150: ['Redstone Comparator', 0x9c9c9c, true, false, 0, null, 0, 'comparator_on'],
  151: ['Daylight Detector', 0x8a7a5a, true, false, 0.2, 'axe', 0, { top: 'daylight_detector_top', side: 'daylight_detector_side', bottom: 'daylight_detector_side' }],
  152: ['Block of Redstone', 0x962828, true, false, 5, 'pickaxe', 1, 'redstone_block'],
  153: ['Nether Quartz Ore', 0xe6e0dc, true, false, 3, 'pickaxe', 1, 'quartz_ore'],
  154: ['Hopper', 0x4a4a4a, true, true, 3, 'pickaxe', 1, { top: 'hopper_top', side: 'hopper_outside', bottom: 'hopper_outside' }],
  155: ['Block of Quartz', 0xebe6e1, true, false, 0.8, 'pickaxe', 1, { top: 'quartz_block_top', side: 'quartz_block_side', bottom: 'quartz_block_top' }],
  156: ['Quartz Stairs', 0xebe6e1, true, false, 0.8, 'pickaxe', 1, { all: 'quartz_block_side' }],
  157: ['Activator Rail', 0xa8483c, false, true, 0.7, 'pickaxe', 1, 'rail_activator'],
  158: ['Dropper', 0x6e6e6e, true, false, 3.5, 'pickaxe', 1, { top: 'furnace_top', side: 'dispenser_front_vertical', bottom: 'furnace_top' }],
  159: ['White Terracotta', 0xd1b1a1, true, false, 1.25, 'pickaxe', 1, 'hardened_clay_stained_white'],
  160: ['White Stained Glass Pane', 0xffffff, true, true, 0.3, null, 0, 'glass_white'],
  161: ['Spruce Leaves', 0x2f6a24, true, true, 0.2, 'shears', 0, 'leaves_spruce'],
  162: ['Dark Oak Wood', 0x4a3620, true, false, 2, 'axe', 0, { top: 'log_big_oak_top', side: 'log_big_oak', bottom: 'log_big_oak_top' }],
  163: ['Acacia Wood Stairs', 0xb0603c, true, false, 2, 'axe', 0, { all: 'planks_acacia' }],
  164: ['Dark Oak Wood Stairs', 0x4a3620, true, false, 2, 'axe', 0, { all: 'planks_big_oak' }],
  165: ['Slime Block', 0x7cc87c, true, true, 0, null, 0, 'slime'],
  166: ['Barrier', 0xff0000, true, true, -1, null, 0, 'glass'],
  167: ['Iron Trapdoor', 0xdcdcdc, true, false, 5, 'pickaxe', 2, 'iron_trapdoor'],
  168: ['Prismarine', 0x5a9c8c, true, false, 1.5, 'pickaxe', 1, 'prismarine_rough'],
  169: ['Sea Lantern', 0xc8e6d8, true, false, 0.3, null, 0, 'sea_lantern'],
  170: ['Hay Bale', 0xd8b83c, true, false, 0.5, null, 0, { top: 'hay_block_top', side: 'hay_block_side', bottom: 'hay_block_top' }],
  171: ['White Carpet', 0xe6e6e6, false, true, 0.1, null, 0, 'wool_colored_white'],
  172: ['Terracotta', 0x96704c, true, false, 1.25, 'pickaxe', 1, 'hardened_clay'],
  173: ['Block of Coal', 0x2a2a2a, true, false, 5, 'pickaxe', 1, 'coal_block'],
  174: ['Packed Ice', 0xa0c8f0, true, false, 0.5, 'pickaxe', 1, 'ice_packed'],
  175: ['Double Tallgrass', 0x6a9c3a, false, true, 0, null, 0, 'double_plant_grass_top'],
  179: ['Red Sandstone', 0xc86a3c, true, false, 0.8, 'pickaxe', 1, { top: 'red_sandstone_top', side: 'red_sandstone_normal', bottom: 'red_sandstone_bottom' }],
  180: ['Red Sandstone Stairs', 0xc86a3c, true, false, 0.8, 'pickaxe', 1, { all: 'red_sandstone_normal' }],
  181: ['Red Sandstone Slab', 0xc86a3c, true, false, 2, 'pickaxe', 1, { all: 'red_sandstone_normal' }],
  182: ['Red Sandstone Slab', 0xc86a3c, true, false, 2, 'pickaxe', 1, { all: 'red_sandstone_normal' }],
  198: ['End Rod', 0xe6e0dc, true, false, 0, null, 0, 'end_rod'],
  199: ['Chorus Plant', 0x7a5a7a, false, true, 0.4, null, 0, 'chorus_plant'],
  200: ['Chorus Flower', 0x9c7a9c, false, true, 0.4, null, 0, 'chorus_flower'],
  201: ['Purpur Block', 0xa87aa8, true, false, 1.5, 'pickaxe', 1, 'purpur_block'],
  202: ['Purpur Pillar', 0xa87aa8, true, false, 1.5, 'pickaxe', 1, { top: 'purpur_pillar_top', side: 'purpur_pillar', bottom: 'purpur_pillar_top' }],
  203: ['Purpur Stairs', 0xa87aa8, true, false, 1.5, 'pickaxe', 1, { all: 'purpur_block' }],
  204: ['Purpur Slab', 0xa87aa8, true, false, 1.5, 'pickaxe', 1, { all: 'purpur_block' }],
  205: ['Purpur Slab', 0xa87aa8, true, false, 1.5, 'pickaxe', 1, { all: 'purpur_block' }],
  206: ['End Stone Bricks', 0xdcdca0, true, false, 3, 'pickaxe', 1, 'end_bricks'],
  208: ['Grass Path', 0x9c8a4a, true, false, 0.6, 'shovel', 0, { top: 'grass_path_top', side: 'grass_path_side', bottom: 'dirt' }],
  210: ['Repeating Command Block', 0xc8a06a, true, false, -1, null, 0, 'repeating_command_block_side'],
  211: ['Chain Command Block', 0xc8a06a, true, false, -1, null, 0, 'chain_command_block_side'],
  212: ['Frosted Ice', 0xb0d8f0, true, true, 0.5, 'pickaxe', 1, 'frosted_ice_0'],
  213: ['Magma Block', 0x8a3c1e, true, false, 0.5, 'pickaxe', 1, 'magma'],
  214: ['Nether Wart Block', 0x8a1e1e, true, false, 1, null, 0, 'nether_wart_block'],
  215: ['Red Nether Brick', 0x5a1e1e, true, false, 2, 'pickaxe', 1, 'red_nether_brick'],
  216: ['Bone Block', 0xe6e0c8, true, false, 2, 'pickaxe', 1, { top: 'bone_block_top', side: 'bone_block_side', bottom: 'bone_block_top' }],
  218: ['Observer', 0x8a8a8a, true, false, 3, 'pickaxe', 1, { top: 'observer_top', side: 'observer_side', bottom: 'observer_back' }],
  251: ['White Concrete', 0xcfd5d6, true, false, 1.8, 'pickaxe', 1, 'concrete_white'],
  252: ['White Concrete Powder', 0xcfd5d6, true, false, 0.5, 'shovel', 0, 'concrete_powder_white'],
};

function unpack(hex) {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}

const FALLBACK = [0.6, 0.6, 0.6];

export const BLOCKS = new Map();
for (const [id, [name, color, solid, transparent, hardness, tool, tier]] of Object.entries(RAW)) {
  BLOCKS.set(Number(id), {
    id: Number(id),
    name,
    color: unpack(color),
    solid: solid !== false,
    transparent: Boolean(transparent),
    hardness: typeof hardness === 'number' ? hardness : 1,
    tool: tool ?? null,
    tier: tier ?? 0,
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

/** 1.12.2's hardness: -1 is unbreakable, 0 is instant. */
export function blockHardness(id) {
  return BLOCKS.get(id)?.hardness ?? 1;
}

/** Which atlas tile each face uses: `all`, or `top` / `side` / `bottom`. */
export const BLOCK_TEX = {};
for (const [id, entry] of Object.entries(RAW)) {
  const tex = entry[7];
  if (!tex) continue;
  BLOCK_TEX[Number(id)] = typeof tex === 'string' ? { all: tex } : tex;
}

export function blockTextureKey(id, face) {
  const entry = BLOCK_TEX[id];
  if (!entry) return null;
  return entry[face] || entry.side || entry.all || null;
}

/** The tile a block shows as a flat inventory sprite (fallback for no cube icon). */
export function blockFlatKey(id) {
  const entry = BLOCK_TEX[id];
  if (!entry) return null;
  return entry.all || entry.top || entry.side || null;
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

/** The texture stem that names this block in commands ('diamond_block'). */
export function blockKey(id) {
  const entry = BLOCK_TEX[id];
  if (!entry) return null;
  return entry.side || entry.all || entry.top || null;
}

/** Words that carry no meaning when matching a block name by hand. Dropping
 *  them makes 'oak_planks', 'planks_oak' and 'Oak Wood Planks' the same block. */
const LOOSE_STOP = new Set(['of', 'wood']);

export function looseName(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/^minecraft:/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .split('_')
    .filter((word) => word && !LOOSE_STOP.has(word))
    .sort()
    .join('_');
}

/** Block id by display name ('Block of Diamond') or texture key ('diamond_block'). */
export function blockIdByName(name) {
  const wanted = String(name).toLowerCase();
  for (const [id, def] of BLOCKS) {
    if (def.name.toLowerCase() === wanted) return id;
  }
  for (const [id] of BLOCKS) {
    const key = blockKey(id);
    if (key && key.toLowerCase() === wanted) return id;
  }
  return blockIdByLooseName(name);
}

/** Last-resort name match that ignores word order and filler words. */
export function blockIdByLooseName(name) {
  const wanted = looseName(name);
  if (!wanted) return 0;
  for (const [id, def] of BLOCKS) {
    if (looseName(def.name) === wanted) return id;
  }
  for (const [id] of BLOCKS) {
    const key = blockKey(id);
    if (key && looseName(key) === wanted) return id;
  }
  return 0;
}
