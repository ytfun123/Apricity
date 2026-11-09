// App bootstrap: screens, world management, input, the render loop, and the
// multiplayer session.

import { Renderer } from './renderer.js';
import { World, chunkKey } from './world.js';
import { Player } from './player.js';
import { buildMesh } from './mesher.js';
import { UI } from './ui.js';
import { MultiplayerSession, faceIndex } from './multiplayer.js';
import { BLOCKS, HOTBAR, blockDef, blockIdByName, blockName, setAtlas } from './blocks.js';
import {
  allItems,
  isBlockItem,
  isItemId,
  itemIdByKey,
  itemKey,
  itemName,
  itemStackLimit,
  loadItems,
} from './registry.js';
import { canHarvest, dropsFor, harvestNeed, toolInfo } from './drops.js';
import { SMELT_SECONDS, tickFurnace } from './smelting.js';
import { craftOnce, emptyGrid, gridIds, putMany, putOne, takeAt } from './crafting.js';
import { matchRecipe } from './recipes.js';
import { playBlockSound, playClick, playHurt, playPickup } from './sound.js';
import { isCommand, runCommand } from './commands.js';
import { addToHotbar, emptyHotbar, fillHotbarWith, slot, slotIsEmpty, takeFromSlot } from './inventory.js';
import { BlockPhysics } from './physics.js';
import { Mobs } from './mobs.js';
import { eat } from './food.js';
import { Vitals, EXHAUSTION, fallDamage } from './survival.js';
import { Drops } from './items.js';
import { GAMEMODES, gameModeFlags, gamemodeName, normalizeGamemode } from './gamemode.js';

// The blocks the creative palette's hotbar starts with.
const PALETTE = [...HOTBAR];

// Recipes name blocks and items; this turns those names into ids. Items only
// resolve once the generated registry has loaded.
const recipeRef = {
  blockId: (name) => blockIdByName(name),
  itemId: (name) => itemIdByKey(name),
};

// The furnace tables name blocks and items too; this is how they become ids.
const smeltRef = {
  blockName,
  itemKey,
  isItemId,
  resolve: (out) => (out.kind === 'block' ? blockIdByName(out.name) : itemIdByKey(out.name)),
};

const WORLDS_KEY = 'apricity-eagler.worlds';
const SERVERS_KEY = 'apricity-eagler.servers';
const OPTIONS_KEY = 'apricity-eagler.options';
const DEFAULT_OPTIONS = { renderDistance: 4, fov: 75, sensitivity: 100, guiScale: 0 };

const DEFAULT_SERVERS = [
  { id: 'arch', name: 'ArchMC', address: 'mc.arch.lol' },
  { id: 'clever', name: 'Clever Teaching', address: 'wss://clever-teaching.com/' },
];

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);

const state = {
  mode: null,
  world: null,
  worldRecord: null,
  player: null,
  session: null,
  selectedSlot: 0,
  // Survival starts with an empty hotbar; creative fills it from the palette.
  hotbar: emptyHotbar(),
  // The inventory's 27 storage slots: the screen shows them above the hotbar and
  // anything picked up goes here once the hotbar is full.
  backpack: emptyHotbar(27),
  // Lit furnaces, keyed by block position, plus the one on screen.
  furnaces: new Map(),
  furnaceKey: null,
  lastFurnaceUi: 0,
  // The stack on the cursor while the inventory or a crafting table is open.
  cursor: slot(0, 0),
  // Which mouse buttons are down, so holding one keeps mining or placing.
  buttons: { left: false, right: false },
  nextPlaceAt: 0,
  nextMobHit: 0,
  nextEatAt: 0,
  lastSave: 0,
  gamemode: 'survival',
  vitals: new Vitals(),
  drops: null,
  mobs: null,
  teleported: false,
  chunksDone: 0,
  fps: 0,
  lastPositionSent: 0,
  lastChunkScan: 0,
  chatLines: [],
  // Crafting: the inventory's own 2x2 and a crafting table's 3x3, each holding
  // whatever the grid currently makes.
  craft: { grid: emptyGrid(2), result: null },
  table: { grid: emptyGrid(3), result: null },
  mining: null,
  toolHint: { id: 0, at: 0 },
};

const keys = new Set();
const input = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, up: false, down: false };

// ── storage ────────────────────────────────────────────────────────────────

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('could not save', key, err);
  }
}

const loadWorlds = () => readJson(WORLDS_KEY, []);
const saveWorlds = (list) => writeJson(WORLDS_KEY, list);
const loadServers = () => {
  const stored = readJson(SERVERS_KEY, null);
  if (stored) return stored;
  writeJson(SERVERS_KEY, DEFAULT_SERVERS);
  return DEFAULT_SERVERS;
};
const saveServers = (list) => writeJson(SERVERS_KEY, list);
const loadOptions = () => ({ ...DEFAULT_OPTIONS, ...readJson(OPTIONS_KEY, {}) });
const saveOptions = (options) => writeJson(OPTIONS_KEY, options);
const options = loadOptions();

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── mesh queue ─────────────────────────────────────────────────────────────

const meshQueue = [];
const queued = new Set();

function queueMesh(cx, cz, force = false) {
  const key = chunkKey(cx, cz);
  if (!force && renderer.buffers.has(key)) return;
  if (queued.has(key)) return;
  queued.add(key);
  meshQueue.push({ cx, cz, key });
}

function processMeshQueue(budgetMs = 8) {
  if (!state.world) return;
  const start = performance.now();
  while (meshQueue.length && performance.now() - start < budgetMs) {
    const job = meshQueue.shift();
    queued.delete(job.key);
    try {
      if (!state.world.hasChunk(job.cx, job.cz)) {
        // Singleplayer generates on demand (generation stays inside the budget so
        // it never blocks a frame); a server world only gets chunks from the server.
        if (state.mode !== 'single') continue;
        state.world.getChunk(job.cx, job.cz);
      }
      renderer.upload(job.key, buildMesh(state.world, job.cx, job.cz));
      state.chunksDone++;
    } catch (err) {
      console.warn('mesh failed', job.key, err);
    }
  }
}

function clearChunks() {
  for (const key of [...renderer.buffers.keys()]) renderer.remove(key);
  meshQueue.length = 0;
  queued.clear();
}

function scanAroundPlayer(radius) {
  if (!state.player || !state.world) return;
  const pcx = Math.floor(state.player.x / 16);
  const pcz = Math.floor(state.player.z / 16);
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const cx = pcx + dx;
      const cz = pcz + dz;
      // Generation happens in the mesh queue, inside its per-frame budget.
      queueMesh(cx, cz);
    }
  }
}

