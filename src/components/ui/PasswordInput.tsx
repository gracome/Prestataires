"use client";

import { useId, useState, type ComponentPropsWithoutRef } from "react";

/**
 * A password field you can look at.
 *
 * Typing a long password blind on a phone keyboard, with autocorrect helping,
 * is how people end up locked out of their own dashboard — and the usual
 * remedy, a second "confirm" box, only doubles the guessing. Letting her check
 * what she typed is the fix.
 *
 * It stays hidden by default and reverts to hidden on every reload, because
 * revealing is a deliberate act and a screen in a salon is rarely private. The
 * toggle is a real button, so it is reachable by keyboard and announced by a
 * screen reader; its label says what pressing it will do, which is the half
 * that an icon alone cannot carry.
 *
 * `type` is not accepted: this component owns it. Everything else a normal
 * input takes passes straight through.
 */
export function PasswordInput({
  className = "input",
  id,
  ...rest
}: Omit<ComponentPropsWithoutRef<"input">, "type">) {
  const [shown, setShown] = useState(false);
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  return (
    <span className="pw">
      <input
        {...rest}
        id={inputId}
        type={shown ? "text" : "password"}
        className={`${className} pw-input`}
      />

      <button
        type="button"
        className="pw-toggle"
        aria-controls={inputId}
        aria-pressed={shown}
        onClick={() => setShown((value) => !value)}
      >
        <span className="visually-hidden">
          {shown ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        </span>
        <EyeIcon crossed={shown} />
      </button>
    </span>
  );
}

/** An eye, struck through once the password is on screen. */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
      {crossed ? <path d="M4 20 20 4" /> : null}
    </svg>
  );
}
