// First-person player: AABB physics against the voxel world, walking, jumping,
// creative-style flight, and a voxel raycast for breaking and placing blocks.

import { isSolid } from './blocks.js';
import { WORLD_HEIGHT } from './world.js';

const GRAVITY = 26;
const JUMP_SPEED = 8.2;
const WALK_SPEED = 4.6;
const SPRINT_SPEED = 6.6;
const FLY_SPEED = 14;
const EPSILON = 1e-4;

export class Player {
  constructor(world) {
    this.world = world;
    this.x = 0.5;
    this.y = 80;
    this.z = 0.5;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.flying = false;
    this.width = 0.6;
    this.height = 1.8;
    this.eyeHeight = 1.62;
    this.inWater = false;
    // Spectator mode walks through blocks; 1.12.2 calls this noClip.
    this.noClip = false;
    // Fall tracking: where the current fall started, and how far the last one was.
    this.fallStartY = null;
    this.fallDistance = 0;
    this.justLanded = false;
    this.jumped = false;
  }

  spawnAt(x, z) {
    this.x = x + 0.5;
    this.z = z + 0.5;
    this.y = this.world.surfaceAt(Math.floor(this.x), Math.floor(this.z)) + 0.05;
    this.vx = this.vy = this.vz = 0;
    this.onGround = false;
    this.fallStartY = null;
    this.fallDistance = 0;
    this.justLanded = false;
    this.jumped = false;
  }

  eyeY() {
    return this.y + this.eyeHeight;
  }

  lookDirection() {
    const cosPitch = Math.cos(this.pitch);
    return [-Math.sin(this.yaw) * cosPitch, Math.sin(this.pitch), -Math.cos(this.yaw) * cosPitch];
  }