// ── UI ─────────────────────────────────────────────────────────────────────

const ui = new UI({
  onSingleplayer: () => {
    ui.renderWorlds(loadWorlds());
    ui.showScreen('worlds');
  },
  onMultiplayer: () => {
    ui.renderServers(loadServers());
    ui.showScreen('servers');
  },
  onBackToTitle: () => ui.showScreen('title'),
  onCreateWorld: (name, seed) => {
    const worlds = loadWorlds();
    const record = {
      id: newId(),
      name: name.trim() || `World ${worlds.length + 1}`,
      seed: seed.trim() ? hashSeed(seed.trim()) : Math.floor(Math.random() * 1e9),
      edits: [],
      lastPlayed: null,
    };
    worlds.push(record);
    saveWorlds(worlds);
    ui.renderWorlds(worlds);
    playWorld(record);
  },
  onPlayWorld: (record) => playWorld(record),
  onDeleteWorld: (record) => {
    const worlds = loadWorlds().filter((w) => w.id !== record.id);
    saveWorlds(worlds);
    ui.renderWorlds(worlds);
  },
  onAddServer: (name, address) => {
    if (!address.trim()) return;
    const servers = loadServers();
    servers.push({ id: newId(), name: name.trim() || address.trim(), address: address.trim() });
    saveServers(servers);
    ui.renderServers(servers);
  },
  onJoinServer: (server) => joinServer(server),
  onDeleteServer: (server) => {
    const servers = loadServers().filter((s) => s.id !== server.id);
    saveServers(servers);
    ui.renderServers(servers);
  },
  onResume: () => resumeGame(),
  onQuit: () => quitToTitle(),
  onCancelConnect: () => {
    // Also covers the kicked case: drop the session and reset back to the title.
    stopSession();
    quitToTitle();
  },
  onSendChat: (text) => {
    const line = String(text ?? '').trim();
    // In singleplayer a slash line is a local command, as it is in 1.12.2; on a
    // server it belongs to the server and is just forwarded.
    if (isCommand(line) && state.mode === 'single') {
      const result = runCommand(line, {
        world: state.world,
        player: state.player,
        hotbar: state.hotbar,
        backpack: state.backpack,
        selectedSlot: state.selectedSlot,
        vitals: state.vitals,
        gamemode: state.gamemode,
        setGamemode: (mode) => setGamemode(mode),
        refreshHotbar: () => selectSlot(state.selectedSlot),
      });
      ui.appendChat(`> ${line}`);
      for (const message of result.lines) ui.appendChat(message);
      return;
    }
    state.session?.sendChat(text);
  },
  onSelectSlot: (index) => selectSlot(index),
  getWorlds: () => loadWorlds(),
  getServers: () => loadServers(),
  onOpenOptions: () => ui.showScreen('options'),
  onBackFromOptions: () => ui.showScreen(state.mode ? 'pause' : 'title'),
  onOptionsChanged: (next) => {
    Object.assign(options, next);
    saveOptions(options);
    applyOptions();
  },
  onCloseInventory: () => closeContainer(),
  onOutsideClick: () => handleOutsideClick(),
  onInventorySlot: (container, index, detail) => handleInventorySlot(container, index, detail),
  onFurnaceSlot: (name, detail) => handleFurnaceSlot(name, detail),
  onOpenCreative: () => openCreative(),
  onPickBlock: (id) => {
    state.hotbar[state.selectedSlot] = slot(id, Math.min(itemStackLimit(id), 64));
    selectSlot(state.selectedSlot);
    playClick();
    ui.toast(`Picked ${itemName(id)}`);
  },
  onCraftSlot: (index, size, detail) => handleCraftSlot(index, size, detail),
  onCraftResult: (size, detail) => handleCraftResult(size, detail),
  getCreativeIds: (tab, query) => creativeIds(tab, query),
  onQuitGame: () => {
    stopSession();
    document.exitPointerLock?.();
    state.mode = null;
    state.world = null;
    state.player = null;
    state.worldRecord = null;
    clearChunks();
    ui.showQuitNotice();
  },
});

function hashSeed(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}

function selectSlot(index) {
  state.selectedSlot = Math.max(0, Math.min(state.hotbar.length - 1, index));
  ui.setHotbar(state.hotbar, state.selectedSlot);
  // A server tracks what we are holding, which decides what a right click places.
  state.session?.sendHeldItem?.(state.selectedSlot);
}

// ── carrying stacks between slots ───────────────────────────────────────────

/** Throw a stack out in front of the player's feet. */
function dropStack(entry) {
  if (slotIsEmpty(entry) || !state.player) return false;
  const { x, y, z } = state.player;
  // 1.12.2 gives a thrown item two seconds before its thrower can take it back.
  state.drops?.spawn(entry.id, x, y + 1.2, z, { count: entry.count, vy: 1.8, pickupDelay: 2 });
  return true;
}

/** Empty the cursor: back into the hotbar, or onto the ground if it is full. */
function returnCarry() {
  const carried = state.cursor ?? slot(0, 0);
  state.cursor = slot(0, 0);
  ui.setCarry(null);
  if (slotIsEmpty(carried)) return;
  const left = addToHotbar(state.hotbar, carried.id, carried.count, itemStackLimit(carried.id));
  if (left > 0) dropStack({ id: carried.id, count: left });
  selectSlot(state.selectedSlot);
}

/** E or Escape on a container: put down what is carried, then go back to play. */
function closeContainer() {
  returnCarry();
  resumeGame();
}

// Blocks that open a furnace when right-clicked: unlit and lit.
const FURNACE_IDS = new Set([61, 62]);

/**
 * One slot click: pick a stack up, put it down, merge it with a stack of the
 * same thing, or swap the two. `takeOnly` slots (a furnace's output) refuse to
 * accept anything. Returns the stack that ends up on the cursor.
 */
function clickSlot(target, carried, { right = false, takeOnly = false } = {}) {
  if (takeOnly) {
    if (!slotIsEmpty(carried) || slotIsEmpty(target)) return carried;
    const taken = right ? Math.ceil(target.count / 2) : target.count;
    const stack = slot(target.id, taken);
    takeFromSlot(target, taken);
    return stack;
  }

  if (slotIsEmpty(carried)) {
    if (slotIsEmpty(target)) return carried;
    const taken = right ? Math.ceil(target.count / 2) : target.count;
    const stack = slot(target.id, taken);
    takeFromSlot(target, taken);
    return stack;
  }
  if (slotIsEmpty(target)) {
    const moved = right ? 1 : carried.count;
    target.id = carried.id;
    target.count = moved;
    takeFromSlot(carried, moved);
    return carried;
  }
  if (target.id === carried.id) {
    const room = itemStackLimit(target.id) - target.count;
    const moved = right ? Math.min(1, room) : Math.min(carried.count, room);
    if (moved > 0) {
      target.count += moved;
      takeFromSlot(carried, moved);
    }
    return carried;
  }
  const swap = slot(target.id, target.count);
  target.id = carried.id;
  target.count = carried.count;
  return swap;
}

