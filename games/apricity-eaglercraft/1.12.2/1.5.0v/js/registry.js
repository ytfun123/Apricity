// One id space for everything a player can hold: block ids stay exactly 1.12.2's
// (1-255), and every non-block item sits at ITEM_BASE and up, numbered by
// assets/registry.json, which tools/build-assets.mjs generates from the pack's
// own texture list and lang file.
//
// Keeping blocks on their vanilla ids matters beyond looks: world saves, the
// multiplayer dig/place packets and the mesher all speak block ids.

import { BLOCKS, blockFlatKey, blockName } from './blocks.js';

export const ITEM_BASE = 1000;

const items = [];
const byId = new Map();
const byKey = new Map();
const byName = new Map();

/** Install the generated registry: [{ key, name, stack }] in atlas order. */
export function setItems(list) {
  items.length = 0;
  byId.clear();
  byKey.clear();
  byName.clear();
  (list || []).forEach((entry, index) => {
    const def = {
      id: ITEM_BASE + index,
      key: entry.key,
      name: entry.name,
      stack: entry.stack ?? 64,
    };
    items.push(def);
    byId.set(def.id, def);
    byKey.set(def.key, def);
    byName.set(def.name.toLowerCase(), def);
  });
}

export async function loadItems(url = './assets/registry.json') {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`registry.json ${response.status}`);
  const data = await response.json();
  setItems(data.items);
  return data;
}

export function isItemId(id) {
  return id >= ITEM_BASE;
}

/** True for the ids the world can place as blocks. */
export function isBlockItem(id) {
  return id > 0 && id < ITEM_BASE;
}

export function itemDef(id) {
  if (isItemId(id)) return byId.get(id) ?? null;
  return BLOCKS.get(id) ?? null;
}

export function itemName(id) {
  if (isItemId(id)) return byId.get(id)?.name ?? 'Unknown Item';
  return blockName(id);
}

export function itemKey(id) {
  if (isItemId(id)) return byId.get(id)?.key ?? null;
  return null;
}

export function itemStackLimit(id) {
  if (isItemId(id)) return byId.get(id)?.stack ?? 64;
  return 64;
}

/** The atlas tile this id draws with, as a flat 16x16 sprite. */
export function itemTileKey(id) {
  if (isItemId(id)) {
    const def = byId.get(id);
    return def ? `item:${def.key}` : null;
  }
  return blockFlatKey(id);
}

export function itemIdByKey(key) {
  return byKey.get(String(key))?.id ?? 0;
}

export function itemIdByName(name) {
  const wanted = String(name).toLowerCase();
  const hit = byName.get(wanted);
  if (hit) return hit.id;
  return byKey.get(wanted.replace(/\s+/g, '_'))?.id ?? 0;
}

/** Every item the creative menu can show, in registry order. */
export function allItems() {
  return items.slice();
}

export function itemCount() {
  return items.length;
}
