// Builds the client's textures, GUI art and menu strings from the Eaglercraft
// asset packs already on this machine:
//   ../mc.html                                                  (1.12.2 client, pack embedded)
//   ../eagler-1.20-main/javascript/builds/0.2.0/assets.epk       (fallback)
//   ../eagler-1.20-main/javascript/builds/0.1.0/assets.epk       (fallback)
//
//   node tools/build-assets.mjs
//
// Nothing is downloaded and no extraction directories are needed: the packs are
// inflated in memory, so the 1.12.2 art is always rebuilt from its own client.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { decodePNG, encodePNG, blitTile, resizeTile, firstFrame } from './png.mjs';
import { readPack, findEmbeddedPack } from './epk.mjs';
import { BLOCK_TEX, BLOCKS } from '../js/blocks.js';

const OUT = 'assets';
const PACK_FILES = [
  '../mc.html',
  '../eagler-1.20-main/javascript/builds/0.2.0/assets.epk',
  '../eagler-1.20-main/javascript/builds/0.1.0/assets.epk',
];
const PREFIX = 'assets/minecraft/';

// ── packs ──────────────────────────────────────────────────────────────────

function loadPacks() {
  const packs = [];
  for (const file of PACK_FILES) {
    if (!existsSync(file)) {
      console.warn(`pack missing: ${file}`);
      continue;
    }
    let raw;
    if (file.endsWith('.html')) {
      raw = findEmbeddedPack(readFileSync(file, 'latin1'));
      if (!raw) {
        console.warn(`no embedded pack in ${file}`);
        continue;
      }
    } else {
      raw = readFileSync(file);
    }
    const { files } = readPack(raw);
    const index = new Map();
    for (const [name, data] of files) {
      const cut = name.indexOf(PREFIX);
      if (cut < 0) continue;
      const key = name.slice(cut + PREFIX.length);
      if (!index.has(key)) index.set(key, data);
    }
    packs.push({ file, index });
    console.log(`pack ${file.split('/').pop()}: ${index.size} assets`);
  }
  if (!packs.length) throw new Error('no asset packs found');
  return packs;
}

const packs = loadPacks();

/** First pack that has assets/minecraft/<key>. */
function asset(key) {
  for (const pack of packs) {
    const data = pack.index.get(key);
    if (data) return { data, pack };
  }
  return null;
}

function assetImage(key) {
  const found = asset(key);
  if (!found) return null;
  try {
    return decodePNG(found.data);
  } catch (err) {
    console.warn(`cannot decode ${key}: ${err.message}`);
    return null;
  }
}

// ── block atlas ────────────────────────────────────────────────────────────

// Atlas keys are canonical; each has pack filenames to try in order.
const CANDIDATES = {
  dirt: ['dirt', 'coarse_dirt', 'farmland_dry'],
  cobblestone: ['cobblestone', 'cobblestone_mossy', 'stone'],
  gravel: ['gravel', 'cobblestone_mossy', 'sand'],
  lapis_ore: ['lapis_ore', 'lapis_block'],
  log_oak: ['log_oak', 'log_spruce', 'log_acacia'],
  log_oak_top: ['log_oak_top', 'log_spruce_top', 'log_acacia_top', 'log_oak'],
  log_big_oak: ['log_big_oak', 'log_acacia', 'log_oak'],
  leaves_oak: ['leaves_oak', 'leaves_birch', 'leaves_jungle', 'leaves_spruce'],
  leaves_spruce: ['leaves_spruce', 'leaves_jungle', 'leaves_oak'],
  stonebrick: ['stonebrick', 'stonebrick_carved', 'stone'],
  water_still: ['water_still', 'water_flow'],
  lava_still: ['lava_still', 'lava_flow'],
  wheat_stage_7: ['wheat_stage_7', 'wheat_stage_6', 'wheat_stage_4'],
  end_stone: ['end_stone', 'endframe_top', 'sandstone_normal'],
  quartz_block_top: ['quartz_block_top', 'quartz_block_side'],
  cactus_top: ['cactus_top', 'cactus_side'],
  sandstone_normal: ['sandstone_normal', 'sandstone_top', 'sand'],
  fire_layer_0: ['fire_layer_0', 'fire_layer_1'],
  rail_normal: ['rail_normal', 'rail'],
  furnace_top: ['furnace_top', 'furnace_side'],
  tnt_top: ['tnt_side', 'tnt_top'],
  stone_slab_side: ['stone_slab_side', 'stone'],
  prismarine_rough: ['prismarine_rough', 'prismarine_dark'],
  mob_spawner: ['mob_spawner', 'obsidian'],
};