/** Add items the way a player expects: hotbar first, then the storage slots. */
function stow(id, count) {
  let left = addToHotbar(state.hotbar, id, count, itemStackLimit(id));
  if (left > 0) left = addToHotbar(state.backpack, id, left, itemStackLimit(id));
  return left;
}

/** A click in the inventory or crafting-screen hotbar row. */
function handleInventorySlot(container, index, { right = false } = {}) {
  const list = container === 'backpack' ? state.backpack : state.hotbar;
  const target = list?.[index];
  if (!target) return;
  state.cursor = clickSlot(target, state.cursor, { right });
  if (slotIsEmpty(state.cursor)) state.cursor = slot(0, 0);
  playClick();
  selectSlot(state.selectedSlot);
  ui.setCarry(state.cursor);
}

/** A click in a furnace's input, fuel or output slot. */
function handleFurnaceSlot(name, { right = false } = {}) {
  const furnace = state.furnaces.get(state.furnaceKey);
  const target = furnace?.[name];
  if (!target) return;
  state.cursor = clickSlot(target, state.cursor, { right, takeOnly: name === 'output' });
  if (slotIsEmpty(state.cursor)) state.cursor = slot(0, 0);
  playClick();
  selectSlot(state.selectedSlot);
  ui.setCarry(state.cursor);
  ui.setFurnaceState(furnace);
}

/** Run every loaded furnace and redraw the one on screen. */
function updateFurnaces(dt, now) {
  if (!state.furnaces?.size) return;
  for (const [key, furnace] of state.furnaces) {
    furnace.cookSeconds = furnace.cookSeconds || SMELT_SECONDS;
    tickFurnace(furnace, dt, smeltRef);
    if (key === state.furnaceKey && ui.isFurnaceOpen() && now - state.lastFurnaceUi > 100) {
      state.lastFurnaceUi = now;
      ui.setFurnaceState(furnace);
    }
  }
}

/** The world behind a container: drop what is carried, or close the screen. */
function handleOutsideClick() {
  if (!slotIsEmpty(state.cursor)) {
    dropCarried();
    return;
  }
  closeContainer();
}

/** Q throws what the cursor holds first, then what the hotbar slot holds. */
function dropCarried(one = false) {
  const carried = state.cursor;
  if (slotIsEmpty(carried)) return dropHeld(one);
  const count = one ? 1 : carried.count;
  dropStack({ id: carried.id, count });
  takeFromSlot(carried, count);
  if (slotIsEmpty(carried)) state.cursor = slot(0, 0);
  selectSlot(state.selectedSlot);
  ui.setCarry(state.cursor);
  return true;
}

/** Throw the held stack, or a single item with Ctrl held. */
function dropHeld(one = false) {
  const held = state.hotbar[state.selectedSlot];
  if (slotIsEmpty(held)) return false;
  const count = one ? 1 : held.count;
  dropStack({ id: held.id, count });
  takeFromSlot(held, count);
  selectSlot(state.selectedSlot);
  return true;
}

/**
 * Apply a game mode everywhere it matters: flight and clipping on the player,
 * what the HUD shows, and 1.12.2's habit of handing a creative player blocks.
 */
function setGamemode(mode, { announce = false } = {}) {
  const next = normalizeGamemode(mode) ?? 'survival';
  if (!GAMEMODES.includes(next)) return;
  state.gamemode = next;
  const flags = gameModeFlags(next);

  const player = state.player;
  if (player) {
    player.noClip = flags.noClip;
    player.flying = flags.canFly;
    player.vy = 0;
    player.fallStartY = null;
  }
  if (!flags.hurt) state.vitals.reset();

  if (state.worldRecord) state.worldRecord.gamemode = next;

  if (flags.infinite) {
    for (let i = 0; i < state.hotbar.length; i++) {
      if (slotIsEmpty(state.hotbar[i])) state.hotbar[i] = slot(PALETTE[i] ?? 1, 1);
    }
  }

  ui.setGamemode(next);
  selectSlot(state.selectedSlot);
  if (announce) ui.toast(`Game mode: ${gamemodeName(next)}`);
}

/** One frame of singleplayer survival: falls, hunger, drops, and death. */
function updateSurvival(dt, input) {
  const player = state.player;
  const vitals = state.vitals;
  const flags = gameModeFlags(state.gamemode);

  // Fall damage is decided the moment you touch down, from the height you fell.
  if (player.justLanded) {
    player.justLanded = false;
    if (flags.hurt) {
      const damage = fallDamage(player.fallDistance);
      if (damage > 0) {
        vitals.damage(damage);
        playHurt();
      }
    }
  }

  if (flags.hurt) {
    const distance = Math.hypot(player.vx, player.vz) * dt;
    const events = vitals.update(dt, {
      distance,
      sprinting: Boolean(input.sprint) && distance > 0,
      jumped: player.jumped,
    });
    if (events.damaged > 0) playHurt();
    player.jumped = false;
    if (vitals.dead) die();
  }

  const drops = state.drops;
  if (drops) {
    const picked = drops.update(dt, player);
    if (picked.length) {
      for (const drop of picked) {
        // The hotbar fills first, then the inventory's storage slots.
        const leftover = stow(drop.itemId, drop.count);
        // Anything that does not fit stays on the ground where it fell.
        if (leftover > 0) drops.spawn(drop.itemId, player.x, player.y + 1, player.z, { count: leftover, vy: 0.4 });
      }
      playPickup();
      selectSlot(state.selectedSlot);
    }
  }

  ui.renderBars(vitals.health, vitals.food);
}

/** 1.12.2 drops everything you carried where you died, then respawns you. */
function die() {
  const player = state.player;
  if (state.drops) {
    for (const item of state.hotbar) {
      if (!slotIsEmpty(item)) state.drops.spawn(item.id, player.x, player.y + 0.6, player.z, { count: item.count, vy: 1.2 });
    }
  }
  state.hotbar = emptyHotbar();
  state.vitals.reset();
  state.selectedSlot = 0;

  const spawn = state.world.findSpawn();
  player.spawnAt(spawn.x, spawn.z);
  selectSlot(0);
  ui.renderBars(state.vitals.health, state.vitals.food);
  ui.appendChat('You died! Respawning at the world spawn.');
  ui.toast('You died!');
}

