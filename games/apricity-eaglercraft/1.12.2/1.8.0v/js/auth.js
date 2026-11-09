// Eaglercraft login hashes. The EAGLER_SHA256 method is a three-round digest
// defined by the reference client: it must be reproduced exactly or the server
// rejects the login.

import { Writer, concatBytes, toHex } from './bytes.js';
import { sha256 } from './sha256.js';

// Fixed 32-byte constants baked into every Eaglercraft client.
export const SALT_BASE = Uint8Array.from([
  117, 43, 1, 112, 75, 3, 188, 61, 121, 31, 34, 181, 234, 31, 247, 72,
  12, 168, 138, 45, 143, 77, 118, 245, 187, 242, 188, 219, 160, 235, 235, 68,
]);

export const SALT_SAVE = Uint8Array.from([
  49, 25, 39, 38, 253, 85, 70, 245, 71, 150, 253, 206, 4, 26, 198, 249,
  145, 251, 232, 174, 186, 98, 27, 232, 55, 144, 83, 21, 36, 55, 170, 118,
]);

export const AUTH_METHOD = Object.freeze({
  NONE: 0x00,
  EAGLER_SHA256: 0x01,
  AUTHME_SHA256: 0x02,
  PLAINTEXT: 0xff,
});

export const AUTH_METHOD_NAMES = Object.freeze({
  0x00: 'none',
  0x01: 'eagler-sha256',
  0x02: 'authme-sha256',
  0xff: 'plaintext',
});

/**
 * Round 1: u16 length + UTF-16BE code units + SALT_SAVE.
 * Round 2: result + salt[0..32] + SALT_BASE.
 * Round 3: result + salt[32..64] + SALT_BASE.
 */
export function eaglerSHA256(password, salt) {
  if (!salt || salt.length < 64) {
    throw new Error(`Server salt is ${salt ? salt.length : 0} bytes, EAGLER_SHA256 needs 64`);
  }

  const head = new Writer();
  head.u16(password.length);
  for (let i = 0; i < password.length; i++) head.u16(password.charCodeAt(i));
  head.raw(SALT_SAVE);

  const round1 = sha256(head.toUint8Array());
  const round2 = sha256(concatBytes(round1, salt.subarray(0, 32), SALT_BASE));
  return sha256(concatBytes(round2, salt.subarray(32, 64), SALT_BASE));
}

/** AuthMe style: sha256 password, hex it, append salt, sha256, hex again. */
export function authmeSHA256(password, salt) {
  const first = sha256(new TextEncoder().encode(password));
  const hexed = new TextEncoder().encode(toHex(first));
  const second = sha256(concatBytes(hexed, salt));
  return new TextEncoder().encode(toHex(second));
}

/**
 * Produce the password bytes a given server wants, or null when it wants none.
 * Offline ("cracked") servers use AUTH_METHOD_NONE and log in on username alone.
 */
export function passwordBytesFor(password, authMethod, salt, { allowPlaintext = false } = {}) {
  if (password === null || password === undefined || password === '') return null;

  switch (authMethod) {
    case AUTH_METHOD.NONE:
      return null;
    case AUTH_METHOD.EAGLER_SHA256:
      return eaglerSHA256(password, salt);
    case AUTH_METHOD_AUTHME_SHA256:
      return authmeSHA256(password, salt);
    case AUTH_METHOD.PLAINTEXT: {
      if (!allowPlaintext) {
        throw new Error('Server asked for a plaintext password; enable plaintext logins to allow it');
      }
      const bytes = new TextEncoder().encode(password);
      if (bytes.length > 255) throw new Error('Password is too long (255 byte limit)');
      return bytes;
    }
    default:
      throw new Error(`Unknown auth method #${authMethod}`);
  }
}