const usedKeys = new Set();
for (const entry of Object.values(BLOCK_TEX)) {
  for (const key of [entry.all, entry.top, entry.side, entry.bottom]) if (key) usedKeys.add(key);
}
const keys = [...usedKeys].sort();

// Colour used when a texture is genuinely absent from every pack.
const keyColor = new Map();
for (const [id, entry] of Object.entries(BLOCK_TEX)) {
  const color = BLOCKS.get(Number(id))?.color ?? [0.6, 0.6, 0.6];
  for (const key of [entry.all, entry.top, entry.side, entry.bottom]) {
    if (key && !keyColor.has(key)) keyColor.set(key, color);
  }
}

function blockAsset(names) {
  for (const name of names) {
    const found = asset(`textures/blocks/${name}.png`);
    if (found) return { ...found, name };
  }
  return null;
}

function proceduralTile(key) {
  const [r, g, b] = keyColor.get(key) ?? [0.6, 0.6, 0.6];
  const data = Buffer.alloc(16 * 16 * 4);
  let seed = 0;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      seed = (Math.imul(seed, 1103515245) + 12345) | 0;
      const noise = ((seed >>> 16) & 0xff) / 255;
      const k = 0.86 + noise * 0.28;
      const i = (y * 16 + x) * 4;
      data[i] = Math.min(255, Math.round(r * 255 * k));
      data[i + 1] = Math.min(255, Math.round(g * 255 * k));
      data[i + 2] = Math.min(255, Math.round(b * 255 * k));
      data[i + 3] = 255;
    }
  }
  return { width: 16, height: 16, data };
}

// ── runtime tints ──────────────────────────────────────────────────────────

// 1.12.2 keeps several block textures greyscale and colours them while drawing:
// grass and lily pads with the biome grass colour, leaves and vines with the
// foliage colour. Baking the plains colour in is what stops those tiles from
// rendering grey in our world.
const GRASS_COLOR = [0x91, 0xbd, 0x59]; // BiomePlains grass in 1.12.2
const FOLIAGE_COLOR = [0x77, 0xab, 0x2f]; // BiomePlains foliage in 1.12.2

const TINTS = {
  grass_top: GRASS_COLOR,
  leaves_oak: FOLIAGE_COLOR,
  leaves_spruce: FOLIAGE_COLOR,
  vine: FOLIAGE_COLOR,
  waterlily: GRASS_COLOR,
};

/** Multiply a tile by a colour, the way the game's biome tint does. */
function multiply(img, [r, g, b]) {
  const data = Buffer.from(img.data);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round((data[i] * r) / 255);
    data[i + 1] = Math.round((data[i + 1] * g) / 255);
    data[i + 2] = Math.round((data[i + 2] * b) / 255);
  }
  return { width: img.width, height: img.height, data };
}

/** Alpha-composite one tile over another, keeping the base's pixels underneath. */
function composite(base, top) {
  const data = Buffer.from(base.data);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = top.data[i + 3] / 255;
    if (!alpha) continue;
    for (let channel = 0; channel < 3; channel++) {
      data[i + channel] = Math.round(
        base.data[i + channel] * (1 - alpha) + top.data[i + channel] * alpha
      );
    }
  }
  return { width: base.width, height: base.height, data };
}

mkdirSync(OUT, { recursive: true });

// ── item icons ─────────────────────────────────────────────────────────────

// Every item texture the pack ships becomes a tile of its own under the key
// `item:<stem>`, so the HUD, the inventory, the creative menu and dropped items
// all sample one texture. Blocks keep their bare keys.
const itemStems = new Set();
for (const pack of packs) {
  for (const name of pack.index.keys()) {
    if (!name.startsWith('textures/items/') || !name.endsWith('.png')) continue;
    itemStems.add(name.slice('textures/items/'.length, -4));
  }
}
const itemKeys = [...itemStems].sort();
const allKeys = [...keys, ...itemKeys.map((stem) => `item:${stem}`)];

const TILE = 16;
const COLUMNS = 16;
const atlasW = COLUMNS * TILE;
const atlasH = Math.ceil(allKeys.length / COLUMNS) * TILE;
const atlas = Buffer.alloc(atlasW * atlasH * 4);
const tiles = {};
const fromPack = [];
const generated = [];
const undecodable = [];
const tinted = [];

