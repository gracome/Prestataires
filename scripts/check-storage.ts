/**
 * Verify the configured storage driver really works, before a deployment
 * depends on it.
 *
 * The S3 driver signs its own requests (src/lib/storage/s3-signature.ts)
 * instead of carrying an SDK, so a wrong region, a path-style endpoint or a
 * token missing the write permission only surfaces on the first real upload.
 * This does that upload now, from a shell:
 *
 *   npm run storage:check
 *
 * Writes a small file, reads it back, compares the bytes, deletes it.
 */

import {
  deleteFile,
  getFile,
  putFile,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  StorageError,
} from "../src/lib/storage";
import { env } from "../src/lib/env";

/** A PNG header padded past the 12 bytes the sniffer needs to decide. */
const SAMPLE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

async function main(): Promise<void> {
  const config = env();

  console.log(`driver   : ${config.STORAGE_DRIVER}`);
  if (config.STORAGE_DRIVER === "s3") {
    console.log(`bucket   : ${config.S3_BUCKET ?? "(absent)"}`);
    console.log(`region   : ${config.S3_REGION ?? "us-east-1"}`);
    console.log(`endpoint : ${config.S3_ENDPOINT ?? "(AWS par défaut)"}`);
  } else {
    console.log(`dossier  : ${config.STORAGE_LOCAL_DIR}`);
  }

  const stored = await putFile(SAMPLE, {
    prefix: "healthcheck",
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxBytes: MAX_IMAGE_BYTES,
  });
  console.log(`\nput      : ok (${stored.key})`);

  const read = await getFile(stored.key);
  if (!read.bytes.equals(SAMPLE)) {
    throw new Error(
      `les octets relus diffèrent (${read.bytes.length} au lieu de ${SAMPLE.length})`,
    );
  }
  console.log(`get      : ok (${read.bytes.length} octets, ${read.mimeType})`);

  await deleteFile(stored.key);
  console.log("delete   : ok");

  // The delete must really have removed it, otherwise payment proofs would
  // pile up in the bucket long after the appointment is gone.
  try {
    await getFile(stored.key);
    console.log("\nAttention : le fichier reste lisible après suppression.");
    process.exitCode = 1;
    return;
  } catch (error) {
    if (!(error instanceof StorageError) || error.code !== "NOT_FOUND") throw error;
  }

  console.log("\nStockage opérationnel.");
}

main().catch((error) => {
  console.error(`\nÉchec : ${error instanceof Error ? error.message : error}`);
  if (error instanceof StorageError && error.code === "IO") {
    console.error(
      "\nPistes : identifiants invalides, jeton en lecture seule, région " +
        'incorrecte (R2 attend "auto"), ou bucket inexistant.',
    );
  }
  process.exitCode = 1;
});
