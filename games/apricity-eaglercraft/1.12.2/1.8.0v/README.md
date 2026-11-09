# Apricity Eagler — our own playable client

Our own browser client for Eaglercraft: **1.12.2's menus, HUD and containers**
rebuilt on our own engine, plus singleplayer worlds and direct multiplayer. Every
pixel of art and every label comes from the 1.12.2 asset pack embedded in this
site's own client file (`games/mc.html`); none of its Java/TeaVM runner is used.
It does **not** use a relay server, a proxy, or any back-end of ours — joining a
server is exactly one WebSocket to that server's own endpoint.

```
you ─── wss://the-server-you-picked/ ───► that server
```

## Play it

`games/apricity-eaglercraft/index.html` is the launcher: it lists one Minecraft
version (**1.12.2**) and the game builds inside it (**1.8.0v**) and opens the one
you pick. This folder *is* that 1.8.0v build, so you can also serve it on its own:

```bash
node games/apricity-eaglercraft/1.12.2/1.8.0v/serve.mjs   # static server, then open the printed URL
```

- **Singleplayer** — generates biomes, caves, ores and vegetation from a seed,
  spawns you on dry land, and saves the seed plus the blocks you changed to
  `localStorage`.
- **Multiplayer** — join `mc.arch.lol`, `wss://clever-teaching.com`, or add any
  Eaglercraft (EaglerXServer) address as `host`, `host:port` or a `wss://` URL.
  Chat works, including commands like `/register` and `/login`.

| Control | Action |
| --- | --- |
| WASD / arrows | walk |
| Space | jump, swim up, or fly up |
| Shift | sprint, or fly down while flying |
| F | toggle flight (creative and spectator only) |
| E | open or close the inventory, a crafting table or the palette |
| / or T | chat line; `/` arrives with the slash already typed, so commands are one key away |
| Q | drop the held stack, or what the cursor carries (Ctrl+Q drops one item) |
| Mouse | look (click the canvas to capture the mouse) |
| Left click | break block (singleplayer and servers); hold to keep breaking as the block goes |
| Right click | place the selected block; hold to place once every four ticks (singleplayer and servers) |
| 1–9, mouse wheel | pick hotbar slot |
| T | chat / command input |
| Escape | close a container, else the pause menu (save and quit) |

## Textures and GUI — all of it from the pack

Nothing is drawn by hand and nothing is downloaded at runtime. `tools/epk.mjs`
unpacks the `EAGPKG$$` containers and `tools/build-assets.mjs` bakes the results
into `assets/`:

| File | What it is |
| --- | --- |
| `assets/atlas.png` | 164 block and 412 item tiles (16×16) in one 256×576 sheet — every tile decoded from the pack |
| `assets/atlas.json` | tile size, sheet size, and every texture key → `[column, row]` |
| `assets/gui-widgets.png` | the pack's complete `widgets.png` GUI sheet |
| `assets/gui-hotbar.png` / `gui-hotbar-select.png` | hotbar strip and slot highlight |
| `assets/gui-button*.png` | 1.12.2 `widgets.png` rows at y=46 / 66 / 86 |
| `assets/gui-slider.png` / `gui-slider-knob.png` | the slider track and its 8×20 handle |
| `assets/gui-creative.png` | the 195×136 creative panel from `tab_inventory.png` |
| `assets/gui-toast.png` | a 160×32 toast frame |
| `assets/strings.json` | menu labels read from the pack's `en_us.lang` |
| `assets/splashes.json` | the pack's 44 splash texts, verbatim |
| `assets/gui-menu-bg.png` | the pack's dirt background, tiled behind every menu |
| `assets/title-bg.png` | the pack's title-screen panorama |
| `assets/gui-logo.png` | the real 274×44 Minecraft wordmark (see below) |
| `assets/gui-icons.png` | the HUD sheet: hearts, hunger, XP bar |
| `assets/gui-inventory.png` | the 176×166 inventory panel |
| `assets/hud-xp-bg.png` / `hud-xp-fill.png` | the XP bar sliced out of that sheet |
| `assets/font.png` + `font.json` | the pack's 8×8 bitmap font, with measured glyph advances |
| `assets/sounds/*.ogg` | the pack's dig samples: four variants each for stone, wood, grass, sand, gravel, cloth and snow, plus the UI click |
| `assets/mob/*.png` | the pack's own 64×32 animal skins, copied as-is: `pig`, `cow`, `sheep`, `sheep_fur`, `chicken`, `rabbit` |
| `assets/mob-atlas.png` + `mob-atlas.json` | those skins stacked into one sheet for the animal renderer, with each animal's slot |

