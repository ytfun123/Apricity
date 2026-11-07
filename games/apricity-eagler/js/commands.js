// Singleplayer chat commands, handled locally: the slice of 1.12.2's command set
// that still means something without a second player. Typed behind T exactly
// like the real client.
//
// runCommand() is pure apart from the world, player, hotbar and vitals it is
// handed, so the whole set is testable in Node without a browser.

import { BLOCKS, blockIdByLooseName, blockKey, blockName } from './blocks.js';
import { itemIdByKey, itemIdByName, itemName, itemStackLimit } from './registry.js';
import { addToHotbar, emptyHotbar } from './inventory.js';
import { GAMEMODES, gameModeFlags, normalizeGamemode } from './gamemode.js';
import { MAX_FOOD, MAX_HEALTH, MAX_SATURATION } from './survival.js';
import { WORLD_HEIGHT } from './world.js';

const MODE_LIST = GAMEMODES.join('|');

const HELP = [
  '/help - this list',
  '/seed - the world seed',
  '/tp <x> <y> <z> - move yourself',
  '/spawn - teleport back to the world spawn',
  '/kill - die and respawn at the spawn',
  '/setblock <x> <y> <z> <block> - place one block',
  '/fill <x1> <y1> <z1> <x2> <y2> <z2> <block> - fill a box',
  '/give <block> [count] - put blocks in the hotbar',
  '/clear - empty the hotbar',
  `/gamemode <${MODE_LIST}> - change game mode`,
  '/heal - refill health and hunger',
  '/feed - refill hunger only',
];

const USAGE = {
  tp: 'Usage: /tp <x> <y> <z>',
  setblock: 'Usage: /setblock <x> <y> <z> <block>',
  fill: 'Usage: /fill <x1> <y1> <z1> <x2> <y2> <z2> <block>',
  give: 'Usage: /give <block> [count]',
  gamemode: `Usage: /gamemode <${MODE_LIST}>`,
};

// A fill larger than this would stall a frame for no good reason.
const FILL_LIMIT = 32768;

const normalize = (text) => text.toLowerCase().replace(/^minecraft:/, '').replace(/\s+/g, '_');

/** Block id from an id or a name like `stone`, `oak_planks` or `diamond_block`. */
/** Item id from a texture key ('wood_pickaxe') or a display name ('Wooden
 *  Pickaxe'). Returns null when the registry has no such item. */
function parseItem(text) {
  if (!text) return null;
  return itemIdByKey(text) || itemIdByName(text) || null;
}

export function parseBlock(text) {
  if (!text) return null;
  const wanted = normalize(String(text));
  const asNumber = Number(wanted);
  if (Number.isInteger(asNumber) && BLOCKS.has(asNumber)) return asNumber;
  for (const [id, def] of BLOCKS) {
    if (normalize(def.name) === wanted) return id;
  }
  // Texture names double as the short names players type: /give diamond_block.
  for (const [id] of BLOCKS) {
    const key = blockKey(id);
    if (key && normalize(key) === wanted) return id;
  }
  // The numbered variants share a name ("Water" is both 8 and 9), so accept a
  // prefix as well: /give water picks the first one.
  for (const [id, def] of BLOCKS) {
    if (normalize(def.name).startsWith(`${wanted}_`) || normalize(def.name) === wanted) return id;
  }
  // Word order and filler words are free: oak_planks, planks_oak and
  // oak_wood_planks all name the same block.
  const loose = blockIdByLooseName(wanted);
  return loose || null;
}

function integers(values) {
  const numbers = values.map(Number);
  return numbers.every((value) => Number.isInteger(value)) ? numbers : null;
}

/**
 * Run one command line (with or without its leading slash).
 * ctx: { world, player, hotbar, selectedSlot, vitals?, gamemode?,
 *        setGamemode?, drops?, refreshHotbar? }
 * Returns { handled, lines, mutated } — the lines are what chat prints.
 */
