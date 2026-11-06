// Server address handling. There is no relay and no proxy here: whatever the
// player types becomes the single WebSocket endpoint we talk to.

export function normalizeAddress(input) {
  const raw = String(input ?? '').trim();
  if (!raw) throw new Error('Enter a server address');

  let url;
  if (/^wss?:\/\//i.test(raw)) {
    url = raw;
  } else if (/^https?:\/\//i.test(raw)) {
    // A pasted browser URL is almost always the WebSocket endpoint too.
    url = raw.replace(/^http/i, 'ws');
  } else if (/^[\w.-]+:\d+(\/.*)?$/.test(raw)) {
    url = `wss://${raw}`;
  } else {
    url = `wss://${raw}`;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`"${raw}" is not a valid address`);
  }

  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new Error(`Unsupported protocol ${parsed.protocol}`);
  }
  if (!parsed.hostname) throw new Error(`"${raw}" is missing a hostname`);
  if (!parsed.pathname) parsed.pathname = '/';

  return parsed.toString();
}
