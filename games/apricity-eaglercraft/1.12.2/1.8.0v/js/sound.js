// Block sounds, taken from the pack's own sounds/dig folder by
// tools/build-assets.mjs. 1.12.2 plays the same four samples for breaking and
// placing, picked at random and grouped by the block's material, so that is
// exactly what this does.
//
// Audio is a nicety, never a requirement: a browser that has not been allowed
// to play audio yet, or a missing file, only costs the sound.

const GROUPS = ['stone', 'wood', 'grass', 'sand', 'gravel', 'cloth', 'snow'];
const VARIANTS = 4;

// 1.12.2's own material → sound group assignment, for the blocks we have.
const GROUP_OF = new Map();
const assign = (group, ids) => {
  for (const id of ids) GROUP_OF.set(id, group);
};

assign('wood', [5, 17, 25, 47, 54, 58, 162, 163]);
assign('grass', [2, 3, 18, 46, 60, 110, 161]);
assign('sand', [12, 88, 111]);
assign('gravel', [13]);
assign('cloth', [6, 35, 50, 59, 65, 81, 83, 106]);
assign('snow', [78, 80]);
// Everything else — stone, ores, bricks, glass, ice, metal blocks, nether and
// end blocks — uses the stone group, which is also 1.12.2's default.

let enabled = true;
let volume = 0.5;
const elementCache = new Map();

export function setSoundEnabled(on) {
  enabled = Boolean(on);
}

export function soundGroup(id) {
  return GROUP_OF.get(id) ?? 'stone';
}

export function playBlockSound(id) {
  if (!enabled || typeof Audio === 'undefined') return;
  const group = GROUPS.includes(soundGroup(id)) ? soundGroup(id) : 'stone';
  const variant = 1 + Math.floor(Math.random() * VARIANTS);
  const url = `./assets/sounds/${group}${variant}.ogg`;

  // Reuse the decoded elements: a break/place burst is otherwise a new decode
  // per click, which stutters on the first few blocks.
  let pool = elementCache.get(url);
  if (!pool) {
    pool = [];
    elementCache.set(url, pool);
  }
  let audio = pool.find((element) => element.paused || element.ended);
  if (!audio) {
    if (pool.length >= 4) {
      audio = pool[Math.floor(Math.random() * pool.length)];
    } else {
      audio = new Audio(url);
      audio.preload = 'auto';
      pool.push(audio);
    }
  }

  try {
    audio.volume = volume;
    // 1.12.2 randomises pitch slightly per block, which is why a wall of the
    // same block does not sound like one sample on repeat.
    audio.playbackRate = 0.92 + Math.random() * 0.16;
    audio.currentTime = 0;
    const started = audio.play();
    if (started && typeof started.catch === 'function') started.catch(() => {});
  } catch {
    /* autoplay policy or a missing file: silence is fine */
  }
}

export function playClick() {
  if (!enabled || typeof Audio === 'undefined') return;
  try {
    const audio = new Audio('./assets/sounds/click.ogg');
    audio.volume = volume * 0.6;
    const started = audio.play();
    if (started && typeof started.catch === 'function') started.catch(() => {});
  } catch {
    /* ignore */
  }
}

/** The little pop 1.12.2 plays when an item is picked up. */
export function playPickup() {
  oneShot('pop.ogg', 0.45);
}

/** The grunt on taking damage. */
export function playHurt() {
  oneShot('hurt.ogg', 0.7);
}

// These two exist only when this pack ships random/pop and random/hurt; a
// missing file is silence, never an error.
function oneShot(file, level) {
  if (!enabled || typeof Audio === 'undefined') return;
  try {
    const audio = new Audio(`./assets/sounds/${file}`);
    audio.volume = volume * level;
    audio.playbackRate = file === 'pop.ogg' ? 1 + Math.random() * 0.15 : 1;
    const started = audio.play();
    if (started && typeof started.catch === 'function') started.catch(() => {});
  } catch {
    /* ignore */
  }
}