/** Push the saved options into the page and the renderer. */
function applyOptions() {
  ui.setOptions(options);
}

function openInventory() {
  if (!state.mode) return;
  returnCarry();
  clearButtons();
  document.exitPointerLock?.();
  refreshCraft(state.craft, 2);
  ui.setCraftState(state.craft);
  ui.showInventory(state.hotbar, state.selectedSlot, state.backpack);
}

/** Right-clicking a crafting table opens its 3x3 instead of placing a block. */
function openCraftingTable() {
  if (!state.mode) return;
  returnCarry();
  clearButtons();
  document.exitPointerLock?.();
  refreshCraft(state.table, 3);
  ui.setTableState(state.table);
  ui.showCrafting(state.hotbar, state.selectedSlot);
}

function openCreative() {
  if (!state.mode) return;
  returnCarry();
  clearButtons();
  document.exitPointerLock?.();
  ui.showCreative(state.hotbar, state.selectedSlot);
}

/**
 * Right-clicking a furnace opens its three slots. What is inside lives on the
 * block position, so it is still there when the screen is closed and reopened.
 */
function openFurnace(x, y, z) {
  if (!state.mode) return;
  returnCarry();
  clearButtons();
  document.exitPointerLock?.();
  const key = `${x},${y},${z}`;
  let furnace = state.furnaces.get(key);
  if (!furnace) {
    furnace = {
      input: slot(0, 0),
      fuel: slot(0, 0),
      output: slot(0, 0),
      cook: 0,
      burn: 0,
      burnMax: 0,
      cookSeconds: SMELT_SECONDS,
    };
    state.furnaces.set(key, furnace);
  }
  state.furnaceKey = key;
  ui.setFurnaceState(furnace);
  ui.showFurnace(state.hotbar, state.selectedSlot);
}

// ── crafting ───────────────────────────────────────────────────────────────

const craftStateFor = (size) => (size === 3 ? state.table : state.craft);

/** Re-run the recipe match for a grid and remember the result. */
function refreshCraft(container, size) {
  const match = matchRecipe(gridIds(container.grid), size, recipeRef);
  container.result = match?.out ?? null;
  return container.result;
}

/** Clicking a grid cell moves a stack between the cursor and the grid. */
function handleCraftSlot(index, size, { right = false } = {}) {
  const container = craftStateFor(size);
  const carried = state.cursor;

  if (slotIsEmpty(carried)) {
    const taken = takeAt(container.grid, index);
    if (taken) {
      if (right && taken.count > 1) {
        // Right click leaves half the stack in the grid, as 1.12.2 does.
        const half = Math.ceil(taken.count / 2);
        state.cursor = slot(taken.id, half);
        putMany(container.grid, index, taken.id, taken.count - half, itemStackLimit(taken.id));
      } else {
        state.cursor = slot(taken.id, taken.count);
      }
    }
  } else {
    const want = right ? 1 : carried.count;
    const placed = putMany(container.grid, index, carried.id, want, itemStackLimit(carried.id));
    takeFromSlot(carried, placed);
  }

  if (slotIsEmpty(state.cursor)) state.cursor = slot(0, 0);
  refreshCraft(container, size);
  selectSlot(state.selectedSlot);
  ui.setCarry(state.cursor);
  if (size === 3) ui.renderTableCraft();
  else ui.renderInventoryCraft();
}

/**
 * Clicking the result crafts. Repeated clicks stack the output onto the cursor,
 * so a stack of logs becomes planks without putting each batch down first, and
 * shift clicking crafts straight into the hotbar for as long as it fits.
 */
function handleCraftResult(size, { shift = false } = {}) {
  const container = craftStateFor(size);
  const match = () => matchRecipe(gridIds(container.grid), size, recipeRef);

  if (shift) {
    let crafts = 0;
    let made = 0;
    for (; crafts < 64; crafts++) {
      const crafted = craftOnce(container.grid, size, match);
      if (!crafted) break;
      made += crafted.count;
      const left = stow(crafted.id, crafted.count);
      if (left > 0) {
        // The hotbar is full: the rest goes on the ground rather than vanishing.
        dropStack({ id: crafted.id, count: left });
        break;
      }
    }
    if (!crafts) return;
    playClick();
    refreshCraft(container, size);
    selectSlot(state.selectedSlot);
    if (size === 3) ui.renderTableCraft();
    else ui.renderInventoryCraft();
    ui.toast(`Crafted ${made} items`);
    return;
  }

  const out = match()?.out;
  if (!out) return;
  const carried = state.cursor;
  // The hands must be free, or already holding the same thing with room left.
  if (!slotIsEmpty(carried)) {
    if (carried.id !== out.id) return;
    if (carried.count + out.count > itemStackLimit(out.id)) return;
  }

  const crafted = craftOnce(container.grid, size, match);
  if (!crafted) return;
  const carriedCount = slotIsEmpty(carried) ? 0 : carried.count;
  state.cursor = slot(crafted.id, carriedCount + crafted.count);
  playClick();
  refreshCraft(container, size);
  selectSlot(state.selectedSlot);
  ui.setCarry(state.cursor);
  if (size === 3) ui.renderTableCraft();
  else ui.renderInventoryCraft();
  ui.toast(`Crafted ${itemName(crafted.id)} x${crafted.count}`);
}

/** Ids the creative menu shows for a tab, narrowed by the search box. */
function creativeIds(tab, query) {
  const text = String(query ?? '').toLowerCase().trim();
  const ids = tab === 'items' ? allItems().map((entry) => entry.id) : [...BLOCKS.keys()].filter((id) => id > 0);
  if (!text) return ids;
  return ids.filter((id) => itemName(id).toLowerCase().includes(text));
}

// ── game entry ─────────────────────────────────────────────────────────────

function stopSession() {
  if (state.session) {
    try {
      state.session.disconnect();
    } catch {
      /* already gone */
    }
    state.session = null;
  }
}

