# Apricity Eagler — from-scratch client core

Our own browser client for Eaglercraft servers. It does **not** use a relay
server, a proxy, or any back-end of ours. When you press connect, the browser
opens exactly one WebSocket to the server's own endpoint and speaks the
Eaglercraft protocol to it directly.

```
you ─── wss://the-server-they-typed/ ───► that server
```

That is the whole topology. The `relay.deev.is` / `relay.lax1dude.net` entries
in other clients' configs exist only for shared "LAN" worlds and servers behind
NAT; normal multiplayer never touches them, and this client has no relay code
at all.

## Status

| Area | State |
| --- | --- |
| Direct WebSocket transport, address parsing | done |
| Eaglercraft handshake v3 / v4 / v5 negotiation | done |
| Login: offline (username only), EAGLER_SHA256, AuthMe, plaintext | done |
| Profile data / finish login | done |
| Play state: keepalive, join game, compression, packet log | done |
| World renderer, entities, inventory, chat input | **not yet** |
| Server list MOTD pings | **not yet** |
| Skins and capes | **not yet** |

Stage 1 is a real client core, not a game you can walk around in yet. It proves
the part people usually assume needs a back-end: a from-scratch client logging
into a real Eaglercraft server with nothing in the middle.

## Files

```
index.html        the page (form, server chips, live connection log)
js/address.js     turns "host", "host:port" or a URL into one wss:// endpoint
js/bytes.js       big-endian Reader/Writer, varint, UUID formatting
js/sha256.js      dependency-free SHA-256 (needed for the login hash)
js/auth.js        EAGLER_SHA256 / AuthMe hashes, per-server auth dispatch
js/compression.js zlib in/out once a server enables compression
js/handshake.js   the protocol state machine (the actual client)
js/ui.js          DOM wiring, no protocol logic
test/             headless test against real servers
```

## The protocol, as implemented

Everything below is over WebSocket **binary frames**; each frame is one packet.

**1. Client version (C→S `0x01`)**

```
u8   0x01
u8   2            legacy protocol version
u16  3            count of eagler protocols we speak
      u16 3, u16 4, u16 5
u16  1            count of Minecraft protocols we speak
      u16 <mc protocol>          (47 = 1.8, 340 = 1.12.2, 769 = 1.20.4)
u8   len + ASCII client brand
u8   len + ASCII client version
bool has password
u8   len + ASCII username
```

**2. Server version (S→C `0x02`)** — eagler protocol, Minecraft protocol,
server brand/version, auth method, `u16` salt length + salt, and for v5 a
`bool` telling us whether we may pick our own nickname.

**3. Login request (C→S `0x04`)** — username, requested server (`"default"`),
password bytes (length-prefixed, `0` when logging in offline), cookie flags,
plus capability varints on v5.

**4. Allow login (S→C `0x05`)** — assigned username and UUID (two `i64`s),
capability data on v5.

**5. Profile data (C→S `0x07`)** and **6. Finish login (C→S `0x08`)** — profile
data is optional (skins/capes), finish login is a single byte.

**7. Finish login (S→C `0x09`)** — from here the connection is the normal
Minecraft play stream: `0x46` turns compression on, `0x00` keepalive must be
echoed, `0x01` join game carries entity id and dimension.

The password hash for `AUTH_METHOD_EAGLER_SHA256` is three SHA-256 rounds:
`u16 length + UTF-16BE password + SALT_SAVE`, then `result + salt[0..32] +
SALT_BASE`, then `result + salt[32..64] + SALT_BASE`. `test/protocol-test.mjs`
verifies this implementation against an independent one built on Node's crypto.

## Test it

```bash
node test/protocol-test.mjs                 # public server list
node test/protocol-test.mjs mc.arch.lol 47  # one server, one protocol
```

The test runs the same modules the browser does (Node 22+ has a built-in
WebSocket). A passing run means a real handshake and login against a live
server with no relay and no back-end.

Opening the page needs any static server: `npx serve .` from this folder, then
visit `/index.html`. From `file://` ES modules will not load.

## Next stages

1. **MOTD pings** — populate the server list without logging in.
2. **World data** — decode `0x21 ChunkData` / `0x26 MapChunkBulk`, then a WebGL
   renderer with our own generated block textures.
3. **Player** — movement, collision, `0x08 PlayerPositionAndLook`
   reconciliation, then chat and the HUD.
4. **Polish** — settings, keybinds, pointer lock, skins.

## Notes

- Offline ("cracked") login is the default: no password is sent unless the
  server's handshake asks for one. Servers that require auth will say so and
  you can supply a password in the form.
- Servers behind plain `ws://` cannot be reached from an `https://` page; the
  browser blocks mixed content. Use a `wss://` server.
- Browsers cannot open raw TCP sockets, so a plain Java Minecraft server with
  no Eaglercraft plugin can never be joined from a browser by any client. That
  is the one thing "no back-end" cannot remove.
- No Minecraft assets are included. The renderer in later stages uses our own
  generated textures.