keys.forEach((key, index) => {
  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const found = blockAsset([...new Set([key, ...(CANDIDATES[key] ?? [])])]);

  let img = null;
  if (found) {
    try {
      // Animated strips are vertical sheets: take frame one, then normalise to
      // exactly one tile so nothing can spill into a neighbouring atlas cell.
      img = resizeTile(firstFrame(decodePNG(found.data)), TILE);
      fromPack.push(`${key} <- ${found.name}.png (${found.pack.file.split('/').pop()})`);
    } catch (err) {
      undecodable.push(`${found.name}.png (${err.message})`);
    }
  }
  if (!img) {
    img = proceduralTile(key);
    generated.push(key);
  }

  const tint = TINTS[key];
  if (tint) {
    img = multiply(img, tint);
    tinted.push(key);
  }

  // A grass block's side is dirt with a tinted overlay on top, so compose the
  // two instead of showing bare dirt with a grey band.
  if (key === 'grass_side') {
    const overlaySource = assetImage('textures/blocks/grass_side_overlay.png');
    if (overlaySource) {
      img = composite(img, multiply(resizeTile(firstFrame(overlaySource), TILE), GRASS_COLOR));
      tinted.push('grass_side_overlay');
    }
  }

  blitTile(atlas, atlasW, img, col * TILE, row * TILE);
  tiles[key] = [col, row];
});

itemKeys.forEach((stem, index) => {
  const key = `item:${stem}`;
  const at = keys.length + index;
  const col = at % COLUMNS;
  const row = Math.floor(at / COLUMNS);
  const found = asset(`textures/items/${stem}.png`);
  let img = null;
  if (found) {
    try {
      img = resizeTile(firstFrame(decodePNG(found.data)), TILE);
      fromPack.push(`${key} <- items/${stem}.png`);
    } catch (err) {
      undecodable.push(`items/${stem}.png (${err.message})`);
    }
  }
  if (!img) {
    img = proceduralTile(stem);
    generated.push(key);
  }
  blitTile(atlas, atlasW, img, col * TILE, row * TILE);
  tiles[key] = [col, row];
});

writeFileSync(join(OUT, 'atlas.png'), encodePNG({ width: atlasW, height: atlasH, data: atlas }));
writeFileSync(
  join(OUT, 'atlas.json'),
  JSON.stringify({ tileSize: TILE, width: atlasW, height: atlasH, tiles })
);

// ── GUI art ────────────────────────────────────────────────────────────────

const written = [];

function saveImage(name, img) {
  writeFileSync(join(OUT, name), encodePNG(img));
  written.push(`${name} ${img.width}x${img.height}`);
}

function crop(img, x, y, w, h) {
  const data = Buffer.alloc(w * h * 4);
  for (let row = 0; row < h; row++) {
    img.data.copy(
      data,
      row * w * 4,
      ((y + row) * img.width + x) * 4,
      ((y + row) * img.width + x + w) * 4
    );
  }
  return { width: w, height: h, data };
}

/** Crop one sprite out of a sheet and write it as its own file. */
function sprite(key, name, x, y, w, h) {
  const img = assetImage(key);
  if (!img) {
    generated.push(name);
    return false;
  }
  saveImage(name, crop(img, x, y, w, h));
  written[written.length - 1] += ` <- ${key.split('/').pop()} (${x},${y})`;
  return true;
}

/** Copy a sheet or image through untouched. */
function copyArt(key, name) {
  const found = asset(key);
  if (!found) {
    generated.push(name);
    return false;
  }
  writeFileSync(join(OUT, name), found.data);
  written.push(`${name} <- ${key.split('/').pop()}`);
  return true;
}

// Widgets: buttons at y=46/66/86 and the hotbar at the top of the 1.12.2 sheet.
const WIDGETS = 'textures/gui/widgets.png';
sprite(WIDGETS, 'gui-button.png', 0, 46, 200, 20);
sprite(WIDGETS, 'gui-button-hover.png', 0, 66, 200, 20);
sprite(WIDGETS, 'gui-button-disabled.png', 0, 86, 200, 20);
sprite(WIDGETS, 'gui-hotbar.png', 0, 0, 182, 22);
sprite(WIDGETS, 'gui-hotbar-select.png', 0, 22, 24, 24);
// A 1.12.2 slider is the button body with an 8px handle on top of it.
sprite(WIDGETS, 'gui-slider.png', 0, 46, 200, 20);
sprite(WIDGETS, 'gui-slider-knob.png', 0, 66, 8, 20);
copyArt(WIDGETS, 'gui-widgets.png');