function playWorld(record) {
  stopSession();
  clearChunks();

  const world = new World({ seed: record.seed, edits: record.edits || [] });
  const player = new Player(world);
  const spawn = world.findSpawn();
  player.spawnAt(spawn.x, spawn.z);

  state.mode = 'single';
  state.world = world;
  state.worldRecord = record;
  state.player = player;
  state.teleported = true;
  state.chunksDone = 0;
  // A world remembers the mode it was played in; a new world starts survival
  // with nothing in your hands.
  state.gamemode = normalizeGamemode(record.gamemode) ?? 'survival';
  state.vitals = new Vitals();
  state.drops = new Drops(world);
  // Sand, gravel and liquids: only cells a change disturbs get simulated, which
  // leaves the oceans the generator laid down perfectly still.
  state.physics = new BlockPhysics(world);
  world.onBlockSet = (x, y, z) => state.physics?.touch(x, y, z);
  // A few animals around the spawn: hunger needs something to fill it with.
  state.mobs = new Mobs(world);
  state.mobs.spawnNear(player, { count: 7 });
  // Whatever the player was carrying when they left comes back with them.
  state.hotbar = restoreHotbar(record.hotbar);
  state.backpack = restoreHotbar(record.backpack, 27);
  state.furnaces = restoreFurnaces(record.furnaces);

  record.lastPlayed = Date.now();
  const worlds = loadWorlds().map((w) => (w.id === record.id ? record : w));
  saveWorlds(worlds);
  state.lastSave = performance.now();

  scanAroundPlayer(options.renderDistance);
  for (const key of world.takeDirty()) {
    const [cx, cz] = key.split(',').map(Number);
    if (world.hasChunk(cx, cz)) queueMesh(cx, cz, true);
  }

  setGamemode(state.gamemode);
  ui.showScreen(null);
  ui.clearChat();
  ui.renderBars(state.vitals.health, state.vitals.food);
  selectSlot(Number.isFinite(record.selectedSlot) ? record.selectedSlot : 0);
  resize();
  canvas.focus();
}

/**
 * Everything a singleplayer world remembers about the player: the blocks they
 * changed, the hotbar they were carrying and which slot was in hand.
 */
function saveProgress() {
  const record = state.worldRecord;
  if (state.mode !== 'single' || !state.world || !record) return false;
  record.edits = state.world.serializeEdits();
  record.hotbar = state.hotbar.map((entry) =>
    slotIsEmpty(entry) ? { id: 0, count: 0 } : { id: entry.id, count: entry.count }
  );
  record.backpack = state.backpack.map((entry) =>
    slotIsEmpty(entry) ? { id: 0, count: 0 } : { id: entry.id, count: entry.count }
  );
  record.furnaces = [...state.furnaces.entries()];
  record.selectedSlot = state.selectedSlot;
  record.gamemode = state.gamemode;
  const worlds = loadWorlds().map((w) => (w.id === record.id ? record : w));
  saveWorlds(worlds);
  return true;
}

/**
 * A saved hotbar comes back out of localStorage, so treat it as untrusted: drop
 * ids that are neither a block nor an item any more, and clamp the counts.
 */
/**
 * One saved slot back into a live one. The registry is fetched asynchronously
 * and a world can be entered before it lands, so unknown item ids are only
 * dropped once the registry is actually here.
 */
function restoreSlot(entry) {
  const id = Math.floor(Number(entry?.id) || 0);
  const count = Math.floor(Number(entry?.count) || 0);
  if (id <= 0 || count <= 0) return slot(0, 0);
  // isItemId only checks the id range, so make the registry confirm the id.
  if (!blockDef(id) && !isItemId(id)) return slot(0, 0);
  if (allItems().length > 0 && isItemId(id) && !itemKey(id)) return slot(0, 0);
  return slot(id, Math.min(count, itemStackLimit(id)));
}

function restoreHotbar(saved, size = 9) {
  const hotbar = emptyHotbar(size);
  if (!Array.isArray(saved)) return hotbar;
  saved.slice(0, size).forEach((entry, index) => {
    hotbar[index] = restoreSlot(entry);
  });
  return hotbar;
}

/** Furnaces, keyed the same way they are saved: one entry per block position. */
function restoreFurnaces(saved) {
  const map = new Map();
  if (!Array.isArray(saved)) return map;
  for (const entry of saved) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
    const [key, slots] = entry;
    if (!slots) continue;
    map.set(key, {
      input: restoreSlot(slots.input),
      fuel: restoreSlot(slots.fuel),
      output: restoreSlot(slots.output),
      cook: Number(slots.cook) || 0,
      burn: Number(slots.burn) || 0,
      burnMax: Number(slots.burnMax) || 0,
      cookSeconds: Number(slots.cookSeconds) || SMELT_SECONDS,
    });
  }
  return map;
}

function joinServer(server) {
  stopSession();
  clearChunks();
  ui.clearConnectLog();
  ui.setConnectTitle(`Joining ${server.name}`);
  ui.setConnectStatus('opening socket');
  ui.showScreen('connect');

  const world = new World({ generate: false });
  const player = new Player(world);
  player.flying = true; // until the server sends our position

  state.mode = 'multi';
  state.world = world;
  state.player = player;
  state.teleported = false;
  state.chunksDone = 0;
  // Server health comes from the server (we do not read 0x06 yet), so the bars
  // stay full and the local survival rules are off. The hotbar carries the
  // standard blocks because places are just 0x08 packets.
  state.gamemode = 'survival';
  state.vitals = new Vitals();
  state.drops = null;
  // A server world's blocks belong to the server, so no local physics, and the
  // animals on it are the server's to send.
  state.physics = null;
  state.mobs = null;
  state.hotbar = fillHotbarWith(emptyHotbar(), PALETTE);
  ui.setGamemode('survival');
  ui.renderBars(state.vitals.health, state.vitals.food);

  const session = new MultiplayerSession({
    address: server.address,
    username: ui.getNickname(),
    // The build this folder holds; it is what a server is told we run.
    clientVersion: '1.8.0v',
    world,
    handlers: {
      onLog: (line) => ui.log(line),
      onStatus: (text) => ui.setConnectStatus(text),
      onChat: (text) => ui.appendChat(text),
      onChunk: (cx, cz) => queueMesh(cx, cz, true),
      onBlockChange: (x, y, z) => queueMesh(x >> 4, z >> 4, true),
      onJoin: () => {
        ui.setConnectStatus('in game');
        ui.toast(`Joined ${server.name}`);
        ui.showScreen(null);
        ui.clearChat();
        selectSlot(0);
        resize();
        canvas.focus();
      },
      onTeleport: ({ x, y, z, yaw, pitch }) => {
        player.x = x;
        player.y = y;
        player.z = z;
        if (!state.teleported) {
          player.yaw = (yaw * Math.PI) / 180;
          player.pitch = (pitch * Math.PI) / 180;
          player.flying = false;
          state.teleported = true;
          if (state.mode === 'multi') ui.showScreen(null);
        }
      },
      onKick: (reason) => {
        state.session = null;
        ui.setConnectTitle('Disconnected');
        ui.setConnectStatus(reason);
        ui.log(reason);
        ui.showScreen('connect');
      },
    },
  });

  state.session = session;
  session.connect();
}

