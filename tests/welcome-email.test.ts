import { describe, expect, it } from "vitest";
import { providerPasswordReset, providerWelcome } from "@/lib/email/welcome";

/**
 * The letter that carries a provider's password.
 *
 * It is the only place that password ever exists in readable form: the
 * database holds a bcrypt hash and nothing else. A template that dropped the
 * password, or the address to use it at, would strand someone outside her own
 * account with no way back in but a reset.
 */

const INPUT = {
  businessName: "Studio Lina",
  ownerName: "Lina Traoré",
  email: "lina@exemple.test",
  password: "ACDE-FGHJ-KMNP-QRTU",
  loginUrl: "https://exemple.test/login",
  siteUrl: "https://exemple.test/studio-lina",
};

describe("providerWelcome", () => {
  it("carries the credentials in both versions of the message", () => {
    const letter = providerWelcome(INPUT);

    for (const body of [letter.html, letter.text]) {
      expect(body).toContain(INPUT.email);
      expect(body).toContain(INPUT.password);
      expect(body).toContain(INPUT.loginUrl);
    }
  });

  it("names the business in the subject, so it is findable later", () => {
    expect(providerWelcome(INPUT).subject).toContain("Studio Lina");
  });

  it("says the password will not be sent again", () => {
    // Someone who does not know this archives the mail and calls for help
    // three weeks later.
    expect(providerWelcome(INPUT).text).toMatch(/ne vous sera pas renvoyé/i);
  });

  it("points at the site that is not online yet", () => {
    const letter = providerWelcome(INPUT);
    expect(letter.text).toContain("studio-lina");
    expect(letter.text).toMatch(/pas encore en ligne/i);
  });

  it("greets with the first name alone", () => {
    expect(providerWelcome(INPUT).text).toContain("Bonjour Lina,");
    expect(
      providerWelcome({ ...INPUT, ownerName: "  Awa   Sossou  " }).text,
    ).toContain("Bonjour Awa,");
  });

  it("copes with a single name rather than greeting nobody", () => {
    expect(providerWelcome({ ...INPUT, ownerName: "Aïcha" }).text).toContain(
      "Bonjour Aïcha,",
    );
  });

  it("escapes a business name that carries markup", () => {
    // A name is provider-supplied text and lands in an HTML email.
    const letter = providerWelcome({
      ...INPUT,
      businessName: "Nails & <script>alert(1)</script>",
    });
    expect(letter.html).not.toContain("<script>");
    expect(letter.html).toContain("&amp;");
  });
});

describe("providerPasswordReset", () => {
  const RESET = {
    businessName: INPUT.businessName,
    ownerName: INPUT.ownerName,
    email: INPUT.email,
    password: "WXYZ-2346-7ACD-EFGH",
    loginUrl: INPUT.loginUrl,
  };

  it("carries the new password and where to use it", () => {
    const letter = providerPasswordReset(RESET);
    expect(letter.text).toContain(RESET.password);
    expect(letter.text).toContain(RESET.loginUrl);
  });

  it("says what happened rather than welcoming her again", () => {
    const letter = providerPasswordReset(RESET);
    expect(letter.text).toMatch(/réinitialisé/i);
    expect(letter.text).not.toMatch(/votre espace est prêt/i);
  });

  it("tells her to speak up if she did not ask for it", () => {
    expect(providerPasswordReset(RESET).text).toMatch(/n'êtes pas à l'origine/i);
  });

  it("does not leak the old password, having never seen it", () => {
    expect(providerPasswordReset(RESET).text).not.toContain(INPUT.password);
  });
});
