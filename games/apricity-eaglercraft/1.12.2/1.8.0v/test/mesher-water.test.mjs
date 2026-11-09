// The mesher has to keep water out of the opaque buffer, because the renderer
// draws it in a separate blended pass. This checks the split, the water surface
// height (1.12.2 sits a source at eight ninths of a block and drops a ninth per
// step of flow) and that ordinary blocks stay in the opaque batch.
//
//   node test/mesher-water.test.mjs

import assert from 'node:assert/strict';
import { buildMesh } from '../js/mesher.js';
import { World, CHUNK_VOLUME, chunkKey } from '../js/world.js';

const passed = [];
const check = (name, fn) => {
  fn();
  passed.push(name);
};

const world = new World({ generate: false });
const chunk = new Uint8Array(CHUNK_VOLUME);
world.setChunk(0, 0, chunk);
chunk[(40 << 8) | (1 << 4) | 1] = 8; // water at 1,40,1
chunk[(40 << 8) | (2 << 4) | 2] = 1; // stone at 2,40,2

const mesh = buildMesh(world, 0, 0);

check('water leaves the opaque batch', () => {
  // Six faces, two triangles, three vertices each, for both blocks.
  assert.equal(mesh.waterVertices, 36, 'water is its own batch');
  assert.equal(mesh.vertices, 36, 'stone stays opaque');
  assert.equal(mesh.positions.length, 36 * 8);
  assert.equal(mesh.waterPositions.length, 36 * 8);
});

check('no water vertex ended up in the opaque geometry', () => {
  for (let i = 1; i < mesh.positions.length; i += 8) {
    const y = mesh.positions[i];
    assert.ok(y === 40 || y === 41, `opaque vertex at y=${y}`);
  }
});

check('a water source sits at eight ninths of the block', () => {
  let highest = -Infinity;
  for (let i = 1; i < mesh.waterPositions.length; i += 8) {
    highest = Math.max(highest, mesh.waterPositions[i]);
  }
  // The mesh is Float32Array, so compare with float precision, not exactly.
  assert.ok(Math.abs(highest - (40 + 8 / 9)) < 1e-3, `water top is ${highest}`);
});

check('flowing water gets shallower the further it runs', () => {
  const topOf = (level) => {
    const w = new World({ generate: false });
    const c = new Uint8Array(CHUNK_VOLUME);
    w.setChunk(0, 0, c);
    c[(40 << 8) | (1 << 4) | 1] = 9; // a flowing cell, no water around it
    w.fluidLevels.set('1,40,1', level);
    const m = buildMesh(w, 0, 0);
    let top = -Infinity;
    for (let i = 1; i < m.waterPositions.length; i += 8) top = Math.max(top, m.waterPositions[i]);
    return top;
  };
  const first = topOf(1);
  const last = topOf(7);
  assert.ok(first < 40 + 8 / 9, 'flow sits below a source');
  assert.ok(last < first, `level 7 (${last}) should be below level 1 (${first})`);
  assert.ok(Math.abs(last - (40 + 1 / 9)) < 1e-3, `the last step is one ninth, got ${last}`);
});

check('water under water draws no lid between them', () => {
  const w = new World({ generate: false });
  const c = new Uint8Array(CHUNK_VOLUME);
  w.setChunk(0, 0, c);
  c[(40 << 8) | (1 << 4) | 1] = 8;
  c[(41 << 8) | (1 << 4) | 1] = 8;
  const m = buildMesh(w, 0, 0);
  // Lower block: four sides and a bottom. Upper block: four sides and a top.
  assert.equal(m.waterVertices, 60);
});

check('an empty chunk produces empty batches', () => {
  const empty = buildMesh(new World({ generate: false }), 5, 5);
  assert.equal(empty.vertices, 0);
  assert.equal(empty.waterVertices, 0);
  assert.equal(empty.positions.length, 0);
});

check('the chunk is still keyed the way the world and renderer expect', () => {
  assert.equal(chunkKey(0, 0), '0,0');
});

console.log(`PASS ${passed.length} checks`);
for (const name of passed) console.log(`  ok  ${name}`);