export function runCommand(input, ctx) {
  const raw = String(input ?? '').replace(/^\/+/, '').trim();
  const out = (lines, mutated = false) => ({ handled: true, lines, mutated });
  if (!raw) return out([]);

  const parts = raw.split(/\s+/);
  const name = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (name) {
    case 'help':
    case '?':
      return out(HELP);

    case 'seed':
      return out([`Seed: ${ctx.world.seed}`]);

    case 'tp':
    case 'teleport': {
      const coords = integers(args.slice(0, 3));
      if (!coords || args.length < 3) return out([USAGE.tp]);
      const [x, y, z] = coords;
      ctx.player.x = x;
      ctx.player.y = y;
      ctx.player.z = z;
      ctx.player.vx = 0;
      ctx.player.vy = 0;
      ctx.player.vz = 0;
      return out([`Teleported to ${x}, ${y}, ${z}`], true);
    }

    case 'spawn': {
      const spawn = ctx.world.findSpawn();
      ctx.player.spawnAt(spawn.x, spawn.z);
      return out([`Teleported to ${spawn.x}, ${spawn.y}, ${spawn.z}`], true);
    }

    case 'kill': {
      // 1.12.2 /kill is a real death: the caller's frame loop respawns us and
      // drops whatever we carried.
      if (ctx.vitals) {
        ctx.vitals.damage(MAX_HEALTH * 50);
        return out(['Killed yourself'], true);
      }
      const spawn = ctx.world.findSpawn();
      ctx.player.spawnAt(spawn.x, spawn.z);
      return out(['Respawned at the world spawn'], true);
    }

    case 'setblock': {
      if (args.length < 4) return out([USAGE.setblock]);
      const coords = integers(args.slice(0, 3));
      const id = parseBlock(args[3]);
      if (!coords || id === null) return out([USAGE.setblock]);
      const [x, y, z] = coords;
      if (y < 0 || y >= WORLD_HEIGHT) return out([`Y must be between 0 and ${WORLD_HEIGHT - 1}`]);
      if (!ctx.world.setBlock(x, y, z, id)) return out([`Nothing loaded at ${x}, ${z}`]);
      return out([`Set the block at ${x}, ${y}, ${z} to ${blockName(id)}`], true);
    }

    case 'fill': {
      if (args.length < 7) return out([USAGE.fill]);
      const coords = integers(args.slice(0, 6));
      const id = parseBlock(args[6]);
      if (!coords || id === null) return out([USAGE.fill]);
      const [x1, y1, z1, x2, y2, z2] = coords;
      const volume = (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1) * (Math.abs(z2 - z1) + 1);
      if (volume > FILL_LIMIT) return out([`Too many blocks (${volume}); the limit is ${FILL_LIMIT}`]);
      if (Math.min(y1, y2) < 0 || Math.max(y1, y2) >= WORLD_HEIGHT) {
        return out([`Y must be between 0 and ${WORLD_HEIGHT - 1}`]);
      }
      let placed = 0;
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
          for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
            if (ctx.world.setBlock(x, y, z, id)) placed++;
          }
        }
      }
      return out([`Filled ${placed} block(s) with ${blockName(id)}`], placed > 0);
    }

    case 'give': {
      // A block by name or id, or any item the pack ships: /give diamond,
      // /give wood_pickaxe, /give apple.
      const id = parseBlock(args[0]) ?? parseItem(args[0]);
      const count = args[1] === undefined ? 1 : Number(args[1]);
      if (id === null || !id || !Number.isInteger(count) || count < 1 || count > 6400) {
        return out([USAGE.give]);
      }
      const leftover = addToHotbar(ctx.hotbar, id, count, itemStackLimit(id));
      ctx.refreshHotbar?.();
      const given = count - leftover;
      if (given === 0) return out(['Your hotbar is full']);
      return out([`Gave ${given} ${itemName(id)}`], true);
    }

    case 'clear': {
      ctx.hotbar.splice(0, ctx.hotbar.length, ...emptyHotbar(ctx.hotbar.length));
      ctx.refreshHotbar?.();
      return out(['Cleared the hotbar'], true);
    }

    case 'gamemode':
    case 'gm': {
      const mode = normalizeGamemode(args[0]);
      if (!mode) return out([USAGE.gamemode]);
      const flags = gameModeFlags(mode);
      if (ctx.setGamemode) ctx.setGamemode(mode);
      else {
        ctx.player.flying = flags.canFly;
        ctx.player.noClip = flags.noClip;
      }
      ctx.player.vy = 0;
      return out([`Set game mode to ${mode}`], true);
    }

    case 'heal': {
      if (ctx.vitals) {
        ctx.vitals.reset();
        return out(['Healed to full health and hunger'], true);
      }
      const spawn = ctx.world.findSpawn();
      ctx.player.spawnAt(spawn.x, spawn.z);
      return out(['Healed'], true);
    }

    case 'feed': {
      if (!ctx.vitals) return out(['Feeding needs a survival world']);
      ctx.vitals.feed(MAX_FOOD, MAX_SATURATION);
      return out(['Hunger refilled'], true);
    }

    default:
      return out([`Unknown command "${raw}". Try /help`]);
  }
}

/** True when a chat line should be handled locally rather than sent to a server. */
export function isCommand(text) {
  return String(text ?? '').trim().startsWith('/');
}
