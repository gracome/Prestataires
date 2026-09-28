import { describe, expect, it } from "vitest";
import {
  VAPID_KEY_BYTES,
  isValidVapidPublicKey,
  urlBase64ToUint8Array,
} from "@/lib/notifications/vapid";

/**
 * The one conversion standing between a provider and her notifications.
 *
 * `pushManager.subscribe` rejects a malformed application server key with an
 * error that names nothing, so a mistake here would look like "notifications
 * do not work on this phone". Worth pinning down.
 */

// A real VAPID public key: 65 bytes, base64url, no padding.
const KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

describe("urlBase64ToUint8Array", () => {
  it("decodes a VAPID key to the length the browser expects", () => {
    expect(urlBase64ToUint8Array(KEY)).toHaveLength(VAPID_KEY_BYTES);
  });

  it("keeps the marker byte of an uncompressed P-256 point", () => {
    // 0x04 is what says "the two halves that follow are x and y".
    expect(urlBase64ToUint8Array(KEY)[0]).toBe(0x04);
  });

  it("restores the padding base64url leaves out", () => {
    // "AQ" is one byte once padded to "AQ==". Unpadded, atob would refuse it.
    expect(Array.from(urlBase64ToUint8Array("AQ"))).toEqual([1]);
    expect(Array.from(urlBase64ToUint8Array("AQI"))).toEqual([1, 2]);
    expect(Array.from(urlBase64ToUint8Array("AQID"))).toEqual([1, 2, 3]);
  });

  it("maps the two characters base64url swaps", () => {
    // "-" stands for "+" and "_" for "/": decoding them literally would give
    // different bytes and a key the push service rejects.
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual(
      Array.from(urlBase64ToUint8Array("+/8")),
    );
    expect(Array.from(urlBase64ToUint8Array("--__"))[0]).toBe(0xfb);
  });

  it("accepts a key that already carries its padding", () => {
    expect(Array.from(urlBase64ToUint8Array("AQ=="))).toEqual([1]);
  });
});

describe("isValidVapidPublicKey", () => {
  it("accepts a real key", () => {
    expect(isValidVapidPublicKey(KEY)).toBe(true);
  });

  it("refuses a missing one rather than letting the browser fail", () => {
    expect(isValidVapidPublicKey(null)).toBe(false);
    expect(isValidVapidPublicKey(undefined)).toBe(false);
    expect(isValidVapidPublicKey("")).toBe(false);
  });

  it("refuses a key of the wrong length", () => {
    // A private key pasted into the public slot: 32 bytes, not 65.
    expect(isValidVapidPublicKey("aGVsbG8gdGhlcmUgdGhpcyBpcyAzMiBi")).toBe(false);
  });

  it("refuses anything that is not base64url", () => {
    expect(isValidVapidPublicKey("not a key")).toBe(false);
    expect(isValidVapidPublicKey("mailto:someone@example.com")).toBe(false);
  });

  it("refuses a key whose first byte is not the uncompressed marker", () => {
    const bytes = urlBase64ToUint8Array(KEY);
    bytes[0] = 0x03;
    const mangled = Buffer.from(bytes).toString("base64url");
    expect(isValidVapidPublicKey(mangled)).toBe(false);
  });
});