function requestLock() {
  try {
    const result = canvas.requestPointerLock?.();
    // Chrome returns a promise that rejects when the page is not focused yet.
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    /* pointer lock is a nicety, never fatal */
  }
}

function pauseGame() {
  if (!state.mode) return;
  // Pausing is a natural save point, and it is cheap.
  saveProgress();
  clearButtons();
  document.exitPointerLock?.();
  if (ui.isChatOpen()) ui.closeChat();
  ui.showScreen('pause');
}

function resumeGame() {
  if (!state.mode) return;
  ui.showScreen(null);
  requestLock();
}

function quitToTitle() {
  if (saveProgress()) ui.toast('World saved');
  stopSession();
  document.exitPointerLock?.();
  state.mode = null;
  state.world = null;
  state.player = null;
  state.physics = null;
  state.mobs = null;
  state.worldRecord = null;
  clearChunks();
  ui.showScreen('title');
}

// ── input ──────────────────────────────────────────────────────────────────

const KEY_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  // In 1.12.2 space and shift are jump/sprint on the ground and up/down while
  // flying, which leaves Q and E to the game itself.
  Space: 'jump',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
};

function syncInput() {
  for (const [prop] of Object.entries(input)) input[prop] = false;
  for (const code of keys) {
    const mapped = KEY_MAP[code];
    if (mapped) input[mapped] = true;
  }
}

window.addEventListener('keydown', (event) => {
  if (ui.isChatOpen()) return;
  if (!state.mode) return;

  if (event.code === 'Escape') {
    if (ui.isInventoryOpen()) closeContainer();
    else pauseGame();
    return;
  }
  // E opens the inventory in every mode but spectator, and closes whatever
  // container is already up.
  if (event.code === 'KeyE') {
    if (ui.isInventoryOpen()) {
      event.preventDefault();
      closeContainer();
    } else if (state.gamemode !== 'spectator') {
      event.preventDefault();
      openInventory();
    }
    return;
  }
  // '/' and 'T' both open the chat line; '/' arrives with its slash typed.
  if (event.code === 'Slash' || event.code === 'NumpadDivide') {
    event.preventDefault();
    ui.openChat('/');
    return;
  }
  // With a container up the game is still rendered but you do not walk.
  if (ui.isInventoryOpen()) {
    if (event.code === 'KeyQ') {
      event.preventDefault();
      dropCarried(event.ctrlKey);
    }
    return;
  }
  if (event.code === 'KeyQ') {
    event.preventDefault();
    dropHeld(event.ctrlKey);
    return;
  }
  if (event.code === 'KeyT') {
    ui.openChat();
    event.preventDefault();
    return;
  }
  if (event.code === 'KeyF' && state.mode === 'single' && gameModeFlags(state.gamemode).canFly) {
    state.player.flying = !state.player.flying;
    state.player.vy = 0;
    return;
  }
  if (event.code.startsWith('Digit')) {
    const index = Number(event.code.slice(5)) - 1;
    if (index >= 0 && index < state.hotbar.length) selectSlot(index);
    return;
  }

  if (KEY_MAP[event.code]) {
    keys.add(event.code);
    syncInput();
    if (event.code === 'Space') event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
  syncInput();
});

window.addEventListener('blur', () => {
  keys.clear();
  syncInput();
  clearButtons();
});

canvas.addEventListener('mousedown', (event) => {
  if (!state.player) return;
  if (document.pointerLockElement !== canvas) {
    requestLock();
    ui.setClickToPlay(false);
    return;
  }
  if (!state.mode) return;

  const hit = state.player.raycast(6);
  const flags = gameModeFlags(state.gamemode);

  if (event.button === 0) {
    state.buttons.left = true;
    if (!flags.canBreak) return;
    // An animal in front of you takes the swing instead of the block behind it.
    if (swingAtMob()) return;
    if (!hit) return;
    // 1.12.2 mines as you hold the button: hardness decides how long it takes and
    // the frame loop finishes the job, then picks up the next block you look at.
    startMining(hit);
  } else if (event.button === 2) {
    state.buttons.right = true;
    // Food in hand is eaten; a block in hand is placed as before.
    if (eatHeld()) return;
    if (!hit || !flags.canPlace) return;
    // A crafting table opens its own grid, and a furnace its own three slots,
    // rather than being built on.
    if (hit.id === blockIdByName('Crafting Table')) {
      openCraftingTable();
      return;
    }
    if (FURNACE_IDS.has(hit.id)) {
      openFurnace(hit.x, hit.y, hit.z);
      return;
    }
    if (placeBlockAt(hit)) state.nextPlaceAt = performance.now() + PLACE_INTERVAL;
  }
});

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    state.buttons.left = false;
    state.mining = null;
    ui.setMining(0);
  } else if (event.button === 2) {
    state.buttons.right = false;
  }
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

canvas.addEventListener('wheel', (event) => {
  if (!state.mode) return;
  event.preventDefault();
  const dir = event.deltaY > 0 ? 1 : -1;
  selectSlot((state.selectedSlot + dir + state.hotbar.length) % state.hotbar.length);
}, { passive: false });

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== canvas || !state.player) return;
  const sensitivity = 0.0022 * (options.sensitivity / 100);
  state.player.yaw -= event.movementX * sensitivity;
  state.player.pitch -= event.movementY * sensitivity;
  const limit = Math.PI / 2 - 0.01;
  state.player.pitch = Math.max(-limit, Math.min(limit, state.player.pitch));
});

document.addEventListener('pointerlockchange', () => {
  if (!state.mode) return;
  const locked = document.pointerLockElement === canvas;
  if (!locked) clearButtons();
  if (locked) {
    ui.setClickToPlay(false);
    return;
  }
  // Escape (or a tab switch) drops pointer lock: treat that as pausing unless a
  // screen is already up.
  if (!ui.anyScreenOpen()) {
    ui.setClickToPlay(true);
    pauseGame();
  }
});

// ── loop ───────────────────────────────────────────────────────────────────

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  // Auto GUI scale follows the window, as 1.12.2 does on resize.
  ui?.applyScale?.();
}

window.addEventListener('resize', resize);

// A reload or a closed tab is not a clean quit: 1.12.2 would have written the
// world out, so write it here too rather than losing the last half minute.
window.addEventListener('pagehide', () => saveProgress());
window.addEventListener('beforeunload', () => saveProgress());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveProgress();
});

