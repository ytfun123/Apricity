// Copies the 1.12.2 animal textures out of the asset pack this project already
// builds from, and stitches them into one atlas the mob renderer samples:
//
//   assets/mob/pig.png      the copied 64x32 entity texture, untouched pixels
//   assets/mob/cow.png
//   assets/mob/sheep.png
//   assets/mob/sheep_fur.png
//   assets/mob/chicken.png
//   assets/mob/rabbit.png
//   assets/mob-atlas.png    all of them stacked, 64 wide
//   assets/mob-atlas.json   where each one sits in the atlas
//
//   node tools/entity-textures.mjs
//
// Same packs as tools/build-assets.mjs: nothing is downloaded.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { decodePNG, encodePNG } from './png.mjs';
import { readPack, findEmbeddedPack } from './epk.mjs';

const OUT = 'assets';
const PACK_FILES = [
  '../../../mc.html',
  '../../../eagler-1.20-main/javascript/builds/0.2.0/assets.epk',
  '../../../eagler-1.20-main/javascript/builds/0.1.0/assets.epk',
];
const PREFIX = 'assets/minecraft/';

// The animals the game has. Each one is a vanilla entity texture: the first pack
// that ships it wins, and the later names are the 1.12.2 variants to fall back on.
const MOBS = [
  ['pig', ['textures/entity/pig/pig.png']],
  ['cow', ['textures/entity/cow/cow.png']],
  // Both sheep skins: the shaved one carries the face, the fur one is the coat
  // drawn over it.
  ['sheep', ['textures/entity/sheep/sheep.png']],
  ['sheep_fur', ['textures/entity/sheep/sheep_fur.png']],
  ['chicken', ['textures/entity/chicken.png']],
  ['rabbit', ['textures/entity/rabbit/rabbit_brown.png', 'textures/entity/rabbit/brown.png', 'textures/entity/rabbit/white.png']],
  // The player skin, for the first-person arm: 64x64 since 1.8, and the arm is
  // the 4x12x4 box based at (40,16) in it.
  ['steve', ['textures/entity/steve.png', 'textures/entity/alex.png']],
];

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
      if (!raw) continue;
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
  return packs;
}

const packs = loadPacks();
if (!packs.length) throw new Error('no asset packs found');

function asset(key) {
  for (const pack of packs) {
    const data = pack.index.get(key);
    if (data) return { data, pack };
  }
  return null;
}

mkdirSync(join(OUT, 'mob'), { recursive: true });

const found = [];
for (const [name, keys] of MOBS) {
  let image = null;
  let source = null;
  for (const key of keys) {
    const hit = asset(key);
    if (!hit) continue;
    try {
      image = decodePNG(hit.data);
      source = key;
      break;
    } catch (err) {
      console.warn(`${key}: ${err.message}`);
    }
  }
  if (!image) {
    console.warn(`no texture for ${name}`);
    continue;
  }
  writeFileSync(join(OUT, 'mob', `${name}.png`), encodePNG(image));
  found.push({ name, image, source });
  console.log(`${name}.png ${image.width}x${image.height} <- ${source}`);
}
if (!found.length) throw new Error('no animal textures found');

// One texture for the renderer: the animals stacked vertically, 64 wide. Their
// own layouts are untouched, so uv = pixel / atlas size works unchanged.
const tileHeight = Math.max(...found.map((mob) => mob.image.height));
const width = Math.max(...found.map((mob) => mob.image.width));
const height = tileHeight * found.length;
const data = Buffer.alloc(width * height * 4);
const mobs = {};
found.forEach((mob, index) => {
  const at = index * tileHeight;
  mobs[mob.name] = { y: at, width: mob.image.width, height: mob.image.height };
  for (let y = 0; y < mob.image.height; y++) {
    const src = y * mob.image.width * 4;
    const dst = ((at + y) * width) * 4;
    mob.image.data.copy(data, dst, src, src + mob.image.width * 4);
  }
});
writeFileSync(join(OUT, 'mob-atlas.png'), encodePNG({ width, height, data }));
writeFileSync(join(OUT, 'mob-atlas.json'), JSON.stringify({ width, height, tileHeight, mobs }, null, 2));
console.log(`mob-atlas.png ${width}x${height}: ${found.map((m) => m.name).join(', ')}`);
