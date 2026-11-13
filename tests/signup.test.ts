import { describe, expect, it } from "vitest";
import { signUpSchema } from "@/lib/validation";
import { providerSignedUp } from "@/lib/email/welcome";
import { PRODUCT } from "@/lib/marketing/product";

/**
 * Opening an account from the public page.
 *
 * Until this existed, every account was typed out by a platform
 * administrator, and the only thing standing between a stranger and a
 * provider row was a login screen. Now the form itself is the door, so what
 * it refuses is a security boundary and not a nicety.
 *
 * Two things are pinned here. The schema, because it is the whole of the
 * validation: the action trusts it and writes straight afterwards. And the
 * letter that follows, because the one thing it must never contain is the
 * password she just chose.
 */

const VALID = {
  businessName: "Studio Lina",
  ownerName: "Lina Traoré",
  email: "lina@exemple.test",
  phone: "+229 69 00 00 00",
  city: "Cotonou",
  activity: "ongles",
  plan: "RENDEZ_VOUS",
  password: "mot-de-passe-long",
  confirmPassword: "mot-de-passe-long",
};

describe("signUpSchema", () => {
  it("accepts a complete, ordinary sign-up", () => {
    const parsed = signUpSchema.safeParse(VALID);
    expect(parsed.success).toBe(true);
  });

  it("trims the fields that become her public address", () => {
    const parsed = signUpSchema.parse({
      ...VALID,
      businessName: "  Studio Lina  ",
      city: " Cotonou ",
    });

    expect(parsed.businessName).toBe("Studio Lina");
    expect(parsed.city).toBe("Cotonou");
  });

  it("refuses two passwords that do not match, on the second field", () => {
    const parsed = signUpSchema.safeParse({
      ...VALID,
      confirmPassword: "autre-chose-encore",
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].path).toEqual(["confirmPassword"]);
  });

  it("refuses a password short enough to guess", () => {
    const parsed = signUpSchema.safeParse({
      ...VALID,
      password: "secret",
      confirmPassword: "secret",
    });

    expect(parsed.success).toBe(false);
  });

  it("refuses a package that is not one of the three", () => {
    // The guard reads this value to decide which screens exist, so a plan
    // posted by hand must not reach the database.
    const parsed = signUpSchema.safeParse({ ...VALID, plan: "GRATUIT" });
    expect(parsed.success).toBe(false);
  });

  it("refuses a trade that is not one of the known ones", () => {
    // The activity picks the starter catalogue and the palette; an unknown
    // one would land on a lookup with nothing behind it.
    const parsed = signUpSchema.safeParse({ ...VALID, activity: "plomberie" });
    expect(parsed.success).toBe(false);
  });

  it("requires a way to reach her", () => {
    expect(signUpSchema.safeParse({ ...VALID, phone: "" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...VALID, email: "lina" }).success).toBe(false);
  });
});

describe("providerSignedUp", () => {
  const LETTER = providerSignedUp({
    businessName: "Studio Lina",
    ownerName: "Lina Traoré",
    email: "lina@exemple.test",
    planName: "Rendez-vous",
    loginUrl: "https://exemple.test/login",
    siteUrl: "https://exemple.test/studio-lina",
  });

  it("never carries the password she chose", () => {
    // The administrator letter posts a generated password because somebody
    // else created that account. Here nobody else ever knew it, and writing
    // it into a mailbox would undo that.
    expect(LETTER.html).not.toContain("Mot de passe");
    expect(LETTER.text).not.toContain("Mot de passe");
  });

  it("gives her the two addresses she needs", () => {
    expect(LETTER.html).toContain("https://exemple.test/login");
    expect(LETTER.html).toContain("https://exemple.test/studio-lina");
  });

  it("says the site is not visible yet", () => {
    expect(LETTER.text).toContain("pas encore visible");
  });

  it("is signed by the platform, not by her salon", () => {
    expect(LETTER.subject).toContain(PRODUCT.name);
  });
});
