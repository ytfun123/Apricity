// 1.12.2's four game modes, reduced to the handful of flags the client needs.
// Creative can fly and never loses an item, survival hurts and drops what it
// breaks, adventure can walk but not build, spectator cannot touch anything.
//
// Pure data, so the command layer and the tests share one definition.

export const GAMEMODES = ['survival', 'creative', 'adventure', 'spectator'];

export const MODE_FLAGS = {
  survival: {
    canFly: false,
    canBreak: true,
    canPlace: true,
    dropsItems: true,
    hurt: true,
    infinite: false,
    noClip: false,
    showsBars: true,
  },
  creative: {
    canFly: true,
    canBreak: true,
    canPlace: true,
    dropsItems: false,
    hurt: false,
    infinite: true,
    noClip: false,
    showsBars: false,
  },
  adventure: {
    canFly: false,
    canBreak: false,
    canPlace: false,
    dropsItems: true,
    hurt: true,
    infinite: false,
    noClip: false,
    showsBars: true,
  },
  spectator: {
    canFly: true,
    canBreak: false,
    canPlace: false,
    dropsItems: false,
    hurt: false,
    infinite: false,
    noClip: true,
    showsBars: false,
  },
};

/** 'survival' | 'creative' | 'adventure' | 'spectator' | null, accepting the
 *  short forms 1.12.2 itself accepts (`/gamemode 1`, `/gamemode c`). */
export function normalizeGamemode(text) {
  const wanted = String(text ?? '').trim().toLowerCase();
  if (!wanted) return null;
  if (wanted === '0' || wanted === 's' || wanted === 'surv') return 'survival';
  if (wanted === '1' || wanted === 'c') return 'creative';
  if (wanted === '2' || wanted === 'a' || wanted === 'adv') return 'adventure';
  if (wanted === '3' || wanted === 'sp' || wanted === 'spec') return 'spectator';
  for (const mode of GAMEMODES) {
    if (mode === wanted) return mode;
    if (mode.startsWith(wanted) || wanted.startsWith(mode)) return mode;
  }
  return null;
}

export function gameModeFlags(mode) {
  return MODE_FLAGS[mode] ?? MODE_FLAGS.survival;
}

export function gamemodeName(mode) {
  const found = normalizeGamemode(mode) ?? 'survival';
  return found[0].toUpperCase() + found.slice(1);
}
