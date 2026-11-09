// Headless multiplayer check: joins a real Eaglercraft server with the same
// session code the browser uses and reports whether chunks and a player
// position actually arrived.
//
//   node test/multiplayer-test.mjs mc.arch.lol

import { World } from '../js/world.js';
import { MultiplayerSession } from '../js/multiplayer.js';

const address = process.argv[2] || 'mc.arch.lol';

const world = new World({ generate: false });
const stats = {
  chunks: 0,
  solidColumns: 0,
  teleport: null,
  chat: [],
  kicked: null,
  blocks: 0,
};

const session = new MultiplayerSession({
  address,
  username: 'ApricityTest',
  world,
  handlers: {
    onLog: () => {},
    onStatus: (text) => console.log(`  status: ${text}`),
    onChat: (text) => {
      stats.chat.push(text);
      console.log(`  chat: ${text}`);
    },
    onChunk: () => {
      stats.chunks++;
    },
    onTeleport: (pos) => {
      stats.teleport = pos;
      console.log(`  teleport: ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}`);
    },
    onBlockChange: () => {
      stats.blocks++;
    },
    onJoin: (info) => console.log(`  joined: entity ${info?.entityId}`),
    onKick: (reason) => {
      stats.kicked = reason;
      console.log(`  kicked: ${reason}`);
    },
  },
});

session.connect();

setTimeout(() => {
  const keys = [...world.chunks.keys()];
  let nonEmpty = 0;
  let sample = null;
  for (const key of keys) {
    const [cx, cz] = key.split(',').map(Number);
    const chunk = world.chunks.get(key);
    let solid = 0;
    for (let i = 0; i < chunk.length; i += 1) if (chunk[i]) solid++;
    if (solid > 1000) nonEmpty++;
    if (!sample && solid > 1000) {
      const surface = world.surfaceAt(cx * 16 + 8, cz * 16 + 8);
      sample = { cx, cz, solid, surface, top: world.getBlock(cx * 16 + 8, surface - 1, cz * 16 + 8) };
    }
  }

  console.log('\nresult');
  console.log(`  chunk packets applied: ${stats.chunks}`);
  console.log(`  chunks stored: ${keys.length} (${nonEmpty} with real terrain)`);
  console.log(`  block changes seen: ${stats.blocks}`);
  console.log(`  teleport received: ${stats.teleport ? 'yes' : 'no'}`);
  console.log(`  sample: ${sample ? JSON.stringify(sample) : 'none'}`);
  if (stats.kicked) console.log(`  ended with: ${stats.kicked}`);

  const ok = nonEmpty >= 8 && Boolean(stats.teleport);
  console.log(ok ? '\nPASS: terrain and position arrived' : '\nFAIL: missing terrain or position');
  session.disconnect();
  setTimeout(() => process.exit(ok ? 0 : 1), 150);
}, 12000);
