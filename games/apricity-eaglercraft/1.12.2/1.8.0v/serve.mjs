// Tiny static server for local use: the client is ES modules, so the browser
// refuses to load it from file://. Nothing outside the project is exposed.
//
//   node games/apricity-eaglercraft/1.12.2/1.8.0v/serve.mjs
//   -> http://127.0.0.1:8123/games/apricity-eaglercraft/1.12.2/1.8.0v/

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
// The server exposes the project root so ../ assets and the launcher resolve.
// here is <root>/games/apricity-eaglercraft/<minecraft>/<game>/: four up.
const root = resolve(here, '..', '..', '..', '..');
// Ignore an inherited PORT of 0/empty: binding to 0 hands us a random port and
// the printed URL becomes useless.
const requestedPort = Number(process.env.PORT);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 8231;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let target = normalize(join(root, urlPath));

  if (!target.startsWith(root)) {
    res.writeHead(403, { 'content-type': 'text/plain' }).end('forbidden');
    return;
  }

  try {
    if (statSync(target).isDirectory()) target = join(target, 'index.html');
    const stat = statSync(target);
    res.writeHead(200, {
      'content-type': TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-store',
    });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end(`not found: ${urlPath}`);
  }
});

server.listen(port, '127.0.0.1', () => {
  const { port: actualPort } = server.address();
  console.log(`serving ${root}`);
  console.log(`open http://127.0.0.1:${actualPort}/games/apricity-eaglercraft/`);
  console.log(`pid ${process.pid}`);
});