// HUD sheet: hearts, hunger and the XP bar, at 1.12.2's own offsets.
const ICONS = 'textures/gui/icons.png';
copyArt(ICONS, 'gui-icons.png');
sprite(ICONS, 'hud-xp-bg.png', 0, 64, 182, 5);
sprite(ICONS, 'hud-xp-fill.png', 0, 69, 182, 5);

copyArt('textures/gui/options_background.png', 'gui-menu-bg.png');
copyArt('textures/gui/server_selection.png', 'gui-server-selection.png');
copyArt('textures/gui/world_selection.png', 'gui-world-selection.png');
sprite('textures/gui/toasts.png', 'gui-toast.png', 0, 0, 160, 32);
sprite('textures/gui/container/inventory.png', 'gui-inventory.png', 0, 0, 176, 166);
sprite('textures/gui/container/crafting_table.png', 'gui-crafting.png', 0, 0, 176, 166);
sprite('textures/gui/container/furnace.png', 'gui-furnace.png', 0, 0, 176, 166);
// The flame and the cooking arrow live beside the panel in the same sheet.
sprite('textures/gui/container/furnace.png', 'gui-furnace-flame.png', 176, 0, 14, 14);
sprite('textures/gui/container/furnace.png', 'gui-furnace-arrow.png', 176, 14, 24, 17);
sprite('textures/gui/container/creative_inventory/tab_inventory.png', 'gui-creative.png', 0, 0, 195, 136);

// The title sheet stores the 274x44 "MINECRAFT" word as two rows (155 + 119)
// because the sheet is only 256 wide; stitch it back into the single logo the
// 1.12.2 title screen draws.
{
  const sheet = assetImage('textures/gui/title/minecraft.png');
  if (sheet) {
    const width = 155 + 119;
    const height = 44;
    const data = Buffer.alloc(width * height * 4);
    const place = (sx, sy, w, dx) => {
      for (let y = 0; y < height; y++) {
        img_copy(sheet, data, sx, sy + y, w, y, width, dx);
      }
    };
    place(0, 0, 155, 0);
    place(0, 45, 119, 155);
    saveImage('gui-logo.png', { width, height, data });
    written[written.length - 1] += ' <- title/minecraft.png (stitched 155 + 119)';
  } else {
    generated.push('gui-logo.png');
  }
}

function img_copy(src, dst, sx, sy, w, dy, dstW, dx) {
  for (let x = 0; x < w; x++) {
    const s = (sy * src.width + sx + x) * 4;
    const d = (dy * dstW + dx + x) * 4;
    dst[d] = src.data[s];
    dst[d + 1] = src.data[s + 1];
    dst[d + 2] = src.data[s + 2];
    dst[d + 3] = src.data[s + 3];
  }
}

// Title background: the pack's first panorama frame, shrunk to keep the page light.
{
  const panorama = assetImage('textures/gui/title/background/panorama_1.png');
  if (panorama) saveImage('title-bg.png', resizeTile(panorama, Math.min(512, panorama.width)));
  else generated.push('title-bg.png');
}

// ── sounds ─────────────────────────────────────────────────────────────────

// 1.12.2 plays four variants per material, picked at random, for both breaking
// and placing a block. They go straight from the pack into assets/sounds.
const SOUND_GROUPS = ['stone', 'wood', 'grass', 'sand', 'gravel', 'cloth', 'snow'];
mkdirSync(join(OUT, 'sounds'), { recursive: true });
let soundFiles = 0;
let soundBytes = 0;
for (const group of SOUND_GROUPS) {
  for (let variant = 1; variant <= 4; variant++) {
    const found = asset(`sounds/dig/${group}${variant}.ogg`);
    if (!found) continue;
    writeFileSync(join(OUT, 'sounds', `${group}${variant}.ogg`), found.data);
    soundFiles++;
    soundBytes += found.data.length;
  }
}
const click = asset('sounds/random/click.ogg');
if (click) {
  writeFileSync(join(OUT, 'sounds', 'click.ogg'), click.data);
  soundFiles++;
  soundBytes += click.data.length;
}
// Item pickup and damage grunt, when this pack ships them. Missing files are
// skipped; the client plays silence rather than failing.
for (const [name, source] of [
  ['pop.ogg', 'sounds/random/pop.ogg'],
  ['hurt.ogg', 'sounds/random/hurt.ogg'],
]) {
  const found = asset(source);
  if (!found) continue;
  writeFileSync(join(OUT, 'sounds', name), found.data);
  soundFiles++;
  soundBytes += found.data.length;
}
written.push(`sounds/*.ogg ${soundFiles} files (${Math.round(soundBytes / 1024)} KB) <- sounds/dig`);

