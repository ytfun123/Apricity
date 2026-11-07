// Every screen and the in-game HUD, laid out the way 1.12.2 lays them out:
// the pack's own widgets.png sprites for buttons and sliders, icons.png for
// hearts, hunger and the XP bar, container/inventory.png for the inventory and
// tab_inventory.png for the creative palette, and the pack's en_us.lang for
// every label.

import { BLOCKS, blockColor, blockName, getAtlas, getAtlasImage, tileFor } from './blocks.js';
import { isItemId, itemName, itemTileKey } from './registry.js';
import { setFontMeta, setBaseScale, setText, textElement, measureText } from './mcfont.js';

const $ = (id) => document.getElementById(id);

// 1.12.2's own wording, used until assets/strings.json (the pack's en_us.lang)
// arrives and for the keys this trimmed pack leaves out.
const FALLBACK_STRINGS = {
  singleplayer: 'Singleplayer',
  multiplayer: 'Multiplayer',
  options: 'Options...',
  quit: 'Quit Game',
  realms: 'Minecraft Realms',
  gameMenu: 'Game Menu',
  backToGame: 'Back to Game',
  saveQuit: 'Save and Quit to Title',
  selectWorld: 'Select World',
  playSelected: 'Play Selected World',
  createWorld: 'Create New World',
  edit: 'Edit',
  delete: 'Delete',
  recreate: 'Re-Create',
  playMultiplayer: 'Play Multiplayer',
  joinServer: 'Join Server',
  directConnect: 'Direct Connect',
  addServer: 'Add Server',
  refresh: 'Refresh',
  cancel: 'Cancel',
  done: 'Done',
  back: 'Back',
  inventory: 'Inventory',
  optionsTitle: 'Options',
  fov: 'FOV',
  renderDistance: 'Render Distance',
  sensitivity: 'Sensitivity',
  guiScale: 'GUI Scale',
  worldName: 'World Name',
  worldSeed: 'Seed for the World Generator',
  serverName: 'Server Name',
  serverAddress: 'Server Address',
  playerName: 'Player Name',
  creative: 'Building Blocks',
  advancements: 'Advancements',
  statistics: 'Statistics',
  connecting: 'Connecting to the server...',
  clickToPlay: 'Click to play',
};

// Not full cubes, so 1.12.2 draws these as their flat sprite rather than a cube.
const FLAT_BLOCKS = new Set([6, 50, 51, 59, 65, 66, 78, 83, 106, 111]);

// The three visible faces of a 16x16 isometric block icon, each as
// [origin, u, v]: the tile is painted into origin + u*a + v*b.
const CUBE_FACES = [
  [[8, 0], [8, 4], [-8, 4]], // top
  [[0, 4], [8, 4], [0, 8]], // left side
  [[16, 4], [-8, 4], [0, 8]], // right side
];

const OPTION_ROWS = [
  { key: 'renderDistance', label: 'renderDistance', values: [2, 3, 4, 5, 6, 8, 10, 12], suffix: ' chunks' },
  { key: 'fov', label: 'fov', values: [30, 40, 50, 60, 70, 80, 90, 100, 110], suffix: '' },
  { key: 'sensitivity', label: 'sensitivity', values: [25, 50, 75, 100, 125, 150, 200], suffix: '%' },
  // 0 is 1.12.2's Auto: the largest scale whose 320x240 layout still fits.
  { key: 'guiScale', label: 'guiScale', values: [0, 1, 2, 3], suffix: '' },
];

