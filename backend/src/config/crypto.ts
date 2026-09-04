import crypto from "node:crypto";
import { env } from "./env.js";

// Plaid access tokens are the equivalent of a login credential for the
// user's actual bank account. They are encrypted at rest with AES-256-GCM,
// a random IV per value, and an auth tag that detects tampering/corruption.

const key = Buffer.from(env.tokenEncryptionKey, "base64");
if (key.length !== 32) {
  throw new Error(
    `TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (got ${key.length}). Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  );
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function isEncryptedToken(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  const [ivB64, authTagB64, ciphertextB64] = parts;
  if (!ivB64 || !authTagB64 || !ciphertextB64) return false;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  return iv.length === 12 && authTag.length === 16 && ciphertext.length > 0;
}

export function decryptToken(encrypted: string): string {
  if (!isEncryptedToken(encrypted)) {
    throw new Error("Malformed encrypted token — expected iv:authTag:ciphertext");
  }
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

// Explicit compatibility bridge for legacy Sandbox Items. The caller must
// persist `encrypted` before the migration is considered complete.
export function decryptTokenForMigration(value: string): {
  plaintext: string;
  encrypted: string;
  migrated: boolean;
} {
  if (isEncryptedToken(value)) {
    return { plaintext: decryptToken(value), encrypted: value, migrated: false };
  }
  return { plaintext: value, encrypted: encryptToken(value), migrated: true };
}
