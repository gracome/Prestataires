"use client";

import { useActionState } from "react";
import { IDLE } from "@/lib/validation";
import { login } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, submit, pending] = useActionState(login, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  return (
    <form action={submit} noValidate>
      <input type="hidden" name="next" value={next ?? "/dashboard"} />

      {state.status === "error" ? (
        <p
          role="alert"
          style={{
            background: "#fbe4e2",
            color: "#8f241c",
            padding: ".75rem .9rem",
            borderRadius: 10,
            fontSize: ".88rem",
            margin: "0 0 1rem",
            lineHeight: 1.5,
          }}
        >
          {state.message}
        </p>
      ) : null}

      <div className="field">
        <label className="label" htmlFor="email">
          Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="username"
          required
          autoFocus
          aria-invalid={errors.email ? true : undefined}
        />
        {errors.email ? (
          <p className="error-text" role="alert">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="label" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
          aria-invalid={errors.password ? true : undefined}
        />
        {errors.password ? (
          <p className="error-text" role="alert">
            {errors.password}
          </p>
        ) : null}
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
