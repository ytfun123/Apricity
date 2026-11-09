// The singleplayer command set, exercised without a browser: each command is
// run against a real World, Player, hotbar and vitals, and its effect is
// checked along with the usage and error paths.
//
//   node test/commands.test.mjs

import assert from 'node:assert/strict';
import { runCommand, parseBlock, isCommand } from '../js/commands.js';
import { World } from '../js/world.js';
import { Player } from '../js/player.js';
import { countInHotbar, emptyHotbar, slotIsEmpty, slot } from '../js/inventory.js';
import { gameModeFlags, normalizeGamemode } from '../js/gamemode.js';
import { Vitals } from '../js/survival.js';

const passed = [];
const check = (name, fn) => {
  fn();
  passed.push(name);
};

const world = new World({ seed: 424242 });
const player = new Player(world);
world.getChunk(0, 0);
player.spawnAt(0, 0);

let hotbarRefreshes = 0;

const ctx = {
  world,
  player,
  hotbar: emptyHotbar(),
  selectedSlot: 2,
  vitals: new Vitals(),
  gamemode: 'survival',
  setGamemode: (mode) => {
    ctx.gamemode = mode;
    const flags = gameModeFlags(mode);
    player.flying = flags.canFly;
    player.noClip = flags.noClip;
  },
  refreshHotbar: () => {
    hotbarRefreshes++;
  },
};

const run = (line) => runCommand(line, ctx);
const text = (result) => result.lines.join('\n');

check('commands are recognised by their leading slash', () => {
  assert.equal(isCommand('/help'), true);
  assert.equal(isCommand(' hello'), false);
});

check('/help lists the whole set', () => {
  const help = text(run('/help'));
  for (const command of ['/tp', '/fill', '/setblock', '/give', '/gamemode', '/heal', '/feed', '/clear', '/kill']) {
    assert.ok(help.includes(command), `help is missing ${command}`);
  }
});

check('/seed reports the world seed', () => {
  assert.equal(text(run('/seed')), 'Seed: 424242');
});

check('/tp moves the player and clears its velocity', () => {
  player.vx = 3;
  const result = run('/tp 5 70 9');
  assert.equal(player.x, 5);
  assert.equal(player.y, 70);
  assert.equal(player.z, 9);
  assert.equal(player.vx, 0);
  assert.equal(result.mutated, true);
});

check('/tp without coordinates prints the usage line', () => {
  assert.match(text(run('/tp 5')), /Usage: \/tp/);
  assert.match(text(run('/tp a b c')), /Usage: \/tp/);
});

check('/setblock places a block by name', () => {
  const result = run('/setblock 3 60 3 stone');
  assert.equal(world.getBlock(3, 60, 3), 1);
  assert.match(text(result), /Stone/);
});

check('/setblock accepts ids and namespaced names', () => {
  run('/setblock 4 60 4 57');
  assert.equal(world.getBlock(4, 60, 4), 57);
  run('/setblock 5 60 5 minecraft:diamond_block');
  assert.equal(world.getBlock(5, 60, 5), 57);
});

check('/setblock rejects a bad block and out-of-range Y', () => {
  assert.match(text(run('/setblock 0 60 0 not_a_block')), /Usage/);
  assert.match(text(run('/setblock 0 300 0 stone')), /Y must be between 0 and 255/);
});

check('/fill fills a box and counts the blocks', () => {
  const result = run('/fill 0 61 0 1 62 1 dirt');
  assert.match(text(result), /Filled 8 block/);
  let dirt = 0;
  for (let x = 0; x <= 1; x++) {
    for (let y = 61; y <= 62; y++) {
      for (let z = 0; z <= 1; z++) if (world.getBlock(x, y, z) === 3) dirt++;
    }
  }
  assert.equal(dirt, 8, 'every block in the box is dirt');
});

check('/fill refuses an oversized box', () => {
  assert.match(text(run('/fill -60 0 -60 60 255 60 stone')), /Too many blocks/);
});

check('/give stacks blocks into the hotbar', () => {
  const before = hotbarRefreshes;
  const result = run('/give diamond_block 5');
  assert.equal(countInHotbar(ctx.hotbar, 57), 5);
  assert.equal(hotbarRefreshes, before + 1, 'the hotbar is redrawn');
  assert.match(text(result), /Gave 5 Block of Diamond/);
});

check('/give rejects a count that is not a positive number', () => {
  assert.match(text(run('/give stone 0')), /Usage: \/give/);
  assert.match(text(run('/give stone -4')), /Usage: \/give/);
  assert.match(text(run('/give nonsense 1')), /Usage: \/give/);
});

check('/clear empties the hotbar instead of refilling it', () => {
  run('/give glass 3');
  run('/clear');
  assert.ok(ctx.hotbar.every(slotIsEmpty), 'a clean inventory');
});

check('/gamemode switches between all four modes', () => {
  run('/gamemode creative');
  assert.equal(ctx.gamemode, 'creative');
  assert.equal(player.flying, true);

  run('/gamemode 0');
  assert.equal(ctx.gamemode, 'survival');
  assert.equal(player.flying, false);

  run('/gamemode sp');
  assert.equal(ctx.gamemode, 'spectator');
  assert.equal(player.noClip, true, 'spectator ignores blocks');

  run('/gamemode adventure');
  assert.equal(gameModeFlags(ctx.gamemode).canBreak, false);

  run('/gamemode survival');
  assert.equal(player.noClip, false);
  assert.match(text(run('/gamemode bananas')), /Usage: \/gamemode/);
});

check('every game mode normalises from the forms 1.12.2 accepts', () => {
  assert.equal(normalizeGamemode('1'), 'creative');
  assert.equal(normalizeGamemode('c'), 'creative');
  assert.equal(normalizeGamemode('survival'), 'survival');
  assert.equal(normalizeGamemode('2'), 'adventure');
  assert.equal(normalizeGamemode('spectator'), 'spectator');
  assert.equal(normalizeGamemode('nope'), null);
});

check('/heal and /feed refill the vitals', () => {
  ctx.vitals.health = 6;
  ctx.vitals.food = 4;
  run('/heal');
  assert.equal(ctx.vitals.health, 20);
  assert.equal(ctx.vitals.food, 20);

  ctx.vitals.food = 7;
  run('/feed');
  assert.equal(ctx.vitals.food, 20);
});

check('/kill kills you so the frame loop can respawn you', () => {
  ctx.vitals.health = 20;
  const result = run('/kill');
  assert.equal(ctx.vitals.dead, true);
  assert.match(text(result), /Killed yourself/);
  run('/heal');
  assert.equal(ctx.vitals.dead, false);
});

check('/spawn returns the player to land', () => {
  run('/tp 4000 120 4000');
  run('/spawn');
  assert.ok(player.x < 200 && player.z < 200, 'back near the origin');
  assert.ok(player.y > 30, 'standing above sea level');
});

check('an unknown command says so instead of failing silently', () => {
  const result = run('/bogus');
  assert.match(text(result), /Unknown command/);
  assert.equal(result.mutated, false);
});

check('block names resolve in every shape players type', () => {
  assert.equal(parseBlock('stone'), 1);
  assert.equal(parseBlock('Stone'), 1);
  assert.equal(parseBlock('minecraft:stone'), 1);
  assert.equal(parseBlock('oak_planks'), 5);
  assert.equal(parseBlock('17'), 17);
  assert.equal(parseBlock('nonsense'), null);
});

console.log(`PASS ${passed.length} checks`);
for (const name of passed) console.log(`  ok  ${name}`);
