// Eaglercraft runs the Minecraft protocol over WebSocket frames. Once a server
// enables compression, each frame is: varint(packetLength), varint(uncompressedLength), body
// (uncompressedLength 0 means the body is already plain). zlib via DecompressionStream
// keeps this dependency-free and identical in browser and Node.

export async function inflateZlib(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This environment has no DecompressionStream, cannot read compressed server packets');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

export async function deflateZlib(bytes) {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('This environment has no CompressionStream');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}