1.12.2 stores grass, leaves, vines and lily pads as **greyscale** and colours
them with the biome colour while drawing — which is why those tiles used to
render grey here. `tools/build-assets.mjs` now bakes the plains colours into the
atlas (`#91bd59` grass, `#77ab2f` foliage) and composes a grass block's side
from `grass_side` plus the tinted `grass_side_overlay`, instead of showing bare
dirt with a grey band. `node tools/atlas-report.mjs` prints every tile's mean
colour and coverage, so a tile that is grey when it should not be is one command
away from being spotted (glass reports as 28% solid light blue, leaves as grey
before the tint and green after).

The interface uses those sprites at Minecraft's own pixel scale and pixel
offsets: buttons are the 200×20 widget sprite, the hotbar is 182×22, the
inventory panel is its native 176×166 with slots on an 18px pitch from (8,141),
the creative panel is 195×136 with its item grid from (9,53), and hearts, hunger
and the XP bar are cut from `icons.png` at 1.12.2's own coordinates (16,0)/(52,0)
and (16,27)/(52,27), XP bar at (0,64) and (0,69). Everything is
`image-rendering: pixelated` so the art stays sharp.

GUI scale follows 1.12.2: the setting is **Auto** by default and picks the
largest of 1–3 whose 320×240 layout still fits the window, recomputed on resize.

`title/minecraft.png` stores 1.12.2's single 274×44 wordmark as two rows (155 px
and 119 px) because the sheet is only 256 wide, so the build stitches the halves
back into the one-line logo the title screen draws.

Every piece of text is the pack's 8×8 bitmap font (`js/mcfont.js`): each glyph is
an element whose mask is its cell in `font.png` and whose background is the
current colour, which is how the game itself tints its font. Advance widths are
measured from the glyph sheet at build time and stored in `font.json`, so
spacing is the game's, not a web font's approximation. Text keeps the classic
single-pixel drop shadow via `filter: drop-shadow`.

### Screens

| Screen | Contents |
| --- | --- |
| Title | pack panorama, stitched wordmark, a tilted yellow splash from `splashes.txt`, Singleplayer / Multiplayer / Minecraft Realms (disabled) / Options... / Quit Game, "Minecraft 1.12.2" footer |
| Select World | 1.12.2 layout: selecting a slot enables Play Selected World / Delete, with Create New World, Edit and Re-Create as in the game, plus world name and seed fields |
| Play Multiplayer | 1.12.2 layout: 150px Connect / Direct Connect above four 74px Add Server / Edit / Delete / Refresh buttons, Cancel below, player name and address fields |
| Options | render distance, FOV, sensitivity and **GUI Scale: Auto** as draggable sliders on the pack's slider track and 8px handle, persisted and applied live |
| Game Menu | Back to Game, Advancements, Statistics, Options..., Save and Quit to Title |
| Inventory | the pack's 176×166 inventory panel with your hotbar blocks at (8,141), world still visible behind it |
| Creative | the pack's 195×136 creative panel with all 70 blocks; click one to load it into the selected hotbar slot |
| In-game HUD | hotbar with block icons and stack counts, live hearts and hunger drumsticks, XP bar, crosshair, chat, F3-style debug |
| Toasts | notifications in the pack's toast frame (world saved, server joined, block picked) |

Rebuilding is one command — the builder inflates the 1.12.2 pack straight out
of `games/mc.html` (and falls back to the 0.2.0 / 0.1.0 packs that ship with the
site for anything 1.12.2 leaves out), so no extraction directories are needed:

```bash
cd games/apricity-eaglercraft/1.12.2/1.8.0v && node tools/build-assets.mjs
```

To read a pack by hand:

```bash
node tools/epk.mjs ../mc.html --from-html --list textures/gui
node tools/epk.mjs ../mc.html --from-html --extract assets/raw112 textures/gui
```

The decoder (`tools/png.mjs`) handles every format the pack uses: 1/2/4/8/16-bit
greyscale, RGB, palette (`tRNS` too), grey+alpha and RGBA. Animated strips are
reduced to their first frame and every tile is normalised to 16×16 before it goes
into the atlas, so no texture can spill into its neighbours.

