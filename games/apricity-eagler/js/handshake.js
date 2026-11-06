// Eaglercraft connection core, written from scratch against the published
// protocol of the reference client and EaglerXServer.
//
// Transport: one plain WebSocket straight to the server's own endpoint.
// No relay server, no proxy, no back-end of ours is involved at any point.

import { Writer, Reader, formatUuid } from './bytes.js';
import { AUTH_METHOD_NAMES, passwordBytesFor } from './auth.js';
import { normalizeAddress } from './address.js';
import { inflateZlib } from './compression.js';

export const HANDSHAKE = Object.freeze({
  CLIENT_VERSION: 0x01,
  SERVER_VERSION: 0x02,
  VERSION_MISMATCH: 0x03,
  CLIENT_REQUEST_LOGIN: 0x04,
  SERVER_ALLOW_LOGIN: 0x05,
  SERVER_DENY_LOGIN: 0x06,
  CLIENT_PROFILE_DATA: 0x07,
  CLIENT_FINISH_LOGIN: 0x08,
  SERVER_FINISH_LOGIN: 0x09,
  SERVER_ERROR: 0xff,
});

export const SERVER_ERROR = Object.freeze({
  0x01: 'unknown packet',
  0x02: 'invalid packet',
  0x03: 'wrong packet for this state',
  0x04: 'too much profile data',
  0x05: 'duplicate profile data',
  0x06: 'rate limited',
  0x07: 'locked out',
  0x08: 'server message',
  0x09: 'authentication required',
});

export const STATE = Object.freeze({
  IDLE: 'idle',
  HANDSHAKE: 'handshake',
  LOGIN: 'login',
  COMPLETING: 'completing',
  PLAY: 'play',
  CLOSED: 'closed',
});

export const EAGLER_PROTOCOLS = [3, 4, 5];

// A small slice of the Minecraft 1.8 clientbound play table, for readable logs.
const MC_NAMES = {
  0x00: 'KeepAlive',
  0x01: 'JoinGame',
  0x02: 'ChatMessage',
  0x03: 'TimeUpdate',
  0x05: 'SpawnPosition',
  0x07: 'Respawn',
  0x08: 'PlayerPositionAndLook',
  0x0f: 'SpawnPlayer',
  0x13: 'DestroyEntities',
  0x21: 'ChunkData',
  0x26: 'MapChunkBulk',
  0x39: 'PlayerAbilities',
  0x3f: 'PluginMessage',
  0x40: 'Disconnect',
  0x46: 'SetCompression',
  0x47: 'PlayerListItem',
};

export class EaglerConnection {
  constructor(options = {}) {
    this.address = options.address ?? '';
    this.username = options.username ?? 'Player';
    this.password = options.password ?? null;
    this.minecraftProtocol = options.minecraftProtocol ?? 47;
    this.brand = options.brand ?? 'ApricityEagler';
    this.clientVersion = options.clientVersion ?? '0.1.0';
    this.allowPlaintext = options.allowPlaintext ?? false;

    this.state = STATE.IDLE;
    this.ws = null;
    this.url = null;
    this.server = null;
    this.compressionThreshold = -1;
    this.stats = { framesIn: 0, framesOut: 0, bytesIn: 0, bytesOut: 0, packetsIn: 0 };
    this.recentPackets = [];
    this._listeners = new Map();
    this._playQueue = Promise.resolve();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this._listeners.get(event)?.delete(handler);
  }