// ── bitmap font ────────────────────────────────────────────────────────────

// 1.12.2's ascii.png is a 16x16 grid of 8x8 glyph cells; advances are measured
// from the art, exactly like the game measures its own character widths.
const fontImg = assetImage('textures/font/ascii.png');
if (fontImg) {
  const cell = 8;
  const columns = Math.floor(fontImg.width / cell);
  writeFileSync(join(OUT, 'font.png'), asset('textures/font/ascii.png').data);
  const advances = {};
  for (let code = 32; code < 127; code++) {
    const col = (code % columns) * cell;
    const row = Math.floor(code / columns) * cell;
    let maxX = -1;
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        if (fontImg.data[((row + y) * fontImg.width + col + x) * 4 + 3] > 0 && x > maxX) maxX = x;
      }
    }
    advances[code] = code === 32 ? 4 : Math.max(1, maxX + 1);
  }
  writeFileSync(
    join(OUT, 'font.json'),
    JSON.stringify({ cell, width: fontImg.width, height: fontImg.height, advances })
  );
  written.push(`font.png + font.json (${Object.keys(advances).length} glyphs) <- font/ascii.png`);
} else {
  generated.push('font.png');
}

// ── strings: the pack's own language file and splash list ──────────────────

function readText(key) {
  const found = asset(key);
  return found ? found.data.toString('utf8') : '';
}

const langFile = readText('lang/en_us.lang');
const lang = new Map();
for (const line of langFile.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const cut = line.indexOf('=');
  lang.set(line.slice(0, cut).trim(), line.slice(cut + 1).trim());
}

// Strings the screens need; the pack's lang wins, the fallback is 1.12.2's own
// en_us wording for keys this (trimmed) pack leaves out.
const STRING_KEYS = {
  singleplayer: ['menu.singleplayer', 'Singleplayer'],
  multiplayer: ['menu.multiplayer', 'Multiplayer'],
  options: ['menu.options', 'Options...'],
  quit: ['menu.quit', 'Quit Game'],
  realms: ['menu.online', 'Minecraft Realms'],
  gameMenu: ['menu.game', 'Game Menu'],
  backToGame: ['menu.returnToGame', 'Back to Game'],
  saveQuit: ['menu.saveAndQuit', 'Save and Quit to Title'],
  selectWorld: ['selectWorld.title', 'Select World'],
  playSelected: ['selectWorld.select', 'Play Selected World'],
  createWorld: ['selectWorld.create', 'Create New World'],
  edit: ['selectWorld.edit', 'Edit'],
  delete: ['selectWorld.delete', 'Delete'],
  recreate: ['selectWorld.recreate', 'Re-Create'],
  playMultiplayer: ['multiplayer.title', 'Play Multiplayer'],
  joinServer: ['multiplayer.connect', 'Join Server'],
  directConnect: ['multiplayer.directConnect', 'Direct Connect'],
  addServer: ['multiplayer.addServer', 'Add Server'],
  refresh: ['multiplayer.refresh', 'Refresh'],
  cancel: ['gui.cancel', 'Cancel'],
  done: ['gui.done', 'Done'],
  back: ['gui.back', 'Back'],
  inventory: ['container.inventory', 'Inventory'],
  optionsTitle: ['options.title', 'Options'],
  fov: ['options.fov', 'FOV'],
  renderDistance: ['options.renderDistance', 'Render Distance'],
  sensitivity: ['options.sensitivity', 'Sensitivity'],
  guiScale: ['options.guiScale', 'GUI Scale'],
  worldName: ['selectWorld.enterName', 'World Name'],
  worldSeed: ['selectWorld.enterSeed', 'Seed for the World Generator'],
  serverName: ['multiplayer.enterName', 'Server Name'],
  serverAddress: ['multiplayer.enterIP', 'Server Address'],
  playerName: ['multiplayer.playerName', 'Player Name'],
  creative: ['itemGroup.buildingBlocks', 'Building Blocks'],
  destroying: ['inventory.binSlot', 'Destroy Item'],
  advancements: ['gui.advancements', 'Advancements'],
  statistics: ['gui.stats', 'Statistics'],
  connecting: ['connect.connecting', 'Connecting...'],
  connectingFailed: ['connect.failed', 'Connection Lost'],
  clickToPlay: ['menu.clickToPlay', 'Click to play'],
};

