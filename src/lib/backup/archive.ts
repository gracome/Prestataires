import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { Prisma } from "@prisma/client";
import type { Archive } from "./export";

/**
 * Turning rows into one encrypted file, and back.
 *
 * The copy carries the names, telephone numbers and e-mail addresses of every
 * customer on the platform. It leaves the building as an email attachment, so
 * it is encrypted before it is written anywhere at all — not when it is sent.
 * Anything that handles the file afterwards handles ciphertext.
 */

/** Identifies the format, so a reader can refuse a file it cannot understand. */
const MAGIC = Buffer.from("BPBK", "ascii");
const FORMAT = 1;

const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/**
 * JSON cannot hold what Postgres gives back.
 *
 * Dates become strings that look like dates, Decimal becomes a string that
 * looks like a number, BigInt throws outright, and bytes become an object with
 * numeric keys. Each one is tagged on the way out so the restore puts back the
 * type it took, instead of a plausible-looking impostor that fails on the
 * first arithmetic.
 */
type Tagged = { __t: "date" | "dec" | "big" | "bin"; v: string };

function isTagged(value: unknown): value is Tagged {
  return (
    typeof value === "object" &&
    value !== null &&
    "__t" in value &&
    "v" in value &&
    typeof (value as Tagged).v === "string"
  );
}

function encode(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;

  if (value instanceof Date) return { __t: "date", v: value.toISOString() };
  if (Prisma.Decimal.isDecimal(value)) return { __t: "dec", v: value.toString() };
  if (typeof value === "bigint") return { __t: "big", v: value.toString() };
  if (value instanceof Uint8Array) {
    return { __t: "bin", v: Buffer.from(value).toString("base64") };
  }

  if (Array.isArray(value)) return value.map(encode);

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) out[key] = encode(inner);
    return out;
  }

  return value;
}

function decode(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;

  if (isTagged(value)) {
    switch (value.__t) {
      case "date":
        return new Date(value.v);
      case "dec":
        return new Prisma.Decimal(value.v);
      case "big":
        return BigInt(value.v);
      case "bin":
        return Buffer.from(value.v, "base64");
    }
  }

  if (Array.isArray(value)) return value.map(decode);

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) out[key] = decode(inner);
    return out;
  }

  return value;
}

export function serialize(archive: Archive): Buffer {
  return Buffer.from(JSON.stringify(encode(archive)), "utf8");
}

export function deserialize(plain: Buffer): Archive {
  return decode(JSON.parse(plain.toString("utf8"))) as Archive;
}

/**
 * scrypt rather than the passphrase itself: a phrase someone can remember has
 * nowhere near 256 bits in it, and scrypt makes each guess cost memory as well
 * as time. The salt is stored in the file, which is what salts are for.
 */
function keyFrom(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase.normalize("NFKC"), salt, KEY_BYTES, {
    N: 2 ** 15,
    r: 8,
    p: 1,
    maxmem: 128 * 2 ** 15 * 8 * 2,
  });
}

/** gzip, then AES-256-GCM. Compressing after encryption would not compress. */
export function seal(archive: Archive, passphrase: string): Buffer {
  if (passphrase.length < 16) {
    throw new Error(
      "BACKUP_PASSPHRASE fait moins de 16 caractères. La copie contient les " +
        "coordonnées de toutes les clientes : il faut une vraie phrase.",
    );
  }

  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(passphrase, salt), iv);

  const body = Buffer.concat([
    cipher.update(gzipSync(serialize(archive), { level: 9 })),
    cipher.final(),
  ]);

  return Buffer.concat([
    MAGIC,
    Buffer.from([FORMAT]),
    salt,
    iv,
    cipher.getAuthTag(),
    body,
  ]);
}

export function open(file: Buffer, passphrase: string): Archive {
  if (file.length < MAGIC.length + 1 + SALT_BYTES + IV_BYTES + TAG_BYTES) {
    throw new Error("Fichier trop court pour être une sauvegarde.");
  }
  if (!file.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Ce fichier n'est pas une sauvegarde BeautyPrest.");
  }

  let at = MAGIC.length;
  const format = file[at];
  at += 1;
  if (format !== FORMAT) {
    throw new Error(`Format de sauvegarde ${format} inconnu (attendu ${FORMAT}).`);
  }

  const salt = file.subarray(at, (at += SALT_BYTES));
  const iv = file.subarray(at, (at += IV_BYTES));
  const tag = file.subarray(at, (at += TAG_BYTES));
  const body = file.subarray(at);

  const decipher = createDecipheriv("aes-256-gcm", keyFrom(passphrase, salt), iv);
  decipher.setAuthTag(tag);

  let plain: Buffer;
  try {
    plain = Buffer.concat([decipher.update(body), decipher.final()]);
  } catch {
    // GCM fails the same way for a wrong passphrase and for a damaged file,
    // and it is worth saying so: someone who mistyped and someone whose
    // download was truncated take very different next steps.
    throw new Error(
      "Déchiffrement impossible : phrase secrète incorrecte, ou fichier abîmé.",
    );
  }

  return deserialize(gunzipSync(plain));
}