  _emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        // A broken listener must never take the connection down.
        console.error('listener failed', event, err);
      }
    }
  }

  _log(message) {
    this._emit('log', message);
  }

  connect() {
    if (this.state !== STATE.IDLE && this.state !== STATE.CLOSED) {
      throw new Error('Connection already in progress');
    }

    this.url = normalizeAddress(this.address);
    this.state = STATE.HANDSHAKE;
    this._log(`direct connect -> ${this.url}`);
    this._log('transport: one WebSocket to the server itself (no relay, no back-end)');

    const ws = new WebSocket(this.url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      this._log('socket open');
      try {
        this._sendClientVersion();
      } catch (err) {
        this._fail(err.message);
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        this._log(`ignored text frame (${event.data.length} chars)`);
        return;
      }
      this._onFrame(new Uint8Array(event.data));
    };

    ws.onclose = (event) => {
      const wasPlaying = this.state === STATE.PLAY;
      this.state = STATE.CLOSED;
      this._log(`socket closed (${event.code}${event.reason ? `: ${event.reason}` : ''})`);
      this._emit('close', { code: event.code, reason: event.reason, wasPlaying });
    };

    ws.onerror = () => {
      this._log('socket error');
    };
  }

  disconnect() {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) this.ws.close();
  }

  _send(bytes) {
    if (!this.ws || this.ws.readyState !== 1) throw new Error('Socket is not open');
    this.ws.send(bytes);
    this.stats.framesOut++;
    this.stats.bytesOut += bytes.length;
  }

  // ── handshake phase ────────────────────────────────────────────────────────

  _sendClientVersion() {
    const w = new Writer();
    w.u8(HANDSHAKE.CLIENT_VERSION);
    w.u8(2); // legacy protocol version
    w.u16(EAGLER_PROTOCOLS.length);
    for (const version of EAGLER_PROTOCOLS) w.u16(version);
    w.u16(1); // we speak exactly one Minecraft protocol
    w.u16(this.minecraftProtocol);
    w.u8(this.brand.length);
    w.ascii(this.brand);
    w.u8(this.clientVersion.length);
    w.ascii(this.clientVersion);
    w.bool(this.password !== null && this.password !== '');
    w.u8(this.username.length);
    w.ascii(this.username);

    this._send(w.toUint8Array());
    this._log(`sent client version (mc ${this.minecraftProtocol}, eagler v${EAGLER_PROTOCOLS.join('/v')})`);
  }

  _onFrame(bytes) {
    this.stats.framesIn++;
    this.stats.bytesIn += bytes.length;

    if (this.state === STATE.PLAY) {
      this._playQueue = this._playQueue
        .then(() => this._handlePlayFrame(bytes))
        .catch((err) => this._fail(err.message));
      return;
    }

    try {
      this._handleHandshakeFrame(bytes);
    } catch (err) {
      this._fail(err.message);
    }
  }

  _handleHandshakeFrame(bytes) {
    const r = new Reader(bytes);
    const packetId = r.u8();

    if (this.state === STATE.HANDSHAKE) {
      switch (packetId) {
        case HANDSHAKE.SERVER_VERSION:
          return this._onServerVersion(r);
        case HANDSHAKE.VERSION_MISMATCH:
          return this._onVersionMismatch(r);
        case HANDSHAKE.SERVER_ERROR:
          return this._onServerError(r);
        default:
          return this._fail(`unexpected packet 0x${packetId.toString(16)} during handshake`);
      }
    }

    if (this.state === STATE.LOGIN || this.state === STATE.COMPLETING) {
      switch (packetId) {
        case HANDSHAKE.SERVER_ALLOW_LOGIN:
          return this._onAllowLogin(r);
        case HANDSHAKE.SERVER_DENY_LOGIN:
          return this._onDenyLogin(r);
        case HANDSHAKE.SERVER_FINISH_LOGIN:
          return this._onFinishLogin();
        case HANDSHAKE.SERVER_ERROR:
          return this._onServerError(r);
        default:
          return this._fail(`unexpected packet 0x${packetId.toString(16)} during login`);
      }
    }
  }

  _onServerVersion(r) {
    const eaglerProtocol = r.u16();
    const minecraftProtocol = r.u16();
    const serverBrand = r.ascii(r.u8());
    const serverVersion = r.ascii(r.u8());
    const authMethod = r.u8();
    const salt = r.take(r.u16());
    const nicknameSelection = eaglerProtocol >= 5 ? r.bool() : true;

    this.server = {
      eaglerProtocol,
      minecraftProtocol,
      brand: serverBrand,
      version: serverVersion,
      authMethod,
      salt,
      nicknameSelection,
    };

    this._log(`server: ${serverBrand || 'unknown'} ${serverVersion || ''}`.trim());
    this._log(`eagler protocol v${eaglerProtocol}, minecraft ${minecraftProtocol}`);
    this._log(`auth: ${AUTH_METHOD_NAMES[authMethod] ?? `#${authMethod}`}, salt ${salt.length} B`);

    this._emit('server-version', this.server);

    if (!EAGLER_PROTOCOLS.includes(eaglerProtocol)) {
      return this._fail(`server speaks eagler protocol v${eaglerProtocol}, this client knows v3/v4/v5`);
    }
    if (minecraftProtocol !== this.minecraftProtocol) {
      return this._fail(
        `server wants Minecraft protocol ${minecraftProtocol}, this client offered ${this.minecraftProtocol}`
      );
    }

    this.state = STATE.LOGIN;
    this._sendLoginRequest();
  }

  _onVersionMismatch(r) {
    const eaglerVersions = [];
    for (let count = r.u16(), i = 0; i < count; i++) eaglerVersions.push(r.u16());
    const gameVersions = [];
    for (let count = r.u16(), i = 0; i < count; i++) gameVersions.push(r.u16());
    let messageLength = r.remaining() > 0 ? r.u8() : 0;
    if (messageLength > r.remaining()) messageLength = r.remaining();
    const message = messageLength > 0 ? r.utf8(messageLength) : '';

    this._log(`server supports eagler ${eaglerVersions.map((v) => `v${v}`).join(', ') || 'none'}`);
    this._log(`server supports minecraft ${gameVersions.map((v) => `${v}`).join(', ') || 'none'}`);
    this._emit('version-mismatch', { eaglerVersions, gameVersions, message });
    this._fail(message || 'version mismatch');
  }

  _onServerError(r) {
    const code = r.u8();
    let length = r.u8();
    if (length > r.remaining()) length = r.remaining();
    // Some servers send the text without a usable length byte; fall back to
    // whatever is left so the player still sees the reason.
    if (length === 0 && r.remaining() > 0) length = r.remaining();
    const message = length > 0 ? r.utf8(length) : '';
    const label = SERVER_ERROR[code] ?? `code ${code}`;
    this._fail(`server error (${label})${message ? `: ${message}` : ''}`);
  }

  _sendLoginRequest() {
    const authMethod = this.server.authMethod;
    let passwordBytes = null;
    try {
      passwordBytes = passwordBytesFor(this.password, authMethod, this.server.salt, {
        allowPlaintext: this.allowPlaintext,
      });
    } catch (err) {
      return this._fail(err.message);
    }

    const version = this.server.eaglerProtocol;
    const w = new Writer();
    w.u8(HANDSHAKE.CLIENT_REQUEST_LOGIN);

    const sendUsername = version < 5 || this.server.nicknameSelection;
    if (sendUsername) {
      w.u8(this.username.length);
      w.ascii(this.username);
    } else {
      w.u8(0);
    }

    const requestedServer = 'default';
    w.u8(requestedServer.length);
    w.ascii(requestedServer);

    if (passwordBytes) {
      w.u8(passwordBytes.length);
      w.raw(passwordBytes);
    } else {
      w.u8(0);
    }

    // No cookies, and for v5: no optional capabilities advertised.
    w.bool(false);
    w.u8(0);
    if (version >= 5) {
      w.varint(0);
      w.u8(0);
    }

    this._send(w.toUint8Array());
    this._log(
      version >= 5 && !this.server.nicknameSelection
        ? 'sent login request (server assigns the nickname)'
        : `sent login request as "${this.username}"`
    );
  }

  _onAllowLogin(r) {
    const username = r.ascii(r.u8());
    const uuid = formatUuid(r.i64(), r.i64());

    if (this.server.eaglerProtocol >= 5) {
      const caps = r.varint();
      let bits = 0;
      for (let v = caps >>> 0; v !== 0; v >>>= 1) bits += v & 1;
      if (bits > 0 && bits <= r.remaining()) r.take(bits);
      const extCount = r.u8();
      if (extCount * 17 <= r.remaining()) r.take(extCount * 17);
    }

    this.playerName = username || this.username;
    this.playerUuid = uuid;
    this._log(`login accepted: ${this.playerName} (${uuid})`);
    this._emit('allow-login', { username: this.playerName, uuid });

    // Profile data (skin/cape) is optional; we send none while the renderer is
    // still to come, then finish login with its single-byte packet.
    const profile = new Writer();
    profile.u8(HANDSHAKE.CLIENT_PROFILE_DATA);
    if (this.server.eaglerProtocol === 3) {
      // v3 sends one packet per entry; we have no entries.
    } else {
      profile.u8(0);
      this._send(profile.toUint8Array());
    }

    this.state = STATE.COMPLETING;
    this._send(new Uint8Array([HANDSHAKE.CLIENT_FINISH_LOGIN]));
    this._log('sent finish login, waiting for the server to hand over to play');
  }

  _onDenyLogin(r) {
    const message = r.u16();
    this._fail(`login denied${message ? `: ${message}` : ''}`);
  }

  _onFinishLogin() {
    this.state = STATE.PLAY;
    this._log('login complete, now in the play state');
    this._emit('ready', { username: this.playerName, uuid: this.playerUuid, server: this.server });
  }

  // ── play phase ─────────────────────────────────────────────────────────────

  async _handlePlayFrame(bytes) {
    let data = bytes;

    if (this.compressionThreshold >= 0) {
      const frame = new Reader(bytes);
      frame.varint(); // declared length, not needed for a single frame
      const uncompressedLength = frame.varint();
      const body = frame.rest();
      data = uncompressedLength > 0 ? await inflateZlib(body) : body;
    }

    const r = new Reader(data);
    const packetId = r.varint();
    const name = MC_NAMES[packetId] ?? `0x${packetId.toString(16)}`;

    this.stats.packetsIn++;
    this.recentPackets.push({ id: packetId, name, size: data.length });
    if (this.recentPackets.length > 64) this.recentPackets.shift();
    this._emit('packet', { id: packetId, name, size: data.length });

    if (packetId === 0x46) {
      this.compressionThreshold = r.varint();
      this._log(`compression enabled at ${this.compressionThreshold} bytes`);
      this._emit('compression', this.compressionThreshold);
      return;
    }

    if (packetId === 0x00) {
      // KeepAlive: echo the id back or the server drops us.
      const keepAliveId = r.varint();
      this._sendPlayPacket(0x00, new Writer().varint(keepAliveId));
      this._log(`keepalive ${keepAliveId}`);
      return;
    }

    if (packetId === 0x01) {
      const entityId = r.i32();
      const gamemode = r.u8();
      const dimension = r.i8();
      this._log(`join game: entity ${entityId}, gamemode ${gamemode & 0x07}, dimension ${dimension}`);
      this._emit('joined', { entityId, gamemode: gamemode & 0x07, dimension });
      return;
    }

    if (packetId === 0x40) {
      const length = r.u16();
      this._fail(`kicked: ${length > 0 ? r.utf8(length) : 'no reason given'}`);
      return;
    }

    this._log(`<- ${name} (${data.length} B)`);
  }

  _sendPlayPacket(packetId, payload) {
    const body = new Writer();
    body.varint(packetId);
    if (payload) body.raw(payload.toUint8Array());

    let frame = body.toUint8Array();
    if (this.compressionThreshold >= 0) {
      // Uncompressed bodies are legal: length, then 0, then the raw packet.
      const wrapped = new Writer();
      wrapped.varint(frame.length + 1);
      wrapped.varint(0);
      wrapped.raw(frame);
      frame = wrapped.toUint8Array();
    }
    this._send(frame);
  }

  _fail(message) {
    if (this.state === STATE.CLOSED) return;
    this._log(`failed: ${message}`);
    this._emit('error', message);
    this.state = STATE.CLOSED;
    try {
      if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) this.ws.close();
    } catch {
      /* socket is already unusable */
    }
  }
}