If the assets are missing the client still runs and falls back to shaded block
colours, with a warning on the title screen.

## Status

| Area | State |
| --- | --- |
| Direct WebSocket transport, address parsing | done |
| Eaglercraft handshake v3 / v4 / v5 negotiation | done |
| Login: offline (username only), EAGLER_SHA256, AuthMe, plaintext | done |
| Play state: keepalive, join game, compression, packet log | done |
| 1.12.2 menus: title + splash, select world, play multiplayer, game menu | done |
| 1.12.2 HUD and containers: hearts/hunger/XP, hotbar, inventory, creative | done |
| Singleplayer commands behind the T key: `/help`, `/seed`, `/tp`, `/spawn`, `/kill`, `/setblock`, `/fill`, `/give <block\|item> [count]`, `/clear`, `/gamemode`, `/heal`, `/feed` | done |
| Every block id 1.12.2 has, with the pack's textures, its hardness and the tool tier it needs | done |
| Items: the pack's whole item set as real stacks — 412 items named out of `en_us.lang` | done |
| Crafting: the inventory's 2x2 and a crafting table's 3x3, 59 shaped and 15 shapeless 1.12.2 recipes | done |
| Drops: ores give their mineral, leaves give saplings/apples/sticks, stone needs a pickaxe, shears cut plants | done |
| Mining: hold to break, speed follows hardness and tool tier, progress bar under the crosshair | done |
| Creative menu: Blocks and Items tabs with a search box, one click to the held slot | done |
| Game modes: survival, creative, adventure, spectator — flight, clipping, breaking, endless blocks | done |
| Health and hunger: 1.12.2 exhaustion costs, regeneration, starvation, fall damage | done |
| Starting inventory: empty hotbar in survival, palette in creative, stacks of 64 with a slot counter | done |
| Dropped items: blocks tumble as spinning cubes, everything else as its flat icon, and you walk over them to collect | done |
| 1.12.2 strings and splash texts from the pack's `en_us.lang` / `splashes.txt` | done |
| Textures: 164 block and 412 item tiles plus every GUI sprite, straight out of the 1.12.2 pack | done |
| Singleplayer: biomes, caves, ores, trees, saves, land spawn, break/place | done |
| Multiplayer: chunks, position sync, walking, chat | done |
| Multiplayer block editing: `0x07` dig + `0x08` place, byte-checked against a local mock server | done |
| Break and place sounds, grouped by block material, from the pack's `sounds/dig` | done |
| MOTD pings in the server list | **not yet** |
| Skins, capes, other players and mobs | **not yet** |
| Block metadata, so the colour and wood variants (16 wools, 6 planks, 6 saplings) collapse to one block each | **not yet** |
| The destroy-stage crack overlay: mining reports progress with a bar instead of baked cracks | **not yet** |

## Files

```
index.html          menus, HUD, hotbar, chat markup and styles
assets/             atlas + copied GUI art
js/main.js          app state machine, input, render loop, saves, asset load
js/ui.js            every screen and the HUD, driven by the pack's font
js/mcfont.js        the pack's 8x8 bitmap font, rendered as CSS masks
js/handshake.js     the protocol state machine (the actual client)
js/multiplayer.js   play-packet decoding and outbound movement/chat
js/blocks.js        block table, per-face texture keys, hardness, atlas lookup
js/registry.js      one id space for blocks and items, from assets/registry.json
js/drops.js         1.12.2 drop table and harvest rules, keyed by block semantics
js/recipes.js       the crafting book: shaped patterns and shapeless bags
js/crafting.js      the 2x2 / 3x3 grid as data: put, take, consume, craft
js/world.js         chunk storage, biomes/caves/ores generation, spawn, edits
js/mesher.js        chunk -> textured triangles
js/renderer.js      WebGL renderer, one buffer per chunk, alpha-tested atlas
js/player.js        AABB collision, walking/flying, voxel raycast
js/sound.js         break/place sounds, grouped by block material
js/commands.js      singleplayer chat commands, handled locally
js/gamemode.js      the four game modes and what each one may do
js/inventory.js     stack-based hotbar: add, take, fill, count
js/survival.js      health, hunger, exhaustion, regeneration, fall damage
js/items.js         dropped items: gravity, resting, pickup, spin for the renderer
js/address.js       turns "host", "host:port" or a URL into one wss:// endpoint
js/bytes.js         big-endian Reader/Writer, varint, UUID formatting
js/sha256.js        dependency-free SHA-256 (needed for the login hash)
js/auth.js          EAGLER_SHA256 / AuthMe hashes, per-server auth dispatch
js/compression.js   zlib in/out once a server enables compression
tools/epk.mjs       Eaglercraft .epk reader/extractor
tools/png.mjs       PNG decode/encode for every bit depth the pack uses
tools/build-assets.mjs  packs -> atlas.png + atlas.json + GUI art + sounds
tools/entity-textures.mjs  packs -> assets/mob/*.png + mob-atlas.png + mob-atlas.json
tools/atlas-report.mjs  per-tile colour and coverage (finds untinted grey tiles)
serve.mjs           loopback static server
test/               headless checks: a local mock server, live servers, saves
```

