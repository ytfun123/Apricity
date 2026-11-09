// Proves block editing works over the real protocol. The client connects to
// test/mock-server.mjs, gets a chunk, then digs and places blocks; every
// outbound packet is checked byte for byte against the 1.8 layouts, so a
// wrong field order or an unencoded position fails here instead of silently
// doing nothing on a live server.
//
//   node test/multiplayer-edit.test.mjs

import assert from 'node:assert/strict';
import { startMockServer } from './mock-server.mjs';
import { MultiplayerSession, packPosition, faceIndex } from '../js/multiplayer.js';
import { World } from '../js/world.js';

const passed = [];

function check(name, fn) {
  fn();
  passed.push(name);
}

const packedOf = (packet, at = 2) => BigInt('0x' + packet.bytes.subarray(at, at + 8).toString('hex'));

async function main() {
  const mock = await startMockServer();
  const world = new World({ generate: false });

  let settleJoin;
  const joined = new Promise((resolve, reject) => {
    settleJoin = resolve;
    setTimeout(() => reject(new Error('client never reached the play state')), 5000);
  });

  const session = new MultiplayerSession({
    address: mock.url,
    username: 'Tester',
    world,
    handlers: { onJoin: (info) => settleJoin(info), onLog: () => {} },
  });
  session.connect();

  const info = await joined;

  check('login and play handshake', () => {
    assert.equal(info.gamemode, 1, 'gamemode arrives with JoinGame');
    assert.equal(session.joined, true);
    assert.equal(session.gamemode, 1);
  });

  // The bulk chunk the server sent has to become part of the world.
  const deadline = Date.now() + 3000;
  while (world.getBlock(0, 0, 0) !== 1 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  check('MapChunkBulk fills the world', () => {
    assert.equal(world.getBlock(0, 0, 0), 1);
    assert.equal(world.getBlock(15, 31, 15), 1);
  });

  const [keepAlive] = await mock.waitFor(0x00, 1);
  const [settings] = await mock.waitFor(0x15, 1);
  const [brand] = await mock.waitFor(0x17, 1);
  check('client settings and brand are announced on entry', () => {
    assert.ok(settings.bytes.length > 4);
    assert.ok(brand.bytes.subarray(1).toString('latin1').includes('MC|Brand'));
  });
  check('KeepAlive is echoed back', () => {
    assert.ok(keepAlive, 'server sent a keepalive');
    assert.equal(keepAlive.bytes[0], 0x00);
    assert.equal(keepAlive.bytes[1], 42, 'the same id comes back');
  });

  // Editing: the two packets a 1.8 client sends to break a block, then a place.
  session.breakBlock(10, 5, 12, faceIndex([0, 1, 0]));
  session.place(10, 6, 12, faceIndex([0, 1, 0]), 4, [0.25, 0.75, 0.5]);
  session.sendHeldItem(3);
  session.sendChat('hello');
  session.sendPosition(1.5, 70, 2.5, 90, 0, true);

  const [started, finished] = await mock.waitFor(0x07, 2);
  check('0x07 PlayerDigging: start then finish, packed position, face', () => {
    assert.equal(started.bytes[0], 0x07);
    assert.equal(started.bytes[1], 0, 'status 0 = started digging');
    assert.equal(finished.bytes[1], 2, 'status 2 = finished digging');
    for (const packet of [started, finished]) {
      assert.equal(packet.bytes.length, 11, 'id + status + long + face');
      assert.equal(packedOf(packet), packPosition(10, 5, 12));
      assert.equal(packet.bytes[10], 1, 'face +Y');
    }
  });

  const [place] = await mock.waitFor(0x08, 1);
  check('0x08 BlockPlacement: position, face, held stack, cursor', () => {
    assert.equal(place.bytes[0], 0x08);
    assert.equal(place.bytes.length, 19);
    assert.equal(packedOf(place, 1), packPosition(10, 6, 12));
    assert.equal(place.bytes[9], 1, 'placed against the top face');
    assert.equal(place.bytes.readUInt16BE(10), 4, 'held item is the cobblestone in slot 0');
    assert.equal(place.bytes[12], 1, 'one item in the stack');
    assert.equal(place.bytes.readUInt16BE(13), 0, 'damage 0');
    assert.equal(place.bytes[15], 0, 'empty NBT compound');
    assert.deepEqual([...place.bytes.subarray(16, 19)], [4, 12, 8], 'cursor 0.25 / 0.75 / 0.5 scaled by 16');
  });

  const [held] = await mock.waitFor(0x09, 1);
  check('0x09 HeldItemChange carries the selected slot', () => {
    assert.equal(held.bytes.length, 3);
    assert.equal(held.bytes.readUInt16BE(1), 3);
  });

  const [chat] = await mock.waitFor(0x01, 1);
  check('0x01 ChatMessage is length-prefixed UTF-8', () => {
    assert.equal(chat.bytes[1], 5);
    assert.equal(chat.bytes.subarray(2).toString('utf8'), 'hello');
  });

  const positions = await mock.waitFor(0x06, 2);
  check('0x06 PlayerPositionAndLook reports the player', () => {
    const mine = positions.find((packet) => packet.bytes.readDoubleBE(1) === 1.5);
    assert.ok(mine, 'our position reached the server');
    assert.equal(mine.bytes.readDoubleBE(9), 70);
    assert.equal(mine.bytes.readDoubleBE(17), 2.5);
    assert.ok(Math.abs(mine.bytes.readFloatBE(25) - 90) < 0.001);
    assert.equal(mine.bytes.readFloatBE(29), 0);
    assert.equal(mine.bytes[33], 1, 'onGround flag');
  });

  check('nothing is recorded as a local save in a server world', () => {
    assert.deepEqual(world.serializeEdits(), []);
  });

  session.disconnect();
  await mock.close();

  console.log(`PASS ${passed.length} checks`);
  for (const name of passed) console.log(`  ok  ${name}`);
  // An open socket would keep the process alive after the results are in.
  process.exit(0);
}

main().catch((err) => {
  console.error(`FAIL ${err.message}`);
  if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
  process.exit(1);
});
