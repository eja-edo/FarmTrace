import crypto from 'crypto';
import { cryptoConfig } from '../config/crypto.js';

function deriveKeyBuffer(keyInput) {
  const provided = keyInput || cryptoConfig.aesKey;
  // Prefer hex if it decodes to 32 bytes; else treat as utf8 (must be 32 UTF-8 bytes)
  const hexBuf = Buffer.from(provided, 'hex');
  if (hexBuf.length === 32 && /^[0-9a-fA-F]+$/.test(provided)) return hexBuf;
  const utf8Buf = Buffer.from(provided, 'utf8');
  if (utf8Buf.length !== 32) {
    const err = new Error('AES key must be 32 bytes (256-bit)');
    err.code = 'ERR_INVALID_KEY_LENGTH';
    throw err;
  }
  return utf8Buf;
}

export function decryptAesGcm(base64Ciphertext, base64Iv, base64AuthTag, keyInput) {
  const key = deriveKeyBuffer(keyInput);
  const iv = Buffer.from(base64Iv || '', 'base64');
  const authTag = Buffer.from(base64AuthTag || '', 'base64');
  const ciphertext = Buffer.from(base64Ciphertext || '', 'base64');

  if (iv.length !== cryptoConfig.ivLength) {
    const err = new Error(`Invalid IV length: expected ${cryptoConfig.ivLength} bytes`);
    err.code = 'ERR_CRYPTO_INVALID_IV_LENGTH';
    throw err;
  }
  if (authTag.length !== cryptoConfig.authTagLength) {
    const err = new Error(`Invalid authTag length: expected ${cryptoConfig.authTagLength} bytes`);
    err.code = 'ERR_CRYPTO_INVALID_AUTHTAG_LENGTH';
    throw err;
  }
  if (ciphertext.length === 0) {
    const err = new Error('Ciphertext is empty');
    err.code = 'ERR_CRYPTO_EMPTY_CIPHERTEXT';
    throw err;
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: cryptoConfig.authTagLength });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export function encryptAesGcm(plaintext, keyInput) {
  const key = deriveKeyBuffer(keyInput);
  const iv = crypto.randomBytes(cryptoConfig.ivLength);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: cryptoConfig.authTagLength });
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

