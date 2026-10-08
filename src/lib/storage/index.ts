import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { env } from "@/lib/env";

/**
 * File storage for logos, gallery photos and payment proofs.
 *
 * Payment proofs are private (cahier des charges section 23): the stored key
 * is a random UUID under a per-provider prefix, the file never sits in the
 * public web root, and it is only ever served by an authorised route that
 * checks the caller owns the appointment.
 */

export type StoredFile = {
  key: string;
  size: number;
  mimeType: string;
  checksum: string;
};

export const PROOF_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_PROOF_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class StorageError extends Error {
  constructor(
    message: string,
    readonly code: "TOO_LARGE" | "BAD_TYPE" | "NOT_FOUND" | "IO",
  ) {
    super(message);
    this.name = "StorageError";
  }
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

/**
 * Magic-number check. A browser-supplied content type is a hint, not a fact,
 * so the first bytes decide what the file actually is.
 */
export function sniffMimeType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  const is = (offset: number, signature: number[]) =>
    signature.every((byte, i) => bytes[offset + i] === byte);

  if (is(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (is(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (is(0, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";

  // RIFF....WEBP
  if (is(0, [0x52, 0x49, 0x46, 0x46]) && is(8, [0x57, 0x45, 0x42, 0x50])) {
    return "image/webp";
  }
  // ....ftypavif
  if (is(4, [0x66, 0x74, 0x79, 0x70]) && is(8, [0x61, 0x76, 0x69, 0x66])) {
    return "image/avif";
  }

  return null;
}

export type PutOptions = {
  prefix: string;
  allowedMimeTypes: readonly string[];
  maxBytes: number;
  declaredMimeType?: string;
};

export async function putFile(
  bytes: Uint8Array,
  options: PutOptions,
): Promise<StoredFile> {
  if (bytes.byteLength === 0) {
    throw new StorageError("Le fichier est vide.", "BAD_TYPE");
  }
  if (bytes.byteLength > options.maxBytes) {
    throw new StorageError(
      `Fichier trop volumineux (maximum ${Math.round(options.maxBytes / (1024 * 1024))} Mo).`,
      "TOO_LARGE",
    );
  }

  const sniffed = sniffMimeType(bytes);
  if (!sniffed || !options.allowedMimeTypes.includes(sniffed)) {
    throw new StorageError(
      "Format non accepté. Formats autorisés : JPG, PNG, WEBP ou PDF.",
      "BAD_TYPE",
    );
  }

  const extension = EXTENSIONS[sniffed] ?? "bin";
  const key = `${normalisePrefix(options.prefix)}/${randomUUID()}.${extension}`;
  const checksum = createHash("sha256").update(bytes).digest("hex");

  await driver().put(key, bytes, sniffed);

  return { key, size: bytes.byteLength, mimeType: sniffed, checksum };
}

export async function getFile(
  key: string,
): Promise<{ bytes: Buffer; mimeType: string }> {
  return driver().get(key);
}

export async function deleteFile(key: string): Promise<void> {
  await driver().delete(key);
}

function normalisePrefix(prefix: string): string {
  return prefix
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/");
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

type Driver = {
  put(key: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  get(key: string): Promise<{ bytes: Buffer; mimeType: string }>;
  delete(key: string): Promise<void>;
};

let cachedDriver: Driver | null = null;

function driver(): Driver {
  if (cachedDriver) return cachedDriver;
  cachedDriver =
    env().STORAGE_DRIVER === "s3" ? s3Driver() : localDriver();
  return cachedDriver;
}

/** Test helper. */
export function resetStorageDriver(): void {
  cachedDriver = null;
}

function localDriver(): Driver {
  const root = resolve(process.cwd(), env().STORAGE_LOCAL_DIR);

  /** Reject any key that would escape the storage root. */
  const safePath = (key: string): string => {
    const target = resolve(root, key);
    if (target !== root && !target.startsWith(root + sep)) {
      throw new StorageError("Chemin de fichier invalide.", "IO");
    }
    return target;
  };

  return {
    async put(key, bytes) {
      const target = safePath(key);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes);
      // The mime type is recoverable from the bytes, so nothing else is stored.
    },
    async get(key) {
      const target = safePath(key);
      try {
        const bytes = await readFile(target);
        const mimeType = sniffMimeType(bytes) ?? "application/octet-stream";
        return { bytes, mimeType };
      } catch {
        throw new StorageError("Fichier introuvable.", "NOT_FOUND");
      }
    },
    async delete(key) {
      try {
        await unlink(safePath(key));
      } catch {
        // Deleting something already gone is not an error.
      }
    },
  };
}

/**
 * S3-compatible driver. Implemented with plain fetch and SigV4 so the app
 * carries no extra SDK; any S3-compatible host (Scaleway, Backblaze, R2,
 * MinIO) works by pointing S3_ENDPOINT at it.
 */
function s3Driver(): Driver {
  const config = env();
  const bucket = config.S3_BUCKET;
  const region = config.S3_REGION ?? "us-east-1";
  const accessKey = config.S3_ACCESS_KEY_ID;
  const secretKey = config.S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKey || !secretKey) {
    throw new StorageError(
      "Configuration S3 incomplète (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY).",
      "IO",
    );
  }

  const endpoint = (config.S3_ENDPOINT ?? `https://s3.${region}.amazonaws.com`)
    .replace(/\/+$/, "");

  const request = async (
    method: "PUT" | "GET" | "DELETE",
    key: string,
    body?: Uint8Array,
    contentType?: string,
  ): Promise<Response> => {
    const url = `${endpoint}/${bucket}/${key}`;
    const { signS3Request } = await import("./s3-signature");
    const headers = await signS3Request({
      method,
      url,
      region,
      accessKey,
      secretKey,
      body: body ?? new Uint8Array(),
      contentType,
    });
    return fetch(url, { method, headers, body: body ? Buffer.from(body) : undefined });
  };

  return {
    async put(key, bytes, mimeType) {
      const response = await request("PUT", key, bytes, mimeType);
      if (!response.ok) {
        throw new StorageError(
          `Échec de l'envoi vers S3 (${response.status}).`,
          "IO",
        );
      }
    },
    async get(key) {
      const response = await request("GET", key);
      if (response.status === 404) {
        throw new StorageError("Fichier introuvable.", "NOT_FOUND");
      }
      if (!response.ok) {
        throw new StorageError(`Échec de lecture S3 (${response.status}).`, "IO");
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      const mimeType =
        sniffMimeType(bytes) ??
        response.headers.get("content-type") ??
        "application/octet-stream";
      return { bytes, mimeType };
    },
    async delete(key) {
      await request("DELETE", key);
    },
  };
}

export function proofPrefix(providerId: string): string {
  return join("proofs", providerId).split(sep).join("/");
}

export function mediaPrefix(providerId: string): string {
  return join("media", providerId).split(sep).join("/");
}
