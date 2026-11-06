/* UI wiring for the Apricity Eagler client core. All protocol work happens in
   js/handshake.js — this file only drives the form and prints what happened. */

import { EaglerConnection, STATE } from './handshake.js';

const $ = (id) => document.getElementById(id);

const logEl = $('log');
const nicknameEl = $('nickname');
const addressEl = $('address');
const protocolEl = $('protocol');
const passwordEl = $('password');
const connectBtn = $('connect');
const disconnectBtn = $('disconnect');
const statusEl = $('status');

let connection = null;

function log(message, kind = '') {
  const time = new Date().toLocaleTimeString([], { hour12: false });
  const line = document.createElement('div');
  line.className = `line ${kind}`;
  line.textContent = `${time}  ${message}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatus(text, kind = '') {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`;
}

function setRunning(running) {
  connectBtn.disabled = running;
  disconnectBtn.disabled = !running;
}

function connect() {
  const address = addressEl.value.trim();
  const nickname = nicknameEl.value.trim() || 'Player';

  if (nickname.length > 16) {
    log('nickname must be 16 characters or fewer', 'bad');
    return;
  }

  logEl.textContent = '';
  setRunning(true);
  setStatus('connecting', 'busy');

  connection = new EaglerConnection({
    address,
    username: nickname,
    password: passwordEl.value || null,
    minecraftProtocol: Number(protocolEl.value),
    brand: 'ApricityEagler',
    clientVersion: '0.1.0',
  });

  connection.on('log', (message) => log(message));
  connection.on('server-version', (server) => {
    setStatus(`handshake ok — ${server.brand || 'server'} ${server.version || ''}`.trim(), 'good');
  });
  connection.on('allow-login', (player) => {
    log(`you are ${player.username} (${player.uuid})`, 'good');
  });
  connection.on('joined', (info) => {
    setStatus(`in game — entity ${info.entityId}, dimension ${info.dimension}`, 'good');
    log(`join game accepted: entity ${info.entityId}, gamemode ${info.gamemode}, dimension ${info.dimension}`, 'good');
  });
  connection.on('ready', () => {
    setStatus('logged in — play state', 'good');
  });
  connection.on('compression', (threshold) => {
    log(`server turned compression on at ${threshold} bytes`, 'note');
  });
  connection.on('error', (message) => {
    setStatus('failed', 'bad');
    log(message, 'bad');
  });
  connection.on('close', () => {
    setRunning(false);
    if (connection?.state !== STATE.PLAY) setStatus('disconnected', '');
  });

  if (address.startsWith('ws://') && location.protocol === 'https:') {
    log('this page is https, so ws:// is blocked as mixed content — use wss://', 'note');
  }

  connection.connect();
}

connectBtn.addEventListener('click', connect);

disconnectBtn.addEventListener('click', () => {
  connection?.disconnect();
  setRunning(false);
  setStatus('disconnected', '');
});

for (const chip of document.querySelectorAll('[data-server]')) {
  chip.addEventListener('click', () => {
    addressEl.value = chip.dataset.server;
    addressEl.focus();
  });
}

for (const el of [addressEl, passwordEl]) {
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !connectBtn.disabled) connect();
  });
}

log('client core ready — this build speaks the Eaglercraft handshake directly to a server.\n' +
    'No relay, no proxy, no back-end: one WebSocket from your browser to the server.');