function updateHud(now) {
  if (!state.player) return;
  const p = state.player;
  const chunks = renderer.chunkCount;
  const mode = state.mode === 'multi' ? 'multiplayer' : 'singleplayer';
  const flight = p.flying ? ' · flying' : '';
  const vitals = state.mode === 'single' ? `hp ${state.vitals.health.toFixed(0)} · food ${state.vitals.food.toFixed(0)}\n` : '';
  const drops = state.drops ? `items ${state.drops.count} · ` : '';
  ui.setDebug(
    `${Math.round(state.fps)} fps\n` +
      `xyz ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}\n` +
      `${mode}${flight} · ${state.gamemode}\n` +
      vitals +
      `${drops}chunks ${chunks} · ${Math.round(renderer.triangleCount / 1000)}k tris`
  );
}

let lastFrame = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  state.fps = state.fps * 0.9 + (1 / Math.max(dt, 0.0001)) * 0.1;

  if (state.mode && state.player) {
    state.player.update(dt, input);

    if (state.mode === 'single') {
      updateSurvival(dt, input);
      state.physics?.tick(dt);
      state.mobs?.update(dt, state.player);
    }
    // 1.12.2 autosaves singleplayer every half minute; a closed tab loses less.
    if (state.mode === 'single' && now - state.lastSave > 30000) {
      state.lastSave = now;
      saveProgress();
    }
    updateRepeatActions(now);
    updateMining(dt);
    updateFurnaces(dt, now);

    if (state.mode === 'multi' && state.session && now - state.lastPositionSent > 100) {
      state.lastPositionSent = now;
      const p = state.player;
      state.session.sendPosition(p.x, p.y, p.z, (p.yaw * 180) / Math.PI, (p.pitch * 180) / Math.PI, p.onGround);
    }

    if (now - state.lastChunkScan > 400) {
      state.lastChunkScan = now;
      scanAroundPlayer(state.mode === 'single' ? options.renderDistance : 9);
    }

    for (const key of state.world.takeDirty()) {
      const [cx, cz] = key.split(',').map(Number);
      if (state.world.hasChunk(cx, cz)) queueMesh(cx, cz, true);
    }
  }

  processMeshQueue();

  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);

  if (state.player) {
    const p = state.player;
    const selection = state.mode === 'single' ? p.raycast(6) : null;
    renderer.setSky(1);
    renderer.render(
      { x: p.x, y: p.eyeY(), z: p.z, yaw: p.yaw, pitch: p.pitch, fov: options.fov },
      width / Math.max(1, height),
      selection,
      [
        ...(renderer.mobTexture || !state.mobs ? [] : state.mobs.boxes()),
        ...(state.drops ? state.drops.cubes() : []),
      ],
      state.drops ? state.drops.sprites() : [],
      renderer.mobTexture && state.mobs ? state.mobs.parts() : []
    );
    updateHud(now);
  } else {
    renderer.setSky(1);
    renderer.render({ x: 0, y: 70, z: 0, yaw: 0.6, pitch: -0.15, fov: options.fov }, width / Math.max(1, height), null);
  }

  requestAnimationFrame(frame);
}

// ── boot ───────────────────────────────────────────────────────────────────

// Textures are built from the bundled Eaglercraft asset pack by
// tools/build-assets.mjs; if they are missing the client still runs, unfurnished.
async function loadAtlas() {
  try {
    const response = await fetch('./assets/atlas.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`atlas.json ${response.status}`);
    const meta = await response.json();
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('atlas.png failed to load'));
      // Cache-bust: the atlas is rebuilt by tools/build-assets.mjs.
      img.src = `./assets/atlas.png?v=${Date.now()}`;
    });
    // The HUD needs the image too: it composes isometric block icons from it.
    setAtlas(meta, image);
    renderer.setAtlasTexture(image);
    selectSlot(state.selectedSlot);
    ui.setAssetWarning('');
    // Anything meshed before the atlas arrived needs one redraw.
    if (state.mode) {
      clearChunks();
      scanAroundPlayer(state.mode === 'single' ? options.renderDistance : 9);
    }
    console.log(`atlas loaded: ${Object.keys(meta.tiles).length} tiles`);
  } catch (err) {
    ui.setAssetWarning(`Could not load textures (${err.message}) — run: node tools/build-assets.mjs`);
  }
}

// The animals' own entity textures, copied out of the same pack by
// tools/entity-textures.mjs. Without them the mobs fall back to coloured boxes.
async function loadMobAtlas() {
  const response = await fetch('./assets/mob-atlas.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`mob-atlas.json ${response.status}`);
  const meta = await response.json();
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('mob-atlas.png failed to load'));
    img.src = `./assets/mob-atlas.png?v=${Date.now()}`;
  });
  renderer.setMobTexture(image, meta);
  console.log(`mob atlas loaded: ${Object.keys(meta.mobs).join(', ')}`);
}

// ── mining ─────────────────────────────────────────────────────────────────

/** Blocks per second: a correct tool multiplies the baseline by its tier. */
function miningSpeed(id, heldKey) {
  const def = blockDef(id);
  if (!def) return 0;
  const hardness = Math.max(0.05, def.hardness);
  const tool = heldKey ? itemToolInfo(heldKey) : null;
  const correct = tool && tool.type === def.tool;
  const speed = correct ? 1 + tool.tier * 1.5 : 1;
  return speed / hardness;
}

function itemToolInfo(key) {
  return toolInfo(key);
}

function heldToolKey() {
  const held = state.hotbar[state.selectedSlot];
  if (!held?.id || isBlockItem(held.id)) return null;
  return itemKey(held.id);
}

// 1.12.2 places a block every four ticks while the button stays down.
const PLACE_INTERVAL = 200;

/** Forget both buttons, for when the pointer lock or the screen goes away. */
function clearButtons() {
  state.buttons.left = false;
  state.buttons.right = false;
}

/**
 * Hit the animal under the crosshair. Returns true when there was one, so the
 * swing does not also mine the block behind it.
 */
/**
 * 1.12.2 gives an empty hand one point of damage, and a hurt animal cannot be
 * hurt again for ten ticks, so a pig takes ten punches however fast you click.
 */
const HAND_DAMAGE = 1;
const HIT_INTERVAL = 500;