export class UI {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.strings = { ...FALLBACK_STRINGS };
    this.splashes = ['Eagler!'];
    this.screens = {
      title: $('screen-title'),
      worlds: $('screen-worlds'),
      servers: $('screen-servers'),
      options: $('screen-options'),
      connect: $('screen-connect'),
      pause: $('screen-pause'),
      inventory: $('screen-inventory'),
      crafting: $('screen-crafting'),
      creative: $('screen-creative'),
    };
    this.hud = $('hud');
    this.chatEl = $('chat');
    this.chatInput = $('chat-input');
    this.debugEl = $('debug');
    this.splashEl = $('splash');
    this.hotbarEl = $('hotbar');
    this.heartsEl = $('hearts');
    this.hungerEl = $('hunger');
    this.hudIcons = $('hud-icons');
    this.xpBar = $('xpbar');
    this.xpFill = $('xpbar-fill');
    this.gamemode = 'survival';
    this.bars = { health: 20, food: 20 };
    this.barKey = '';
    this.clickToPlay = $('click-to-play');
    this.connectLog = $('connect-log');
    this.connectStatus = $('connect-status');
    this.connectTitle = $('connect-title');
    this.assetWarning = $('asset-warning');
    this.inventoryHotbar = $('inventory-hotbar');
    this.optionsMenu = $('options-menu');
    this.creativeBuilt = false;
    this.iconCache = new Map();
    this.draggingSlider = null;
    this.options = { renderDistance: 4, fov: 75, sensitivity: 100, guiScale: 0 };
    this.scale = 1;
    this.quitNotice = null;
    this.debugLines = [];
    this.worlds = [];
    this.servers = [];
    this.selectedWorld = null;
    this.selectedServer = null;
    this.creativeTab = 'blocks';
    this.creativeQuery = '';
    this.craftState = null;
    this.tableState = null;

