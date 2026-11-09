// Turns a chunk into textured triangles. Each visible face samples its own tile
// out of assets/atlas.png and carries a per-face shade so blocks read as 3D even
// without lighting.

import { blockColor, getAtlas, isTransparent, tileFor } from './blocks.js';
import { CHUNK_SIZE } from './world.js';

// normal, which atlas slot the face uses, shade, four corners, and the texture
// coordinate of each corner (0,0 is the top-left of the tile in the atlas image).
const FACES = [
  {
    n: [0, 1, 0], slot: 'top', shade: 1.0,
    corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
    uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
  },
  {
    n: [0, -1, 0], slot: 'bottom', shade: 0.5,
    corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
    uv: [[0, 1], [0, 0], [1, 0], [1, 1]],
  },
  {
    n: [1, 0, 0], slot: 'side', shade: 0.8,
    corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    uv: [[1, 1], [0, 1], [0, 0], [1, 0]],
  },
  {
    n: [-1, 0, 0], slot: 'side', shade: 0.8,
    corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    uv: [[0, 1], [1, 1], [1, 0], [0, 0]],
  },
  {
    n: [0, 0, 1], slot: 'side', shade: 0.65,
    corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    uv: [[0, 1], [1, 1], [1, 0], [0, 0]],
  },
  {
    n: [0, 0, -1], slot: 'side', shade: 0.65,
    corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
    uv: [[1, 1], [0, 1], [0, 0], [1, 0]],
  },
];

const WATER_IDS = new Set([8, 9]);
const LAVA_IDS = new Set([10, 11]);
const isWaterId = (id) => WATER_IDS.has(id);
const isFluid = (id) => WATER_IDS.has(id) || LAVA_IDS.has(id);
const sameFluid = (a, b) =>
  (WATER_IDS.has(a) && WATER_IDS.has(b)) || (LAVA_IDS.has(a) && LAVA_IDS.has(b));

// The top face's corner order: (0,0), (0,1), (1,1), (1,0) in block-local x,z.
const TOP_CORNERS = [[0, 0], [0, 1], [1, 1], [1, 0]];
// Which two corner heights the top edge of each side face runs between.
const SIDE_TOP = {
  2: [3, 2], // +x
  3: [1, 0], // -x
  4: [2, 1], // +z
  5: [0, 3], // -z
};

/**
 * How tall a fluid cell is drawn. 1.12.2 keeps a source at eight ninths of a
 * block and drops one ninth per step away from it, so a stream visibly gets
 * shallower as it runs. A cell with the same fluid above it is part of a
 * falling column and is drawn full height.
 */
function fluidSurface(world, x, y, z) {
  const id = world.probeBlock(x, y, z);
  if (!isFluid(id)) return null;
  if (sameFluid(world.probeBlock(x, y + 1, z), id)) return 1;
  const level = world.probeFluidLevel ? world.probeFluidLevel(x, y, z) : 1;
  return Math.max(1 / 9, (8 - level) / 9);
}

/** Corner height, averaged over the fluid cells that share that corner. */
function fluidCorner(world, x, y, z, cx, cz, base) {
  const dx = cx === 0 ? -1 : 1;
  const dz = cz === 0 ? -1 : 1;
  let sum = base;
  let count = 1;
  for (const [ox, oz] of [[dx, 0], [0, dz], [dx, dz]]) {
    const h = fluidSurface(world, x + ox, y, z + oz);
    if (h === null) continue;
    sum += h;
    count++;
  }
  return sum / count;
}

export function buildMesh(world, cx, cz) {
  const atlas = getAtlas();
  const ts = atlas ? atlas.tileSize : 16;
  const vertices = [];
  // Water is kept apart so the renderer can draw it in a blended pass; the
  // opaque world stays in one buffer.
  const waterVertices = [];

  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;

  for (let y = 0; y < 256; y++) {
    for (let lz = 0; lz < 16; lz++) {
      for (let lx = 0; lx < 16; lx++) {
        const id = world.getBlock(baseX + lx, y, baseZ + lz);
        if (!id) continue;
        const transparent = isTransparent(id);
        const fluid = isFluid(id);
        const isWater = isWaterId(id);
        const target = isWater ? waterVertices : vertices;
        // Water and lava tops slope down one ninth per step from the source,
        // averaged at the corners so the surface reads as a slope, not stairs.
        const heights = fluid
          ? TOP_CORNERS.map(([cx, cz]) =>
              fluidCorner(world, baseX + lx, y, baseZ + lz, cx, cz, fluidSurface(world, baseX + lx, y, baseZ + lz))
            )
          : null;

        for (let f = 0; f < FACES.length; f++) {
          const face = FACES[f];
          const nx = baseX + lx + face.n[0];
          const ny = y + face.n[1];
          const nz = baseZ + lz + face.n[2];
          if (world.probeIsOpaque(nx, ny, nz)) continue;
          const nid = world.probeBlock(nx, ny, nz);
          // Transparent blocks hide the faces they share with themselves, so a
          // sea is one surface instead of a lattice of internal water planes;
          // a source and a flowing cell are the same liquid, not two blocks.
          if (transparent && (nid === id || (fluid && sameFluid(nid, id)))) continue;

          const tile = tileFor(id, face.slot);
          let tu0 = 0;
          let tv0 = 0;
          let tu1 = 0;
          let tv1 = 0;
          if (atlas && tile) {
            // Half-texel inset keeps NEAREST sampling inside this tile, so no
            // neighbouring texture bleeds onto the block's edges.
            tu0 = (tile[0] * ts + 0.5) / atlas.width;
            tu1 = ((tile[0] + 1) * ts - 0.5) / atlas.width;
            tv0 = (tile[1] * ts + 0.5) / atlas.height;
            tv1 = ((tile[1] + 1) * ts - 0.5) / atlas.height;
          }

          // Textured: shade only. No atlas: shade the fallback block colour.
          const color = atlas && tile
            ? [face.shade, face.shade, face.shade]
            : blockColor(id).map((c) => c * face.shade);

          // Two triangles per face; the renderer draws plain triangles, so a
          // quad needs six vertices (0,1,2 + 0,2,3) or it stitches into its
          // neighbours.
          for (const cornerIndex of [0, 1, 2, 0, 2, 3]) {
            const [ox, oy, oz] = face.corners[cornerIndex];
            const [cu, cv] = face.uv[cornerIndex];
            let vy = y + oy;
            if (fluid && oy === 1) {
              vy = y + heights[f === 0 ? cornerIndex : SIDE_TOP[f][cornerIndex - 2]];
            }
            target.push(
              baseX + lx + ox,
              vy,
              baseZ + lz + oz,
              cu ? tu1 : tu0,
              cv ? tv1 : tv0,
              color[0],
              color[1],
              color[2]
            );
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(vertices),
    vertices: vertices.length / 8,
    waterPositions: new Float32Array(waterVertices),
    waterVertices: waterVertices.length / 8,
  };
}
