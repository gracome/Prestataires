/**
 * Turning the VAPID public key into what the browser's push manager wants.
 *
 * The key travels as base64url, and `pushManager.subscribe` insists on raw
 * bytes. Getting this wrong fails deep inside the browser with a message that
 * says nothing useful, which is exactly why it lives on its own and is tested.
 *
 * No import: this runs in the browser and in a test, and neither should pull
 * anything else in to decode a string.
 */

/** A P-256 public key in uncompressed form: one marker byte then two 32-byte halves. */
export const VAPID_KEY_BYTES = 65;

export function urlBase64ToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  // base64url swaps two characters and drops the padding; put both back.
  const padding = (4 - (base64url.length % 4)) % 4;
  const normalised = base64url
    .padEnd(base64url.length + padding, "=")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const raw = atob(normalised);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

  return bytes;
}

/**
 * Whether a string can serve as an application server key.
 *
 * Used to refuse a misconfigured deployment out loud rather than letting every
 * provider meet the same opaque browser error one at a time.
 */
export function isValidVapidPublicKey(base64url: string | null | undefined): boolean {
  if (!base64url) return false;
  if (!/^[A-Za-z0-9_-]+=*$/.test(base64url)) return false;

  try {
    const bytes = urlBase64ToUint8Array(base64url);
    return bytes.length === VAPID_KEY_BYTES && bytes[0] === 0x04;
  } catch {
    return false;
  }
}