## World generation

`js/world.js` is seeded value noise only, no server involvement:

- Broad continent noise plus a ridged mountain term for the height field.
- Temperature and humidity noise pick beach / desert / forest / plains / snow.
- 3D noise carves two scales of caves below the surface.
- Ores scatter by depth (coal, iron, gold, lapis, redstone, diamond).
- Trees in forest and plains, spruce in snow, cacti in desert; oceans fill to sea
  level and freeze over in snow biomes.
- `findSpawn()` walks outward from the origin until it finds grass, dirt, sand or
  snow above sea level, so a new world never starts on the sea surface.

Generation runs inside the chunk-mesh budget, so walking never blocks a frame;
a chunk costs roughly 9 ms.

## Rendering notes

- Each block face becomes two triangles (six vertices). Drawing four-vertex
  quads with `gl.TRIANGLES` stitches each quad into the next block — that was
  the source of the giant stretched triangles.
- Transparent blocks skip the faces they share with themselves, so an ocean is a
  single surface instead of a lattice of internal water planes; water's top sits
  at 0.9 of the block, lava stays full.
- Water gets its own batch per chunk and a second, alpha-blended pass after the
  opaque world (depth writes off), so it looks like water rather than solid blue
  stone. Lava stays in the opaque batch, as in 1.12.2.
- Sides are shaded darker than tops so blocks read as 3D, textures are sampled
  with `NEAREST`, and `alpha < 0.1` fragments are discarded (leaves, glass).
- Hotbar, inventory and creative icons are composed at runtime from a block's
  own top and side tiles into a small isometric cube with the same shading,
  which is how 1.12.2's item renderer draws a block; flat blocks (sapling, torch,
  rail, wheat...) keep their plain sprite.

## Survival

A new world starts in **survival with an empty hotbar**: you mine your first
blocks by hand, they fall out of the world, and you walk over them to collect
them. The numbers are 1.12.2's own:

- 20 health, 20 food, 5 saturation.
- Exhaustion of 0.01 per metre walked, 0.1 per metre sprinted, 0.05 per jump,
  0.005 per block broken and 0.3 per hit taken. Four exhaustion points consume
  one saturation first, then one food.
- Regeneration from 18 food upward: one health every four seconds, which itself
  costs food.
- Starvation damages you down to half a heart and stops there, as on Normal.
- Fall damage starts after three free blocks: `floor(distance - 3)`.
- Death drops the whole hotbar where you died and respawns you at the world
  spawn; those drops are still lying there if you go back for them.

`/gamemode` switches all four modes, with the short forms 1.12.2 accepts
(`/gamemode 1`, `/gamemode c`, `/gamemode sp`):

| Mode | Flight | Break / place | Drops | Health and hunger |
| --- | --- | --- | --- | --- |
| survival | no | yes / yes | yes | yes |
| creative | yes | yes / yes, endless blocks | no | bars hidden, no damage |
| adventure | no | no / no | yes | yes |
| spectator | yes | no / no, and walks through blocks | no | bars hidden, no damage |

Creative fills empty hotbar slots from the block palette so you can build
immediately; survival keeps only what you actually picked up. Stacks cap at 64
and the slot draws the count, as the real HUD does. Spectator also turns off
collision (`noClip`), so you can fly straight through terrain.

Health, hunger and the hotbar live for the session: only the seed, your edits and
that world's game mode are written to `localStorage`.

## The protocol, as implemented

Everything below is over WebSocket **binary frames**.

