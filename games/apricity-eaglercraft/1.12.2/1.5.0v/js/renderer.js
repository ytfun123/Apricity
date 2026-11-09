// WebGL renderer: one textured shader, one buffer per chunk, a sky clear and a
// wireframe box around whatever block you are looking at.
//
// Vertex layout (8 floats): x, y, z, u, v, r, g, b — 32 bytes per vertex.

const STRIDE = 32;

function multiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function rotateX(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

function rotateY(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

function translate(x, y, z) {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

const VS = `
attribute vec3 aPos;
attribute vec2 aUV;
attribute vec3 aColor;
uniform mat4 uViewProj;
varying vec2 vUV;
varying vec3 vColor;
void main() {
  vUV = aUV;
  vColor = aColor;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}
`;

const FS = `
precision mediump float;
uniform sampler2D uTex;
uniform float uTextured;
uniform float uAlpha;
varying vec2 vUV;
varying vec3 vColor;
void main() {
  if (uTextured > 0.5) {
    vec4 texel = texture2D(uTex, vUV);
    if (texel.a < 0.1) discard;
    gl_FragColor = vec4(texel.rgb * vColor, uAlpha);
  } else {
    gl_FragColor = vec4(vColor, 1.0);
  }
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader error: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

/**
 * A dropped item: a small cube spinning around its own Y axis, written into the
 * vertex array with the untextured colour path. 1.12.2 draws item entities as a
 * flat bobbing sprite; a tinted cube reads correctly at this size and needs no
 * extra texture upload.
 */
function pushCube(out, offset, cube) {
  const h = (cube.size ?? 0.25) / 2;
  const cos = Math.cos(cube.spin ?? 0);
  const sin = Math.sin(cube.spin ?? 0);
  const [r, g, b] = cube.color ?? [0.6, 0.6, 0.6];

  const vertex = (sx, sy, sz) => {
    const x = sx * h;
    const z = sz * h;
    return [cube.x + x * cos - z * sin, cube.y + sy * h, cube.z + x * sin + z * cos];
  };

  const faces = [
    { quad: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]], shade: 1 },
    { quad: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]], shade: 0.5 },
    { quad: [[-1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, 1]], shade: 0.8 },
    { quad: [[1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, -1]], shade: 0.8 },
    { quad: [[1, -1, 1], [1, 1, 1], [1, 1, -1], [1, -1, -1]], shade: 0.65 },
    { quad: [[-1, -1, -1], [-1, 1, -1], [-1, 1, 1], [-1, -1, 1]], shade: 0.65 },
  ];

  for (const face of faces) {
    const [a, b2, c, d] = face.quad;
    for (const corner of [a, b2, c, a, c, d]) {
      const [x, y, z] = vertex(corner[0], corner[1], corner[2]);
      out[offset++] = x;
      out[offset++] = y;
      out[offset++] = z;
      out[offset++] = 0;
      out[offset++] = 0;
      out[offset++] = r * face.shade;
      out[offset++] = g * face.shade;
      out[offset++] = b * face.shade;
    }
  }
  return offset;
}

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL is not available in this browser');
    this.gl = gl;
    this.canvas = canvas;

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;
    this.aPos = gl.getAttribLocation(program, 'aPos');
    this.aUV = gl.getAttribLocation(program, 'aUV');
    this.aColor = gl.getAttribLocation(program, 'aColor');
    this.uViewProj = gl.getUniformLocation(program, 'uViewProj');
    this.uTex = gl.getUniformLocation(program, 'uTex');
    this.uTextured = gl.getUniformLocation(program, 'uTextured');
    this.uAlpha = gl.getUniformLocation(program, 'uAlpha');

    this.buffers = new Map();
    this.lineBuffer = gl.createBuffer();
    this.cubeBuffer = gl.createBuffer();
    this.texture = null;

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0.55, 0.72, 0.95, 1);
  }

  /** Upload the block atlas. Nearest filtering keeps the pixel-art crisp. */
  setAtlasTexture(image) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.texture = texture;
  }

  setSize(width, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(width * dpr));
    const h = Math.max(1, Math.floor(height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  setSky(daylight) {
    const t = Math.max(0, Math.min(1, daylight));
    this.gl.clearColor(0.06 + 0.49 * t, 0.08 + 0.64 * t, 0.14 + 0.81 * t, 1);
  }

  upload(key, mesh) {
    const gl = this.gl;
    let entry = this.buffers.get(key);
    if (!entry) {
      entry = { buffer: gl.createBuffer(), count: 0, waterBuffer: gl.createBuffer(), waterCount: 0 };
      this.buffers.set(key, entry);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    entry.count = mesh.vertices;

    gl.bindBuffer(gl.ARRAY_BUFFER, entry.waterBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.waterPositions ?? new Float32Array(0), gl.STATIC_DRAW);
    entry.waterCount = mesh.waterVertices ?? 0;
  }

  remove(key) {
    const entry = this.buffers.get(key);
    if (!entry) return;
    this.gl.deleteBuffer(entry.buffer);
    if (entry.waterBuffer) this.gl.deleteBuffer(entry.waterBuffer);
    this.buffers.delete(key);
  }

  get chunkCount() {
    return this.buffers.size;
  }

  get triangleCount() {
    let total = 0;
    for (const entry of this.buffers.values()) total += (entry.count + (entry.waterCount ?? 0)) / 3;
    return total;
  }

  /** Rebuild the drop geometry for this frame and draw it in one call. */
  drawCubes(cubes) {
    if (!cubes || !cubes.length) return;
    const gl = this.gl;
    const data = new Float32Array(cubes.length * 36 * 8);
    let offset = 0;
    for (const cube of cubes) offset = pushCube(data, offset, cube);
    if (!offset) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, offset), gl.DYNAMIC_DRAW);
    gl.uniform1f(this.uTextured, 0);
    gl.uniform1f(this.uAlpha, 1);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, STRIDE, 12);
    gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, STRIDE, 20);
    gl.drawArrays(gl.TRIANGLES, 0, offset / 8);
    gl.uniform1f(this.uTextured, this.texture ? 1 : 0);
  }

  /**
   * Item drops with no block form: one camera-facing quad each, textured with
   * the item's own icon out of the atlas. The quad is turned to the viewer on
   * the XZ plane, which is all a spinning item drop needs.
   */
  drawSprites(sprites, camera) {
    if (!sprites || !sprites.length || !this.texture) return;
    const gl = this.gl;
    const data = new Float32Array(sprites.length * 6 * 8);
    let offset = 0;
    for (const sprite of sprites) {
      // Screen-right on the ground plane, from the camera to the sprite.
      const dx = sprite.x - camera.x;
      const dz = sprite.z - camera.z;
      const length = Math.hypot(dx, dz) || 1;
      const rx = (-dz / length) * sprite.size;
      const rz = (dx / length) * sprite.size;
      const [u0, v0, u1, v1] = sprite.uv;
      const y0 = sprite.y - sprite.size;
      const y1 = sprite.y + sprite.size;
      const corners = [
        [sprite.x - rx, y0, sprite.z - rz, u0, v1],
        [sprite.x + rx, y0, sprite.z + rz, u1, v1],
        [sprite.x + rx, y1, sprite.z + rz, u1, v0],
        [sprite.x - rx, y0, sprite.z - rz, u0, v1],
        [sprite.x + rx, y1, sprite.z + rz, u1, v0],
        [sprite.x - rx, y1, sprite.z - rz, u0, v0],
      ];
      for (const [x, y, z, u, v] of corners) {
        data[offset++] = x;
        data[offset++] = y;
        data[offset++] = z;
        data[offset++] = u;
        data[offset++] = v;
        data[offset++] = 1;
        data[offset++] = 1;
        data[offset++] = 1;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, offset), gl.DYNAMIC_DRAW);
    gl.uniform1f(this.uTextured, 1);
    gl.uniform1f(this.uAlpha, 1);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, STRIDE, 12);
    gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, STRIDE, 20);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, offset / 8);
    gl.disable(gl.BLEND);
  }

  render(camera, aspect, selection, cubes = [], sprites = []) {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    const proj = perspective((camera.fov * Math.PI) / 180, aspect, 0.08, 400);
    const view = multiply(
      rotateX(-camera.pitch),
      multiply(rotateY(-camera.yaw), translate(-camera.x, -camera.y, -camera.z))
    );
    gl.uniformMatrix4fv(this.uViewProj, false, multiply(proj, view));

    gl.enableVertexAttribArray(this.aPos);
    gl.enableVertexAttribArray(this.aUV);
    gl.enableVertexAttribArray(this.aColor);
    gl.uniform1f(this.uAlpha, 1);

    if (this.texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(this.uTex, 0);
      gl.uniform1f(this.uTextured, 1);
    } else {
      gl.uniform1f(this.uTextured, 0);
    }

    for (const entry of this.buffers.values()) {
      if (entry.count === 0) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
      gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, STRIDE, 0);
      gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, STRIDE, 12);
      gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, STRIDE, 20);
      gl.drawArrays(gl.TRIANGLES, 0, entry.count);
    }

    this.drawCubes(cubes);
    this.drawSprites(sprites, camera);

    // Water: drawn after the opaque world, blended and with depth writes off, so
    // an ocean reads as water instead of a solid blue surface.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.uniform1f(this.uAlpha, 0.62);
    for (const entry of this.buffers.values()) {
      if (!entry.waterCount) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, entry.waterBuffer);
      gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, STRIDE, 0);
      gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, STRIDE, 12);
      gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, STRIDE, 20);
      gl.drawArrays(gl.TRIANGLES, 0, entry.waterCount);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.uniform1f(this.uAlpha, 1);

    if (selection) this._drawSelection(selection);
  }

  _drawSelection(block) {
    const gl = this.gl;
    const { x, y, z } = block;
    const e = 0.002;
    const p = [
      [x - e, y - e, z - e], [x + 1 + e, y - e, z - e], [x + 1 + e, y - e, z + 1 + e], [x - e, y - e, z + 1 + e],
      [x - e, y + 1 + e, z - e], [x + 1 + e, y + 1 + e, z - e], [x + 1 + e, y + 1 + e, z + 1 + e], [x - e, y + 1 + e, z + 1 + e],
    ];
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    const data = [];
    for (const [a, b] of edges) {
      data.push(...p[a], ...p[b]);
    }

    gl.uniform1f(this.uTextured, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
    gl.disableVertexAttribArray(this.aUV);
    gl.vertexAttrib2f(this.aUV, 0, 0);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.disableVertexAttribArray(this.aColor);
    gl.vertexAttrib3f(this.aColor, 0, 0, 0);
    gl.drawArrays(gl.LINES, 0, data.length / 3);
    gl.enableVertexAttribArray(this.aColor);
    gl.enableVertexAttribArray(this.aUV);
  }
}
