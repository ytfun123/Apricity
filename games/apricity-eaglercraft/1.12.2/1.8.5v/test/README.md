# Tests

`protocol-test.mjs` runs the exact modules the browser uses against a real
Eaglercraft server, headlessly, using Node's built-in WebSocket (Node 22+).

```bash
node test/protocol-test.mjs                 # default public server list
node test/protocol-test.mjs mc.arch.lol     # one server
node test/protocol-test.mjs mc.arch.lol 47  # server + Minecraft protocol
```

It first self-checks the crypto (SHA-256 against Node's `crypto`, and the
Eaglercraft password hash against an independent re-implementation), then
performs the real handshake and reports every step: server version, auth
method, allow-login, finish-login, and the first play packets.

Nothing here is mocked: a passing run means a browser-equivalent connection
reached a live server over WebSocket with no relay and no back-end.
