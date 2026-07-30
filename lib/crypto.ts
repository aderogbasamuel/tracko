import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

/**
 * Password hashing and at-rest encryption.
 *
 * The wallet owner key is the trader's money. Encrypting it with a key that
 * lives in the same process is a compromise, not a solution — a production
 * deployment must hold it in a KMS or HSM so the application never sees the
 * plaintext. That migration is a change to this file alone, which is why every
 * caller goes through these two functions rather than touching ciphertext.
 */

const KEY_LENGTH = 32;
const IV_LENGTH = 12; // GCM standard
const SCRYPT_KEYLEN = 64;

function encryptionKey(): Buffer {
  const secret = process.env.TRACKO_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      "TRACKO_ENCRYPTION_KEY must be set to at least 32 characters before wallet keys can be stored."
    );
  }
  // Derived rather than used raw so a human-typed secret still yields a
  // full-entropy 32-byte key.
  return scryptSync(secret, "tracko:wallet-key:v1", KEY_LENGTH);
}

/** AES-256-GCM. Output is `iv.authTag.ciphertext`, all base64url. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(payload: string): string {
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Stored secret is malformed.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivPart, "base64url")
  );
  // Throws if the ciphertext was tampered with, which is the point of GCM.
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

/** scrypt with a per-user salt. Stored as `salt.hash`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString("base64url")}.${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltPart, hashPart] = stored.split(".");
  if (!saltPart || !hashPart) return false;
  const expected = Buffer.from(hashPart, "base64url");
  const actual = scryptSync(password, Buffer.from(saltPart, "base64url"), expected.length);
  // Constant-time: a length-varying or early-exit compare leaks the hash.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