  _collides(x, y, z) {
    if (this.noClip) return false;
    const half = this.width / 2;
    const minX = Math.floor(x - half + EPSILON);
    const maxX = Math.floor(x + half - EPSILON);
    const minY = Math.floor(y + EPSILON);
    const maxY = Math.floor(y + this.height - EPSILON);
    const minZ = Math.floor(z - half + EPSILON);
    const maxZ = Math.floor(z + half - EPSILON);

    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let bx = minX; bx <= maxX; bx++) {
          if (by < 0) return true;
          if (by >= WORLD_HEIGHT) continue;
          if (isSolid(this.world.getBlock(bx, by, bz))) return true;
        }
      }
    }
    return false;
  }

  _moveAxis(axis, amount) {
    if (!amount) return;
    const next = { x: this.x, y: this.y, z: this.z };
    next[axis] += amount;

    if (!this._collides(next.x, next.y, next.z)) {
      this[axis] = next[axis];
      return;
    }

    // Slide as far as possible towards the wall.
    let low = 0;
    let high = amount;
    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      const probe = { x: this.x, y: this.y, z: this.z };
      probe[axis] += mid;
      if (this._collides(probe.x, probe.y, probe.z)) high = mid;
      else low = mid;
    }
    this[axis] += low;

    if (axis === 'y') {
      if (amount < 0) this.onGround = true;
      this.vy = 0;
    } else if (axis === 'x') {
      this.vx = 0;
    } else {
      this.vz = 0;
    }
  }

  update(dt, input) {
    // Cleared every frame so a single jump is counted once by survival.
    this.jumped = false;
    const feet = this.world.getBlock(Math.floor(this.x), Math.floor(this.y + 0.2), Math.floor(this.z));
    this.inWater = feet === 8 || feet === 9;

    const forward = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);

    let tx = -sin * forward + cos * strafe;
    let tz = -cos * forward - sin * strafe;
    const len = Math.hypot(tx, tz);
    if (len > 0) {
      tx /= len;
      tz /= len;
    }

    const speed = this.flying ? FLY_SPEED : input.sprint ? SPRINT_SPEED : WALK_SPEED;
    const targetVX = tx * speed;
    const targetVZ = tz * speed;
    const accel = Math.min(1, dt * (this.flying ? 10 : 16));
    this.vx += (targetVX - this.vx) * accel;
    this.vz += (targetVZ - this.vz) * accel;

    this.onGround = false;

    if (this.flying) {
      // Space up, shift down, as 1.12.2 flies; that frees E for the inventory.
      const vertical = (input.jump ? 1 : 0) - (input.sprint ? 1 : 0);
      this.vy = vertical * FLY_SPEED;
    } else if (this.inWater) {
      this.vy = Math.max(this.vy - GRAVITY * 0.25 * dt, -3.2);
      if (input.jump) this.vy = Math.min(this.vy + 22 * dt, 3.2);
    } else {
      this.vy -= GRAVITY * dt;
      if (this.vy < -60) this.vy = -60;
      if (input.jump && this.onGroundPrev) {
        this.vy = JUMP_SPEED;
        this.jumped = true;
      }
    }

    this._moveAxis('x', this.vx * dt);
    this._moveAxis('z', this.vz * dt);
    this._moveAxis('y', this.vy * dt);

    // A fall is measured from the highest point you were airborne at, which is
    // what 1.12.2 uses to decide fall damage on landing.
    if (this.onGround && !this.onGroundPrev && this.fallStartY !== null) {
      this.fallDistance = Math.max(0, this.fallStartY - this.y);
      this.justLanded = true;
      this.fallStartY = null;
    }
    if (this.flying || this.inWater) {
      this.fallStartY = null;
    } else if (!this.onGround) {
      this.fallStartY = this.fallStartY === null ? this.y : Math.max(this.fallStartY, this.y);
    }

    this.onGroundPrev = this.onGround;

    if (this.y < -8) {
      this.spawnAt(Math.floor(this.x), Math.floor(this.z));
    }
  }

  /**
   * Where the view ray enters a block's box, as fractions of the block (0..1).
   * Servers use this to orient placed blocks, so it has to be the real entry
   * point rather than the block centre.
   */
  entryPoint(bx, by, bz, dir) {
    const eye = [this.x, this.eyeY(), this.z];
    const low = [bx, by, bz];
    let t = -Infinity;
    for (let axis = 0; axis < 3; axis++) {
      if (Math.abs(dir[axis]) < 1e-6) continue;
      const a = (low[axis] - eye[axis]) / dir[axis];
      const b = (low[axis] + 1 - eye[axis]) / dir[axis];
      t = Math.max(t, Math.min(a, b));
    }
    if (!Number.isFinite(t)) t = 0;
    return [
      Math.min(1, Math.max(0, eye[0] + dir[0] * t - bx)),
      Math.min(1, Math.max(0, eye[1] + dir[1] * t - by)),
      Math.min(1, Math.max(0, eye[2] + dir[2] * t - bz)),
    ];
  }

  /** First solid block along the view ray, with the face that was hit. */
  raycast(maxDistance = 6) {
    const [dx, dy, dz] = this.lookDirection();
    let x = Math.floor(this.x);
    let y = Math.floor(this.eyeY());
    let z = Math.floor(this.z);

    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const stepZ = Math.sign(dz);

    const tDeltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
    const tDeltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
    const tDeltaZ = dz === 0 ? Infinity : Math.abs(1 / dz);

    let tMaxX = dx === 0 ? Infinity : (stepX > 0 ? x + 1 - this.x : this.x - x) / Math.abs(dx);
    let tMaxY = dy === 0 ? Infinity : (stepY > 0 ? y + 1 - this.eyeY() : this.eyeY() - y) / Math.abs(dy);
    let tMaxZ = dz === 0 ? Infinity : (stepZ > 0 ? z + 1 - this.z : this.z - z) / Math.abs(dz);

    let face = [0, 0, 0];

    for (let i = 0; i < 256; i++) {
      const id = this.world.getBlock(x, y, z);
      if (id && id !== 8 && id !== 9 && id !== 78) {
        return { x, y, z, id, face, point: this.entryPoint(x, y, z, [dx, dy, dz]) };
      }

      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        if (tMaxX > maxDistance) break;
        x += stepX;
        tMaxX += tDeltaX;
        face = [-stepX, 0, 0];
      } else if (tMaxY < tMaxZ) {
        if (tMaxY > maxDistance) break;
        y += stepY;
        tMaxY += tDeltaY;
        face = [0, -stepY, 0];
      } else {
        if (tMaxZ > maxDistance) break;
        z += stepZ;
        tMaxZ += tDeltaZ;
        face = [0, 0, -stepZ];
      }
    }

    return null;
  }

  intersectsBlock(bx, by, bz) {
    const half = this.width / 2;
    return (
      bx + 1 > this.x - half &&
      bx < this.x + half &&
      by + 1 > this.y &&
      by < this.y + this.height &&
      bz + 1 > this.z - half &&
      bz < this.z + half
    );
  }
}