const strings = {};
const fromLang = [];
for (const [key, [langKey, fallback]] of Object.entries(STRING_KEYS)) {
  const value = lang.get(langKey);
  strings[key] = value || fallback;
  if (value) fromLang.push(key);
}
writeFileSync(join(OUT, 'strings.json'), JSON.stringify(strings, null, 2));
written.push(`strings.json (${fromLang.length}/${Object.keys(strings).length} from en_us.lang)`);

const splashes = readText('texts/splashes.txt')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
writeFileSync(join(OUT, 'splashes.json'), JSON.stringify(splashes));
written.push(`splashes.json (${splashes.length} splashes from splashes.txt)`);

// ── item registry ──────────────────────────────────────────────────────────

// Names come out of the pack's own en_us.lang: first by matching the texture
// name against a lang key (`item.swordDiamond` / `item.dyePowder.black`), then
// against the translated value (`Diamond Sword`), and only then by prettifying
// the file name.
const normalizeKey = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
const langByKey = new Map();
const langByValue = new Map();
for (const [key, value] of lang) {
  langByKey.set(normalizeKey(key.replace(/^(item|tile)\./, '')), value);
  langByValue.set(normalizeKey(value), value);
}

const prettify = (stem) => stem.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// 1.12.2 stacks everything to 64 unless it is a tool, armour or a one-per-slot
// oddity.
const SINGLE_STACK =
  /(_pickaxe|_axe|_shovel|_sword|_hoe|^shears$|^bucket$|_helmet$|_chestplate$|_leggings$|_boots$|^bow$|^fishing_rod$|^flint_and_steel$|_door$|^minecart$|^boat$|^potion|^cake$|banner$)/;

// Names en_us.lang cannot supply by key or value, because 1.12.2 names the
// item differently from its file (a book is book_normal.png, blue dye is
// "Lapis Lazuli").
const NAME_OVERRIDES = {
  book_normal: 'Book',
  book_writable: 'Book and Quill',
  book_enchanted: 'Enchanted Book',
  minecart_normal: 'Minecart',
  seeds_wheat: 'Wheat Seeds',
  seeds_melon: 'Melon Seeds',
  seeds_pumpkin: 'Pumpkin Seeds',
  dye_powder_blue: 'Lapis Lazuli',
  dye_powder_black: 'Ink Sac',
  dye_powder_white: 'Bone Meal',
  dye_powder_brown: 'Cocoa Beans',
  dye_powder_red: 'Rose Red',
};

/** 1.12.2's own wording for the tool materials, and "<colour> Dye" for the rest. */
function polishName(name, stem) {
  if (NAME_OVERRIDES[stem]) return NAME_OVERRIDES[stem];
  return name
    .replace(/^Wood /, 'Wooden ')
    .replace(/^Gold /, 'Golden ')
    .replace(/^Dye Powder (\w+)$/, (_, colour) => `${colour[0].toUpperCase()}${colour.slice(1)} Dye`);
}

let namedFromLang = 0;
const registryItems = itemKeys.map((stem) => {
  const norm = normalizeKey(stem);
  const fromLang = langByKey.get(norm) ?? langByValue.get(norm);
  if (fromLang) namedFromLang++;
  return {
    key: stem,
    name: polishName(fromLang || prettify(stem), stem),
    stack: SINGLE_STACK.test(stem) ? 1 : 64,
  };
});
writeFileSync(join(OUT, 'registry.json'), JSON.stringify({ items: registryItems }));
written.push(
  `registry.json (${registryItems.length} items, ${namedFromLang} named from en_us.lang)`
);

// ── report ─────────────────────────────────────────────────────────────────

console.log(`atlas ${atlasW}x${atlasH}: ${keys.length} block + ${itemKeys.length} item tiles of ${TILE}px`);
console.log(`  taken from a pack: ${fromPack.length}`);
if (undecodable.length) console.log(`  undecodable: ${undecodable.join(', ')}`);
if (generated.length) console.log(`  procedurally filled: ${generated.join(', ')}`);
if (tinted.length) console.log(`  runtime-tinted: ${tinted.join(', ')}`);
console.log('gui:');
for (const line of written) console.log(`  ${line}`);
