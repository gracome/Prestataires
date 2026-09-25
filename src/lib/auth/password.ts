import bcrypt from "bcryptjs";

/**
 * Password hashing (cahier des charges section 23).
 *
 * bcrypt with a work factor of 12 is the deliberate choice here: it is pure
 * JavaScript, so the app deploys to any Node host without a native build step.
 */

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export type PasswordCheck = {
  ok: boolean;
  problems: string[];
};

/** Minimum policy enforced on the server, never only in the browser. */
export function checkPasswordStrength(password: string): PasswordCheck {
  const problems: string[] = [];

  if (password.length < 10) {
    problems.push("Le mot de passe doit contenir au moins 10 caractères.");
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    problems.push("Il doit contenir des minuscules et des majuscules.");
  }
  if (!/[0-9]/.test(password)) {
    problems.push("Il doit contenir au moins un chiffre.");
  }

  return { ok: problems.length === 0, problems };
}
