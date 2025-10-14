export const cryptoConfig = {
  // AES-256-GCM requires 32-byte key
  aesKey: process.env.AES_KEY || '0123456789abcdef0123456789abcdef',
  ivLength: 12, // GCM standard
  authTagLength: 16
};

