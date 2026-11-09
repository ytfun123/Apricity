// Reports the average colour and coverage of every atlas tile.
//
// 1.12.2 ships several block textures as greyscale and tints them at runtime
// (leaves and grass use the biome foliage/grass colour, water uses the water
// colour). A tile that is grey and fully opaque here is one of those, and needs
// the same tint baked in or it renders grey in our world.
//
//   node tools/atlas-report.mjs              # every tile
//   node tools/atlas-report.mjs leaves grass # only matching keys

import { readFileSync } from 'node:fs';
import { decodePNG } from './png.mjs';

const atlas = decodePNG(readFileSync('assets/atlas.png'));
const meta = JSON.parse(readFileSync('assets/atlas.json', 'utf8'));
const filters = process.argv.slice(2);

let shown = 0;
for (const [key, [col, row]] of Object.entries(meta.tiles)) {
  if (filters.length && !filters.some((needle) => key.includes(needle))) continue;

  let r = 0;
  let g = 0;
  let b = 0;
  let solid = 0;
  const pixels = 16 * 16;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const i = ((row * 16 + y) * atlas.width + col * 16 + x) * 4;
      if (atlas.data[i + 3] < 128) continue;
      r += atlas.data[i];
      g += atlas.data[i + 1];
      b += atlas.data[i + 2];
      solid++;
    }
  }

  const mean = solid
    ? [r / solid, g / solid, b / solid].map((v) => Math.round(v))
    : [0, 0, 0];
  const grey = solid > 0 && Math.max(...mean) - Math.min(...mean) < 14;
  const hex = mean.map((v) => v.toString(16).padStart(2, '0')).join('');
  console.log(
    `${key.padEnd(22)} rgb #${hex}  ${String(Math.round((solid / pixels) * 100)).padStart(3)}% solid` +
      `${grey ? '  (greyscale)' : ''}${solid === 0 ? '  (fully transparent)' : ''}`
  );
  shown++;
}

if (!shown) console.log('no tiles matched');