```
C→S 0x01  u8 legacy version, u16 count + eagler protocols, u16 count + mc
          protocols, brand, client version, has-password, username
S→C 0x02  eagler protocol, mc protocol, brand, auth method, salt
C→S 0x04  username, requested server, password bytes, cookie flags, capabilities
S→C 0x05  assigned username + UUID
C→S 0x07 / 0x08   profile data (optional) and finish login
S→C 0x09  play state begins
```

Play packets the game uses:

- `0x00` KeepAlive — echoed back, or the server drops us.
- `0x01` JoinGame — entity id, gamemode, dimension.
- `0x08` PlayerPositionAndLook — spawn position, reconciled on every send.
- `0x21` ChunkData — `i32 x, i32 z, bool groundUp, u16 mask, varint size`, then
  per set section `4096` little-endian `ushort` of `(id << 4 | meta)`, `2048`
  block light, `2048` sky light, then `256` biome bytes.
- `0x26` MapChunkBulk — **not** the vanilla 1.8 field order on Eaglercraft
  servers: `u8 flags (bit 0 = sky light)`, `varint column count`, then per column
  `i32 x, i32 z, u16 mask`, then the same per-column payload as `0x21`.
  `test/chunk-layout.mjs` derives this by requiring a byte-exact structural fit.
- `0x02` ChatMessage — flattened JSON to plain text.
- `0x23` BlockChange — unpacked position plus block state.

Outbound: `0x15` client settings, `0x17` brand, `0x06` position, `0x01` chat,
`0x07` PlayerDigging, `0x08` BlockPlacement, `0x09` HeldItemChange.

Editing a block sends what a 1.8 client sends, so a server treats us like one:

- `0x07` — status byte (`0` started, `2` finished), the block position packed
  into one long (26 bits x, 12 y, 26 z), then the face (`0` -Y … `5` +X). A
  break is two of these, started then finished.
- `0x08` — the position long, the face, the held stack inline (short item id,
  byte count, short damage, empty NBT compound) and the cursor position on that
  face as three bytes scaled by 16. The cursor matters: servers use it to orient
  logs, stairs and slabs.
- `0x09` — the held slot as a short, sent whenever the hotbar selection moves.

Edits stay optimistic locally and `0x23` BlockChange remains the server's word
on what the world actually contains; a server world never records edits into
`localStorage`.

An unparseable play packet is logged and skipped rather than dropping the
connection.

## Test it

```bash
node test/protocol-test.mjs                     # handshake + login, live server
node test/multiplayer-test.mjs mc.arch.lol      # chunks + position arrive
node test/chunk-layout.mjs mc.arch.lol          # proves the bulk chunk layout
node test/chunk-21.mjs mc.arch.lol              # proves the 0x21 chunk layout
node test/multiplayer-edit.test.mjs             # dig/place bytes, local mock server
node test/commands.test.mjs                     # singleplayer command behaviour
node test/survival.test.mjs                     # health, hunger, stacks, dropped items
node test/mesher-water.test.mjs                  # water geometry is its own batch
node tools/atlas-report.mjs leaves grass         # a tile's colour and coverage
node test/world-save.test.mjs                   # save/load round trip
node tools/build-assets.mjs                     # rebuild textures
```

`test/mock-server.mjs` is the server the edit checks run against: one WebSocket
endpoint, the login handshake and a chunk of stone, recording every packet the
client sends. Run it on its own with `node test/mock-server.mjs` and it prints
the raw bytes of each packet, which is how the `0x07` / `0x08` layouts above
were confirmed without touching a live server.

## Notes

- Offline ("cracked") login is the default: no password is sent unless the
  server's handshake asks for one. Servers that require registration say so in
  chat — type `/register <password> <password>` or `/login <password>` with `T`.
- Servers behind plain `ws://` cannot be reached from an `https://` page; the
  browser blocks mixed content. Use a `wss://` server.
- Browsers cannot open raw TCP sockets, so a plain Java Minecraft server with no
  Eaglercraft plugin can never be joined from a browser by any client.
- We run 1.12.2's *assets*, not its code: its compiled `classes.js` (the TeaVM
  Java runner) is what we deliberately do not use, so the game underneath is our
  own hand-written engine.
- The title footer says "Not affiliated with Mojang or Microsoft" instead of
  copying 1.12.2's copyright line, which would be a false claim on a clone.
