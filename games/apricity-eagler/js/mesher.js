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

        const isWater = id === 8 || id === 9;
        // Lava is a full block; only water sits slightly below the block top.
        const heightScale = isWater ? 0.9 : 1;
        const target = isWater ? waterVertices : vertices;

        for (const face of FACES) {
          const nx = baseX + lx + face.n[0];
          const ny = y + face.n[1];
          const nz = baseZ + lz + face.n[2];
          if (world.probeIsOpaque(nx, ny, nz)) continue;
          // Transparent blocks hide the faces they share with themselves, so a
          // sea is one surface instead of a lattice of internal water planes.
          if (transparent && world.probeBlock(nx, ny, nz) === id) continue;

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
            target.push(
              baseX + lx + ox,
              y + oy * heightScale,
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