function swingAtMob() {
  if (state.mode !== 'single' || !state.mobs || !state.player) return false;
  const mob = state.mobs.underCrosshair(state.player, 3.4);
  if (!mob) return false;
  const now = performance.now();
  if (now < state.nextMobHit) return true;
  state.nextMobHit = now + HIT_INTERVAL;
  const died = state.mobs.hit(mob, HAND_DAMAGE, state.player.lookDirection());
  playHurt();
  if (died) {
    const id = itemIdByKey(mob.type.drop);
    if (id && state.drops) {
      const count = mob.type.dropMin + Math.floor(Math.random() * (mob.type.dropMax - mob.type.dropMin + 1));
      state.drops.spawn(id, mob.x, mob.y + 0.4, mob.z, { count, vy: 1.8 });
    }
    state.mobs.remove(mob);
  }
  return true;
}

/** Eat the food in hand, if the hunger bar has room. Returns whether it ate. */
function eatHeld() {
  if (state.mode !== 'single' || !state.player) return false;
  const now = performance.now();
  if (now < state.nextEatAt) return false;
  const item = state.hotbar[state.selectedSlot];
  if (slotIsEmpty(item) || isBlockItem(item.id)) return false;
  if (eat(state.vitals, itemKey(item.id)) <= 0) return false;
  state.nextEatAt = now + 500;
  takeFromSlot(item, 1);
  selectSlot(state.selectedSlot);
  ui.renderBars(state.vitals.health, state.vitals.food);
  playClick();
  return true;
}

/** Start on a block, unless it is the one already being mined. */
function startMining(hit) {
  if (!hit || blockDef(hit.id)?.hardness < 0) return;
  const current = state.mining;
  if (current && current.x === hit.x && current.y === hit.y && current.z === hit.z) return;
  state.mining = { x: hit.x, y: hit.y, z: hit.z, id: hit.id, progress: 0 };
}

/** Put the selected block against the face that was hit. Returns whether it went down. */
function placeBlockAt(hit) {
  const flags = gameModeFlags(state.gamemode);
  const item = state.hotbar[state.selectedSlot];
  if (slotIsEmpty(item) || !isBlockItem(item.id)) return false;
  const bx = hit.x + hit.face[0];
  const by = hit.y + hit.face[1];
  const bz = hit.z + hit.face[2];
  if (state.player.intersectsBlock(bx, by, bz)) return false;
  const id = item.id;
  // Local saves record edits; a server world is the server's, so we only apply
  // the change optimistically and let 0x23 BlockChange be the truth.
  state.world.setBlock(bx, by, bz, id, { record: state.mode === 'single' });
  playBlockSound(id);
  if (state.mode === 'multi') {
    state.session?.place(hit.x, hit.y, hit.z, faceIndex(hit.face), id, hit.point);
  }
  // Creative places from an endless supply; survival spends one block.
  if (!flags.infinite) {
    takeFromSlot(item, 1);
    selectSlot(state.selectedSlot);
  }
  return true;
}

/**
 * A held button keeps working, the way it does in 1.12.2: breaking moves on to
 * the next block in front of you, and placing repeats on a four tick clock.
 */
function updateRepeatActions(now) {
  if (!state.mode || !state.player) return;
  if (!state.buttons.left && !state.buttons.right) return;
  if (ui.isInventoryOpen() || document.pointerLockElement !== canvas) return;
  const flags = gameModeFlags(state.gamemode);

  if (state.buttons.left && flags.canBreak) {
    if (!swingAtMob()) {
      const hit = state.player.raycast(6);
      if (hit) startMining(hit);
    }
  }

  if (state.buttons.right && flags.canPlace) {
    if (eatHeld()) return;
    if (now < state.nextPlaceAt) return;
    const hit = state.player.raycast(6);
    if (!hit) return;
    // Only the click itself opens a container; holding must not re-open it.
    if (hit.id === blockIdByName('Crafting Table') || FURNACE_IDS.has(hit.id)) return;
    if (placeBlockAt(hit)) state.nextPlaceAt = now + PLACE_INTERVAL;
  }
}

function updateMining(dt) {
  const mining = state.mining;
  if (!mining || !state.player) {
    ui.setMining(0);
    return;
  }
  const hit = state.player.raycast(6);
  if (!hit || hit.x !== mining.x || hit.y !== mining.y || hit.z !== mining.z) {
    state.mining = null;
    ui.setMining(0);
    return;
  }
  if (!gameModeFlags(state.gamemode).canBreak) {
    state.mining = null;
    ui.setMining(0);
    return;
  }

  mining.progress += dt * miningSpeed(mining.id, heldToolKey());
  if (mining.progress < 1) {
    ui.setMining(mining.progress);
    return;
  }

  state.mining = null;
  ui.setMining(0);
  breakBlockAt(hit);
}

function breakBlockAt(hit) {
  const flags = gameModeFlags(state.gamemode);
  state.world.setBlock(hit.x, hit.y, hit.z, 0, { record: state.mode === 'single' });
  playBlockSound(hit.id);

  if (state.mode === 'multi') {
    state.session?.breakBlock(hit.x, hit.y, hit.z, faceIndex(hit.face));
  } else if (flags.dropsItems) {
    spawnDrops(hit);
  }
  if (flags.hurt) state.vitals.exhaustion += EXHAUSTION.breakBlock;
}

/** Throw whatever 1.12.2 says this block leaves behind into the world. */
function spawnDrops(hit) {
  const heldKey = heldToolKey();
  const drops = dropsFor(hit.id, { heldKey });

  if (!drops.length && harvestNeed(hit.id) && !canHarvest(hit.id, heldKey)) {
    // Say what is missing, but not on every swing.
    const now = performance.now();
    if (state.toolHint.id !== hit.id || now - state.toolHint.at > 5000) {
      const need = harvestNeed(hit.id);
      const tier = ['', 'wooden', 'stone', 'iron', 'diamond'][need.tier] || 'wooden';
      ui.toast(`You need a ${tier} ${need.tool} for ${blockName(hit.id)}`);
      state.toolHint = { id: hit.id, at: now };
    }
    return;
  }

  for (const drop of drops) {
    const id = drop.kind === 'block' ? blockIdByName(drop.name) : itemIdByKey(drop.name);
    if (!id) continue;
    state.drops?.spawn(id, hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, { count: drop.count });
  }
}

resize();
applyOptions();
ui.init();
ui.showScreen('title');
ui.renderWorlds(loadWorlds());
ui.renderServers(loadServers());
selectSlot(0);
requestAnimationFrame(frame);
loadAtlas();
loadMobAtlas().catch((err) => console.warn('animal textures unavailable', err.message));
loadItems().catch((err) => {
  console.warn('item registry unavailable', err);
});

// Diagnostics handle for automated checks.
window.__eagler = { state, renderer, ui, playWorld, joinServer, quitToTitle, setGamemode, updateSurvival };
