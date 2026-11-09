// Round-trips the singleplayer save format: break a block, place one, reload the
// world from its seed plus edits and check both survive.
//
//   node test/world-save.test.mjs

import { World, chunkKey } from '../js/world.js';

const seed = 4242;
const a = new World({ seed });
const groundY = a.surfaceAt(4, 4) - 1; // top solid block of the column
const before = a.getBlock(4, groundY, 4);

a.setBlock(4, groundY, 4, 0); // break
a.setBlock(5, groundY + 3, 4, 5); // place planks above the surface
const edits = a.serializeEdits();

const b = new World({ seed, edits });
const brokeGone = before !== 0 && b.getBlock(4, groundY, 4) === 0;
const placedThere = b.getBlock(5, groundY + 3, 4) === 5;
const untouched = b.getBlock(4, groundY - 1, 4) === a.getBlock(4, groundY - 1, 4);

const dirty = b.takeDirty();
const dirtyOk = dirty.includes(chunkKey(0, 0)) && b.takeDirty().length === 0;

// A server-supplied world must never generate chunks of its own.
const net = new World({ generate: false });
const netOk = net.getChunk(3, 3) === null && net.getBlock(50, 70, 50) === 0;

console.log(`ground at (4,4) is y=${groundY}, was block ${before}`);
console.log('serialized edits:', JSON.stringify(edits));
console.log('break persisted: ', brokeGone);
console.log('place persisted: ', placedThere);
console.log('neighbour kept:  ', untouched);
console.log('dirty tracking:  ', dirtyOk);
console.log('no auto-generate:', netOk);

const ok = brokeGone && placedThere && untouched && dirtyOk && netOk;
console.log(ok ? 'PASS save/load round trip' : 'FAIL save/load round trip');
process.exit(ok ? 0 : 1);
