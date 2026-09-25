import { describe, expect, it, beforeEach } from "vitest";
import { decryptSecret, encryptSecret, randomToken, sha256, constantTimeEquals } from "@/lib/crypto";
import { hashPassword, verifyPassword, checkPasswordStrength } from "@/lib/auth/password";
import { rateLimit, resetRateLimits, clientIp } from "@/lib/rate-limit";
import { sniffMimeType } from "@/lib/storage";
import { slugify, uniqueSlug, bookingReference } from "@/lib/ids";

describe("token encryption", () => {
  it("round-trips a Google refresh token", () => {
    const secret = "1//0abcdefghijklmnopqrstuvwxyz-refresh-token";
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("produces a different ciphertext each time", () => {
    const a = encryptSecret("same input");
    const b = encryptSecret("same input");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("refuses a tampered payload", () => {
    const encrypted = encryptSecret("sensitive");
    const parts = encrypted.split(".");
    // Flip the last character of the ciphertext.
    const last = parts[3];
    parts[3] = last.slice(0, -1) + (last.at(-1) === "A" ? "B" : "A");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });

  it("refuses a malformed payload", () => {
    expect(() => decryptSecret("not-encrypted")).toThrow();
    expect(() => decryptSecret("v2.a.b.c")).toThrow();
  });
});

describe("tokens and hashing", () => {
  it("issues tokens with enough entropy to be unguessable", () => {
    const token = randomToken();
    // 32 bytes in base64url is 43 characters.
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(new Set(Array.from({ length: 200 }, () => randomToken())).size).toBe(200);
  });

  it("hashes deterministically", () => {
    expect(sha256("abc")).toBe(sha256("abc"));
    expect(sha256("abc")).not.toBe(sha256("abd"));
  });

  it("compares without leaking length mismatches as an exception", () => {
    expect(constantTimeEquals("abc", "abc")).toBe(true);
    expect(constantTimeEquals("abc", "abd")).toBe(false);
    expect(constantTimeEquals("abc", "abcdef")).toBe(false);
    expect(constantTimeEquals("", "")).toBe(true);
  });
});

describe("passwords", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("Correct2025Horse");
    expect(await verifyPassword("Correct2025Horse", hash)).toBe(true);
    expect(await verifyPassword("correct2025horse", hash)).toBe(false);
  });

  it("never stores the password itself", async () => {
    const hash = await hashPassword("Correct2025Horse");
    expect(hash).not.toContain("Correct2025Horse");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("returns false rather than throwing on a corrupt hash", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });

  it("enforces the minimum policy", () => {
    expect(checkPasswordStrength("Correct2025Horse").ok).toBe(true);
    expect(checkPasswordStrength("short1A").ok).toBe(false);
    expect(checkPasswordStrength("alllowercase123").ok).toBe(false);
    expect(checkPasswordStrength("NoDigitsAtAllHere").ok).toBe(false);
  });
});

describe("rate limiting", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows up to the limit then refuses", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit("key", 3, 60).allowed).toBe(true);
    }
    const blocked = rateLimit("key", 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate counters per key", () => {
    rateLimit("a", 1, 60);
    expect(rateLimit("a", 1, 60).allowed).toBe(false);
    expect(rateLimit("b", 1, 60).allowed).toBe(true);
  });

  it("reads the client address from the usual proxy headers", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })),
    ).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("upload type sniffing", () => {
  const withHeader = (bytes: number[]): Uint8Array => {
    const buffer = new Uint8Array(32);
    buffer.set(bytes, 0);
    return buffer;
  };

  it("recognises the formats accepted for a payment proof", () => {
    expect(sniffMimeType(withHeader([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(
      sniffMimeType(withHeader([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe("image/png");
    expect(sniffMimeType(withHeader([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(
      "application/pdf",
    );
  });

  it("recognises WEBP by its RIFF container", () => {
    const bytes = new Uint8Array(32);
    bytes.set([0x52, 0x49, 0x46, 0x46], 0);
    bytes.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffMimeType(bytes)).toBe("image/webp");
  });

  it("refuses content that only claims to be an image", () => {
    // An HTML page or a script must not pass as a proof.
    const html = new TextEncoder().encode("<html><script>alert(1)</script>");
    expect(sniffMimeType(html)).toBeNull();

    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">');
    expect(sniffMimeType(svg)).toBeNull();
  });

  it("refuses a file too short to identify", () => {
    expect(sniffMimeType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("identifiers", () => {
  it("folds accents and punctuation into a URL-safe slug", () => {
    expect(slugify("Prothésiste Ongulaire")).toBe("prothesiste-ongulaire");
    expect(slugify("  Belle Mains — Studio!  ")).toBe("belle-mains-studio");
    expect(slugify("Café & Thé")).toBe("cafe-the");
  });

  it("makes a slug unique without colliding", () => {
    expect(uniqueSlug("Pose gel", [])).toBe("pose-gel");
    expect(uniqueSlug("Pose gel", ["pose-gel"])).toBe("pose-gel-2");
    expect(uniqueSlug("Pose gel", ["pose-gel", "pose-gel-2"])).toBe("pose-gel-3");
  });

  it("falls back to a usable slug for input with no letters", () => {
    expect(uniqueSlug("!!!", [])).toBe("item");
  });

  it("builds booking references in a readable shape", () => {
    const reference = bookingReference();
    expect(reference).toMatch(/^RDV-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("never emits both halves of a pair people mishear on the phone", () => {
    // The alphabet may keep one member of each pair, never both: "8" is
    // unambiguous precisely because "B" is absent.
    const pairs = [
      ["0", "O"],
      ["1", "I"],
      ["1", "L"],
      ["I", "L"],
      ["5", "S"],
      ["8", "B"],
      ["2", "Z"],
    ];

    const seen = new Set(
      Array.from({ length: 400 }, () => bookingReference())
        .join("")
        .replace(/^RDV|-/g, ""),
    );

    for (const [left, right] of pairs) {
      expect(seen.has(left) && seen.has(right)).toBe(false);
    }
  });
});
