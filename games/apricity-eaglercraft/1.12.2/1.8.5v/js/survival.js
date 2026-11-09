// Health and hunger, following 1.12.2's own numbers: 20 health, 20 food, up to
// 5 saturation, and exhaustion costs of 0.01 per metre walked, 0.1 per metre
// sprinted, 0.05 per jump, 0.3 per hit taken. Four points of exhaustion consume
// one saturation (or one food once saturation is gone).
//
// No DOM and no world access, so the whole system is testable in Node.

export const MAX_HEALTH = 20;
export const MAX_FOOD = 20;
export const MAX_SATURATION = 5;

export const EXHAUSTION = {
  walk: 0.01,
  sprint: 0.1,
  jump: 0.05,
  breakBlock: 0.005,
  damage: 0.3,
  heal: 3,
};

// Falling further than this hurts; the first three blocks of a fall are free.
export const SAFE_FALL = 3;

/** Damage taken from a fall of `distance` blocks, 0 for a safe landing. */
export function fallDamage(distance) {
  if (!(distance > SAFE_FALL)) return 0;
  return Math.floor(distance - SAFE_FALL);
}

export class Vitals {
  constructor() {
    this.reset();
  }

  reset() {
    this.health = MAX_HEALTH;
    this.food = MAX_FOOD;
    this.saturation = MAX_SATURATION;
    this.exhaustion = 0;
    this.regenTimer = 0;
    this.starveTimer = 0;
    this.dead = false;
    this.lastDamage = 0;
  }

  /** Hearts shown on the HUD: 2 health each. */
  get hearts() {
    return Math.ceil(this.health / 2);
  }

  damage(amount) {
    if (this.dead) return 0;
    const dealt = Math.max(0, Math.min(this.health, Number(amount) || 0));
    if (dealt <= 0) return 0;
    this.health -= dealt;
    this.lastDamage = dealt;
    this.exhaustion += EXHAUSTION.damage;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
    return dealt;
  }

  heal(amount) {
    const before = this.health;
    this.health = Math.max(0, Math.min(MAX_HEALTH, this.health + (Number(amount) || 0)));
    return this.health - before;
  }

  feed(food = MAX_FOOD, saturation = MAX_SATURATION) {
    this.food = Math.max(0, Math.min(MAX_FOOD, food));
    this.saturation = Math.max(0, Math.min(MAX_SATURATION, saturation));
  }

  /**
   * One frame of survival. `distance` is how far the player moved this frame.
   * Returns what happened so the caller can play sounds and respawn.
   */
  update(dt, { distance = 0, sprinting = false, jumped = false, flying = false } = {}) {
    const events = { damaged: 0, healed: 0, died: false, exhausted: false };
    if (this.dead) return events;

    // Flying costs no hunger in 1.12.2, and survival has no flight anyway.
    if (!flying) {
      if (distance > 0) this.exhaustion += distance * (sprinting ? EXHAUSTION.sprint : EXHAUSTION.walk);
      if (jumped) this.exhaustion += EXHAUSTION.jump;
    }

    while (this.exhaustion >= 4 && this.food > 0) {
      this.exhaustion -= 4;
      events.exhausted = true;
      if (this.saturation > 0) this.saturation = Math.max(0, this.saturation - 1);
      else this.food = Math.max(0, this.food - 1);
    }
    if (this.exhaustion > 40) this.exhaustion = 40;

    // Natural regeneration: only with a nearly full stomach, one health every
    // four seconds, and it costs food to do it.
    if (this.food >= 18 && this.health < MAX_HEALTH && !this.dead) {
      this.regenTimer += dt;
      if (this.regenTimer >= 4) {
        this.regenTimer = 0;
        if (this.heal(1) > 0) {
          events.healed = 1;
          this.exhaustion += EXHAUSTION.heal;
        }
      }
    } else {
      this.regenTimer = 0;
    }

    // Starvation stops at half a heart, as it does on Normal difficulty.
    if (this.food <= 0 && this.health > 1 && !this.dead) {
      this.starveTimer += dt;
      if (this.starveTimer >= 4) {
        this.starveTimer = 0;
        events.damaged = this.damage(1);
      }
    } else {
      this.starveTimer = 0;
    }

    events.died = this.dead;
    return events;
  }
}
