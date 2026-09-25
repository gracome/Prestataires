import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "./env";

/**
 * At-rest encryption and token helpers.
 *
 * Google OAuth tokens are encrypted with AES-256-GCM before they touch the
 * database (cahier des charges section 23). Session cookies and customer
 * access links are random 256-bit tokens; only their SHA-256 digest is stored.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION = "v1";

function key(): Buffer {
  const raw = env().ENCRYPTION_KEY.trim();

  // Accept hex (64 chars) or base64; anything else is hashed down to 32 bytes
  // so a passphrase still yields a valid key rather than a hard failure.
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) return base64;

  return createHash("sha256").update(raw).digest();
}

/** Returns "v1.<iv>.<authTag>.<ciphertext>", all base64url. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Malformed encrypted payload");
  }
  const [, ivPart, tagPart, dataPart] = parts;

  const decipher = createDecipheriv(
    ALGORITHM,
    key(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** 256 bits of entropy, URL-safe. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    // Still burn a comparison so the failure cost does not depend on length.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}