    this.wire();
    this.applyLabels();
  }

  /** Load the pack's font, its strings and its splash list, then draw everything. */
  async init() {
    try {
      const response = await fetch('./assets/font.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`font.json ${response.status}`);
      setFontMeta(await response.json());
    } catch (err) {
      console.warn('bitmap font unavailable, using a system font', err);
    }

    try {
      const response = await fetch('./assets/strings.json', { cache: 'no-cache' });
      if (response.ok) this.strings = { ...this.strings, ...(await response.json()) };
    } catch (err) {
      console.warn('strings.json unavailable, keeping 1.12.2 fallbacks', err);
    }

    try {
      const response = await fetch('./assets/splashes.json', { cache: 'no-cache' });
      if (response.ok) {
        const list = await response.json();
        if (Array.isArray(list) && list.length) this.splashes = list;
      }
    } catch (err) {
      console.warn('splashes.json unavailable', err);
    }

    this.applyScale();
    this.applyLabels();
    this.renderSplash();
    this.renderOptions();
    this.renderWorlds(this.handlers.getWorlds?.() ?? []);
    this.renderServers(this.handlers.getServers?.() ?? []);
  }

  wire() {
    const on = (id, fn) => $(id)?.addEventListener('click', fn);

    // Chat and command line. T opens this field (see main.js), Enter sends the
    // line and Escape throws it away. stopPropagation keeps the window keydown
    // handler from reading the keys you type as movement -- that handler already
    // bails while the field is open, but stopping here also keeps Escape from
    // falling through to the pause menu.
    this.chatInput?.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        const line = this.chatInput.value;
        this.chatInput.value = '';
        this.closeChat();
        if (line.trim()) this.handlers.onSendChat?.(line);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.chatInput.value = '';
        this.closeChat();
      }
    });

    for (const tab of document.querySelectorAll('.creative-tab')) {
      tab.addEventListener('click', () => this.setCreativeTab(tab.dataset.tab));
    }
    const creativeSearch = $('creative-search');
    creativeSearch?.addEventListener('input', () => {
      this.creativeQuery = creativeSearch.value;
      this.buildCreative();
    });

    on('btn-singleplayer', () => this.handlers.onSingleplayer?.());
    on('btn-multiplayer', () => this.handlers.onMultiplayer?.());
    on('btn-options', () => this.handlers.onOpenOptions?.());
    on('btn-quit-game', () => this.handlers.onQuitGame?.());
    on('btn-back-title', () => this.handlers.onBackToTitle?.());
    on('btn-back-title-servers', () => this.handlers.onBackToTitle?.());

    on('btn-create-world', () => {
      this.handlers.onCreateWorld?.($('new-world-name').value, $('new-world-seed').value);
      $('new-world-name').value = '';
      $('new-world-seed').value = '';
    });
    on('btn-play-world', () => {
      if (this.selectedWorld) this.handlers.onPlayWorld?.(this.selectedWorld);
    });
    on('btn-delete-world', () => {
      if (!this.selectedWorld) return;
      this.handlers.onDeleteWorld?.(this.selectedWorld);
      this.selectedWorld = null;
    });

    on('btn-join-server', () => {
      if (this.selectedServer) this.handlers.onJoinServer?.(this.selectedServer);
    });
    on('btn-delete-server', () => {
      if (!this.selectedServer) return;
      this.handlers.onDeleteServer?.(this.selectedServer);
      this.selectedServer = null;
      this.renderServers(this.handlers.getServers?.() ?? []);
    });
    on('btn-refresh-servers', () => this.renderServers(this.handlers.getServers?.() ?? []));
    on('btn-add-server', () => {
      this.handlers.onAddServer?.($('server-name').value, $('server-address').value);
      $('server-name').value = '';
    });
    on('btn-direct-connect', () => {
      const address = $('server-address').value.trim() || this.selectedServer?.address || '';
      if (address) this.handlers.onJoinServer?.({ id: 'direct', name: address, address });
    });

    on('btn-options-done', () => this.handlers.onBackFromOptions?.());
    on('btn-resume', () => this.handlers.onResume?.());
    on('btn-pause-options', () => this.handlers.onOpenOptions?.());
    on('btn-quit', () => this.handlers.onQuit?.());
    on('btn-cancel-connect', () => this.handlers.onCancelConnect?.());
    on('btn-open-creative', () => this.handlers.onOpenCreative?.());

    // The inventory closes when the world behind the panel is clicked.
    this.screens.inventory?.addEventListener('click', (event) => {
      if (event.target === this.screens.inventory) this.handlers.onCloseInventory?.();
    });
  }

  /** Write every static label in the pack's font. */
  applyLabels() {
    const s = this.strings;
    const put = (id, text, scale) => {
      const el = $(id);
      if (el) setText(el, text, scale ? { scale } : {});
    };
    put('btn-singleplayer', s.singleplayer);
    put('btn-multiplayer', s.multiplayer);
    put('btn-realms', s.realms);
    put('btn-options', s.options);
    put('btn-quit-game', s.quit);
    put('worlds-title', s.selectWorld);
    put('label-world-name', s.worldName);
    put('label-world-seed', s.worldSeed);
    put('btn-play-world', s.playSelected);
    put('btn-create-world', s.createWorld);
    put('btn-edit-world', s.edit);
    put('btn-delete-world', s.delete);
    put('btn-recreate-world', s.recreate);
    put('btn-back-title', s.cancel);
    put('servers-title', s.playMultiplayer);
    put('label-nickname', s.playerName);
    put('label-server-name', s.serverName);
    put('label-server-address', s.serverAddress);
    put('btn-join-server', s.joinServer);
    put('btn-direct-connect', s.directConnect);
    put('btn-add-server', s.addServer);
    put('btn-edit-server', s.edit);
    put('btn-delete-server', s.delete);
    put('btn-refresh-servers', s.refresh);
    put('btn-back-title-servers', s.cancel);
    put('options-title', s.optionsTitle);
    put('btn-options-done', s.done);
    put('pause-title', s.gameMenu);
    put('btn-resume', s.backToGame);
    put('btn-advancements', s.advancements);
    put('btn-statistics', s.statistics);
    put('btn-pause-options', s.options);
    put('btn-quit', s.saveQuit);
    put('pause-footer', 'Minecraft 1.12.2', 1);
    put('btn-cancel-connect', s.cancel);
    put('inventory-title', s.inventory);
    put('btn-open-creative', s.creative);
    put('click-to-play', s.clickToPlay);
    put('title-bottom-left', 'Minecraft 1.12.2', 1);
    put('title-bottom-right', 'Not affiliated with Mojang or Microsoft', 1);
    if (this.debugLines.length) this.setDebug(this.lastDebug ?? '');
    put('connect-title', this.connectTitle?.dataset.text || s.connecting);
    if (this.splashEl && this.splashText) put('splash', this.splashText);
    this.syncListButtons();
  }

  /** The tilted yellow splash under the logo, as the title screen shows it. */
  renderSplash() {
    if (!this.splashEl) return;
    if (!this.splashText) {
      const pool = this.splashes;
      this.splashText = pool[Math.floor(Math.random() * pool.length)] ?? 'Eagler!';
    }
    setText(this.splashEl, this.splashText, { scale: this.scale });
  }

  /** 1.12.2's Auto scale: the biggest of 1..3 whose 320x240 layout fits. */
  autoScale() {
    const fit = Math.min(window.innerWidth / 320, window.innerHeight / 240);
    return Math.max(1, Math.min(3, Math.floor(fit)));
  }

  /** Store the chosen scale (0 = Auto) and relayout the whole interface. */
  setGuiScale(scale) {
    this.options.guiScale = scale;
    this.applyScale();
    this.applyLabels();
    this.renderSplash();
    this.renderOptions();
    this.renderWorlds(this.worlds);
    this.renderServers(this.servers);
    this.renderCreativeHotbar();
    this.setDebug(this.lastDebug ?? '');
    this.setConnectStatus(this.lastStatus ?? '');
  }

  /** Recompute the effective scale; the window resize handler calls this too. */
  applyScale() {
    const chosen = this.options.guiScale;
    this.scale = chosen > 0 ? chosen : this.autoScale();
    document.documentElement.style.setProperty('--gui', String(this.scale));
    setBaseScale(this.scale);
    for (const line of [...this.chatEl.children]) setText(line, line.dataset.text ?? '', { scale: this.scale });
    // Block icons are positioned in pixels from the old scale, so redraw them.
    if (this.sessionHotbar) this.setHotbar(this.sessionHotbar.slots, this.sessionHotbar.selected);
    return this.scale;
  }

  setOptions(options) {
    this.options = { ...this.options, ...options };
    this.setGuiScale(this.options.guiScale);
  }

  renderOptions() {
    if (!this.optionsMenu) return;
    this.optionsMenu.textContent = '';
    for (const row of OPTION_ROWS) {
      const slider = document.createElement('button');
      slider.className = 'mc-slider';
      const label = document.createElement('span');
      label.className = 'mc-text';
      const knob = document.createElement('div');
      knob.className = 'knob';
      slider.append(label, knob);

      const value = this.options[row.key];
      const index = Math.max(0, row.values.indexOf(value));
      const fraction = index / (row.values.length - 1);
      knob.style.left = `calc(${(fraction * 192).toFixed(1)}px * var(--gui))`;
      const shown = row.key === 'guiScale' && value === 0 ? 'Auto' : `${value}${row.suffix}`;
      setText(label, `${this.strings[row.label] ?? row.label}: ${shown}`);

      const setFromPointer = (event) => {
        const rect = slider.getBoundingClientRect();
        if (!rect.width) return;
        const t = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        const value = row.values[Math.round(t * (row.values.length - 1))];
        if (value === this.options[row.key]) return;
        this.options[row.key] = value;
        this.handlers.onOptionsChanged?.({ [row.key]: value });
        if (row.key === 'guiScale') this.setGuiScale(value);
        else this.renderOptions();
      };

      slider.addEventListener('pointerdown', (event) => {
        slider.setPointerCapture?.(event.pointerId);
        this.draggingSlider = slider;
        setFromPointer(event);
      });
      slider.addEventListener('pointermove', (event) => {
        if (this.draggingSlider === slider) setFromPointer(event);
      });
      slider.addEventListener('pointerup', () => { this.draggingSlider = null; });
      slider.addEventListener('pointercancel', () => { this.draggingSlider = null; });

      this.optionsMenu.appendChild(slider);
    }
  }

  /* ── screens ─────────────────────────────────────────────────────────── */

  showScreen(name) {
    for (const [key, element] of Object.entries(this.screens)) {
      element.classList.toggle('active', key === name);
    }
    // The HUD stays visible behind the container screens, as in game.
    this.hud.classList.toggle('visible', name === null || name === 'inventory' || name === 'creative');
    this.setClickToPlay(name === null);
  }

  isInventoryOpen() {
    return (
      (this.screens.inventory?.classList.contains('active') ?? false) ||
      (this.screens.creative?.classList.contains('active') ?? false)
    );
  }

  anyScreenOpen() {
    return Object.values(this.screens).some((element) => element.classList.contains('active'));
  }

  showQuitNotice() {
    this.showScreen('title');
    for (const id of ['btn-singleplayer', 'btn-multiplayer', 'btn-realms', 'btn-options', 'btn-quit-game']) {
      const button = $(id);
      if (button) button.style.display = 'none';
    }
    if (!this.quitNotice) {
      this.quitNotice = document.createElement('div');
      this.quitNotice.className = 'mc-text';
      this.quitNotice.style.marginTop = '24px';
      this.screens.title.appendChild(this.quitNotice);
    }
    setText(this.quitNotice, 'Thanks for playing - reload the page to start again.');
  }

  setAssetWarning(text) {
    if (!this.assetWarning) return;
    setText(this.assetWarning, text || '');
    this.assetWarning.classList.toggle('visible', Boolean(text));
  }

  /* ── selection lists (1.12.2 selects a row, then a button acts on it) ── */

  syncListButtons() {
    const world = this.selectedWorld;
    const server = this.selectedServer;
    if ($('btn-play-world')) $('btn-play-world').disabled = !world;
    if ($('btn-delete-world')) $('btn-delete-world').disabled = !world;
    if ($('btn-join-server')) $('btn-join-server').disabled = !server;
    if ($('btn-delete-server')) $('btn-delete-server').disabled = !server;
  }

  renderWorlds(worlds) {
    this.worlds = worlds;
    const list = $('world-list');
    if (!list) return;
    list.textContent = '';
    this.selectedWorld = null;

    if (!worlds.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      setText(empty, 'No worlds yet - create one below.');
      list.appendChild(empty);
      this.syncListButtons();
      return;
    }

    for (const world of worlds) {
      const item = document.createElement('li');
      const meta = document.createElement('div');
      meta.className = 'meta';
      const name = textElement(world.name, { scale: this.options.guiScale });
      const detail = textElement(
        `${world.edits?.length ?? 0} blocks changed${
          world.lastPlayed ? ` - ${new Date(world.lastPlayed).toLocaleDateString()}` : ''
        }`,
        { scale: Math.max(1, this.options.guiScale - 1) }
      );
      meta.append(name, detail);
      item.appendChild(meta);

      const select = () => {
        this.selectedWorld = world;
        for (const row of list.children) row.classList.toggle('selected', row === item);
        this.syncListButtons();
      };
      item.addEventListener('click', select);
      item.addEventListener('dblclick', () => this.handlers.onPlayWorld?.(world));
      list.appendChild(item);
    }
    this.syncListButtons();
  }

  renderServers(servers) {
    this.servers = servers;
    const list = $('server-list');
    if (!list) return;
    list.textContent = '';
    this.selectedServer = null;

    if (!servers.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      setText(empty, 'No servers yet - add one below.');
      list.appendChild(empty);
      this.syncListButtons();
      return;
    }

    for (const server of servers) {
      const item = document.createElement('li');
      const meta = document.createElement('div');
      meta.className = 'meta';
      const name = textElement(server.name, { scale: this.options.guiScale });
      const detail = textElement(server.address, { scale: Math.max(1, this.options.guiScale - 1) });
      meta.append(name, detail);
      item.appendChild(meta);

      const select = () => {
        this.selectedServer = server;
        for (const row of list.children) row.classList.toggle('selected', row === item);
        this.syncListButtons();
      };
      item.addEventListener('click', select);
      item.addEventListener('dblclick', () => this.handlers.onJoinServer?.(server));
      list.appendChild(item);
    }
    this.syncListButtons();
  }

  getNickname() {
    return $('nickname').value.trim() || 'Player';
  }

  /* ── connect log ─────────────────────────────────────────────────────── */

  setConnectTitle(text) {
    if (!this.connectTitle) return;
    this.connectTitle.dataset.text = text;
    setText(this.connectTitle, text);
  }

  setConnectStatus(text) {
    this.lastStatus = text;
    if (this.connectStatus) setText(this.connectStatus, text);
  }

  clearConnectLog() {
    if (this.connectLog) this.connectLog.textContent = '';
  }

  log(line) {
    if (!this.connectLog) return;
    const stamp = new Date().toLocaleTimeString([], { hour12: false });
    const row = textElement(`${stamp}  ${line}`, { scale: 1 });
    this.connectLog.appendChild(row);
    this.connectLog.scrollTop = this.connectLog.scrollHeight;
  }

  /* ── chat / debug ────────────────────────────────────────────────────── */

  appendChat(text) {
    const line = textElement(text, { scale: this.options.guiScale });
    line.dataset.text = text;
    this.chatEl.appendChild(line);
    while (this.chatEl.childElementCount > 10) this.chatEl.firstElementChild.remove();
  }

  clearChat() {
    this.chatEl.textContent = '';
  }

  setDebug(text) {
    this.lastDebug = text;
    if (!this.debugEl) return;
    const lines = String(text).split('\n');
    while (this.debugLines.length < lines.length) {
      const row = document.createElement('div');
      row.className = 'mc-text';
      this.debugEl.appendChild(row);
      this.debugLines.push(row);
    }
    for (let i = 0; i < lines.length; i++) setText(this.debugLines[i], lines[i], { scale: 1 });
    while (this.debugLines.length > lines.length) this.debugLines.pop().remove();
  }

  /* ── HUD ─────────────────────────────────────────────────────────────── */

  /**
   * 1.12.2's item renderer draws a block as a small isometric cube, not as one
   * flat tile. Compose it from the block's own atlas tiles — a 16x16 rhombus for
   * the top face with two shaded sides under it — and cache the result per block.
   */
  blockIcon(id) {
    if (this.iconCache.has(id)) return this.iconCache.get(id);
    const atlas = getAtlas();
    const image = getAtlasImage();
    if (!atlas || !image) return null;

    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;

    const source = (slot) => {
      const tile = tileFor(id, slot);
      if (!tile) return null;
      return [tile[0] * atlas.tileSize, tile[1] * atlas.tileSize, atlas.tileSize, atlas.tileSize];
    };

    // Paint one tile into the parallelogram origin + u*a + v*b, then darken it.
    const face = (rect, origin, u, v, shade) => {
      if (!rect) return;
      ctx.setTransform(u[0], u[1], v[0], v[1], origin[0], origin[1]);
      ctx.drawImage(image, rect[0], rect[1], rect[2], rect[3], 0, 0, 1, 1);
      if (shade > 0) {
        ctx.fillStyle = `rgba(0,0,0,${shade})`;
        ctx.fillRect(0, 0, 1, 1);
      }
    };

    const top = source('top');
    const side = source('side');

    if (!top) {
      const [r, g, b] = blockColor(id).map((c) => Math.round(c * 255));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, size, size);
    } else if (FLAT_BLOCKS.has(id)) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(image, top[0], top[1], top[2], top[3], 0, 0, size, size);
    } else {
      // Glass and ice are mostly transparent tiles. A faint frosted backing keeps
      // the cube reading as a block instead of a hollow outline, which is how the
      // 1.12.2 item renderer presents a translucent block.
      if (BLOCKS.get(id)?.transparent) {
        for (const [origin, u, v] of CUBE_FACES) {
          ctx.setTransform(u[0], u[1], v[0], v[1], origin[0], origin[1]);
          ctx.fillStyle = 'rgba(232, 246, 255, 0.55)';
          ctx.fillRect(0, 0, 1, 1);
        }
      }
      // Same order and shading as the world mesher: top brightest, the left side
      // a little darker, the right side darker still.
      face(top, ...CUBE_FACES[0], 0);
      face(side ?? top, ...CUBE_FACES[1], 0.2);
      face(side ?? top, ...CUBE_FACES[2], 0.35);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const url = canvas.toDataURL('image/png');
    this.iconCache.set(id, url);
    return url;
  }

  /**
   * Icons for things that are not blocks: the item's own 16x16 icon out of the
   * atlas, drawn as a flat sprite the way 1.12.2 draws items in a slot.
   */
  itemIcon(id) {
    if (this.iconCache.has(id)) return this.iconCache.get(id);
    if (!isItemId(id)) return this.blockIcon(id);
    const atlas = getAtlas();
    const image = getAtlasImage();
    if (!atlas || !image) return null;
    const key = itemTileKey(id);
    const tile = key ? atlas.tiles[key] : null;
    if (!tile) return null;

    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      tile[0] * atlas.tileSize,
      tile[1] * atlas.tileSize,
      atlas.tileSize,
      atlas.tileSize,
      0,
      0,
      size,
      size
    );
    const url = canvas.toDataURL('image/png');
    this.iconCache.set(id, url);
    return url;
  }

  iconStyle(el, id) {
    const url = this.itemIcon(id);
    if (!url) return;
    // The icon already has the right shape at 16x16, so it just fills the slot.
    el.style.backgroundImage = `url("${url}")`;
    el.style.backgroundSize = '100% 100%';
    el.style.backgroundPosition = '0 0';
    el.style.backgroundRepeat = 'no-repeat';
  }

  /** One hotbar/inventory slot: the block's icon, its stack size, a click target. */
  slotElement(entry, index, selected, className) {
    const element = document.createElement('div');
    element.className = `${className}${index === selected ? ' active' : ''}`;
    const icon = document.createElement('div');
    icon.className = 'icon';
    if (entry?.id) {
      this.iconStyle(icon, entry.id);
      icon.title = itemName(entry.id);
    }
    element.append(icon);
    // 1.12.2 hides the counter on single items and on empty slots.
    if (entry?.count > 1) {
      const badge = document.createElement('span');
      badge.className = 'count';
      setText(badge, String(entry.count), { scale: 1 });
      element.append(badge);
    }
    element.addEventListener('click', () => this.handlers.onSelectSlot?.(index));
    return element;
  }

  setHotbar(slots, selected) {
    this.sessionHotbar = { slots, selected };
    this.hotbarEl.textContent = '';
    slots.forEach((entry, index) => {
      this.hotbarEl.appendChild(this.slotElement(entry, index, selected, 'slot'));
    });
    this.renderBars();
    this.renderInventory();
    this.renderCreativeHotbar();
    this.renderInventoryCraft();
  }

  /**
   * 1.12.2's bars: ten icons of two points each, so an odd value leaves the last
   * heart or drumstick half drawn (the icons.png sprite cropped to 50%).
   */
  renderBars(health = this.bars.health, food = this.bars.food) {
    this.bars = { health, food };
    if (this.heartsEl && !this.heartsEl.childElementCount) {
      for (let i = 0; i < 10; i++) {
        const heart = document.createElement('div');
        heart.className = 'hud-icon heart';
        heart.appendChild(document.createElement('i'));
        this.heartsEl.appendChild(heart);
      }
    }
    if (this.hungerEl && !this.hungerEl.childElementCount) {
      for (let i = 0; i < 10; i++) {
        const hunger = document.createElement('div');
        hunger.className = 'hud-icon food';
        hunger.appendChild(document.createElement('i'));
        this.hungerEl.appendChild(hunger);
      }
    }
    const key = `${health}|${food}`;
    if (key !== this.barKey) {
      this.barKey = key;
      this.applyBarState(this.heartsEl, health);
      this.applyBarState(this.hungerEl, food);
    }
    if (this.xpFill) this.xpFill.style.width = '0%';
  }

  applyBarState(container, value) {
    if (!container) return;
    [...container.children].forEach((icon, index) => {
      const remaining = value - index * 2;
      icon.classList.toggle('half', remaining === 1);
      icon.classList.toggle('empty', remaining < 1);
    });
  }

  /** How far through the block being mined we are, 0..1. Zero hides the bar. */
  setMining(progress) {
    const bar = $('mine-progress');
    const fill = $('mine-progress-fill');
    if (!bar || !fill) return;
    const value = Math.max(0, Math.min(1, progress || 0));
    bar.classList.toggle('visible', value > 0.01);
    fill.style.width = `${value * 100}%`;
  }

  /** Creative and spectator hide the health/hunger bars, as 1.12.2 does. */
  setGamemode(mode) {
    this.gamemode = mode;
    const survival = mode === 'survival' || mode === 'adventure';
    if (this.hudIcons) this.hudIcons.style.display = survival ? '' : 'none';
    if (this.xpBar) this.xpBar.style.display = survival ? '' : 'none';
    const creative = $('btn-open-creative');
    if (creative) creative.style.display = mode === 'creative' ? '' : 'none';
  }

  showInventory(slots, selected) {
    this.sessionHotbar = { slots, selected };
    this.renderInventory();
    this.renderInventoryCraft();
    this.showScreen('inventory');
  }

  /** Remember the 2x2 grid and redraw it; main.js owns the grid itself. */
  setCraftState(craftState) {
    this.craftState = craftState;
    this.renderInventoryCraft();
  }

  setTableState(tableState) {
    this.tableState = tableState;
    this.renderTableCraft();
  }

  /** Fill a crafting grid and its result slot. Grid cells are click targets. */
  renderCraft(containerId, resultId, state, size) {
    const container = $(containerId);
    if (container && state?.grid) {
      container.textContent = '';
      state.grid.forEach((cell, index) => {
        const element = document.createElement('div');
        element.className = 'craft-slot';
        const icon = document.createElement('div');
        icon.className = 'icon';
        if (cell?.id) {
          this.iconStyle(icon, cell.id);
          icon.title = itemName(cell.id);
        }
        element.append(icon);
        if (cell?.count > 1) {
          const badge = document.createElement('span');
          badge.className = 'count';
          setText(badge, String(cell.count), { scale: 1 });
          element.append(badge);
        }
        element.addEventListener('click', () => this.handlers.onCraftSlot?.(index, size));
        container.appendChild(element);
      });
    }

    const resultEl = $(resultId);
    if (!resultEl) return;
    resultEl.textContent = '';
    if (state?.result?.id) {
      const icon = document.createElement('div');
      icon.className = 'icon';
      this.iconStyle(icon, state.result.id);
      icon.title = `${itemName(state.result.id)} x${state.result.count}`;
      resultEl.append(icon);
    }
    resultEl.onclick = () => this.handlers.onCraftResult?.(size);
  }

  renderInventoryCraft() {
    this.renderCraft('inventory-craft', 'inventory-result', this.craftState, 2);
  }

  renderTableCraft() {
    this.renderCraft('crafting-grid', 'crafting-result', this.tableState, 3);
  }

  showCrafting(slots, selected) {
    this.sessionHotbar = { slots, selected };
    const bar = $('crafting-hotbar');
    if (bar) {
      bar.textContent = '';
      slots.forEach((entry, index) => bar.appendChild(this.slotElement(entry, index, selected, 'inv-slot')));
    }
    const title = $('crafting-title');
    if (title) setText(title, this.strings.crafting ?? 'Crafting');
    this.renderTableCraft();
    this.showScreen('crafting');
  }

  /**
   * The creative palette. Two tabs -- every block, then every item the pack
   * ships -- with the filter box narrowing either, one click to the held slot.
   */
  buildCreative() {
    const grid = $('creative-grid');
    if (!grid) return;
    const ids = this.handlers.getCreativeIds?.(this.creativeTab, this.creativeQuery) ?? [];
    grid.textContent = '';
    for (const id of ids) {
      const button = document.createElement('button');
      button.className = 'block';
      const icon = document.createElement('div');
      icon.className = 'icon';
      this.iconStyle(icon, id);
      icon.title = itemName(id);
      button.append(icon);
      button.addEventListener('click', () => this.handlers.onPickBlock?.(id));
      grid.appendChild(button);
    }
    grid.scrollTop = 0;
  }

  setCreativeTab(tab) {
    this.creativeTab = tab === 'items' ? 'items' : 'blocks';
    for (const button of document.querySelectorAll('.creative-tab')) {
      button.classList.toggle('active', button.dataset.tab === this.creativeTab);
    }
    this.buildCreative();
  }

  showCreative(slots, selected) {
    this.sessionHotbar = { slots, selected };
    this.setCreativeTab(this.creativeTab ?? 'blocks');
    this.renderCreativeHotbar();
    this.showScreen('creative');
  }

  renderCreativeHotbar() {
    const bar = $('creative-hotbar');
    if (!bar || !this.sessionHotbar) return;
    const { slots, selected } = this.sessionHotbar;
    bar.textContent = '';
    slots.forEach((entry, index) => {
      bar.appendChild(this.slotElement(entry, index, selected, 'inv-slot'));
    });
  }

  /** Toast notification in the pack's own frame. */
  toast(message) {
    const container = $('toasts');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.appendChild(textElement(message, { scale: Math.max(1, this.options.guiScale - 1) }));
    container.appendChild(toast);
    while (container.childElementCount > 4) container.firstElementChild.remove();
    setTimeout(() => toast.remove(), 3200);
  }

  renderInventory() {
    if (!this.inventoryHotbar || !this.sessionHotbar) return;
    const { slots, selected } = this.sessionHotbar;
    this.inventoryHotbar.textContent = '';
    slots.forEach((entry, index) => {
      this.inventoryHotbar.appendChild(this.slotElement(entry, index, selected, 'inv-slot'));
    });
  }

  setClickToPlay(visible) {
    this.clickToPlay.classList.toggle('visible', Boolean(visible));
  }

  openChat() {
    this.chatInput.classList.add('open');
    this.chatInput.focus();
  }

  closeChat() {
    this.chatInput.classList.remove('open');
    this.chatInput.blur();
  }

  isChatOpen() {
    return this.chatInput.classList.contains('open');
  }

  measure(text) {
    return measureText(text);
  }
}
