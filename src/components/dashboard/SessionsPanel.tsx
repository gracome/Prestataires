"use client";

import { useActionState } from "react";
import { revokeOtherSessions } from "@/app/dashboard/actions/sessions";
import { IDLE, type ActionState } from "@/lib/validation";

export type SessionRow = {
  id: string;
  current: boolean;
  device: string;
  ipAddress: string | null;
  signedIn: string;
  lastSeen: string;
};

/**
 * Where she is signed in, and the button that ends it.
 *
 * The list matters as much as the button: somebody who does not remember
 * leaving a session open has no reason to press anything, so the point is to
 * show her the phone she lent out last week before asking what to do about it.
 */
export function SessionsPanel({ sessions }: { sessions: SessionRow[] }) {
  const [state, submit, pending] = useActionState<ActionState, FormData>(
    () => revokeOtherSessions(),
    IDLE,
  );

  const others = sessions.filter((session) => !session.current).length;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <table className="data" data-stack>
        <thead>
          <tr>
            <th scope="col">Appareil</th>
            <th scope="col">Connexion</th>
            <th scope="col">Dernière activité</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td data-label="Appareil">
                {session.device}
                {session.current ? (
                  <span className="pill pill-success" style={{ marginLeft: ".5rem" }}>
                    cet appareil
                  </span>
                ) : null}
                {session.ipAddress ? (
                  <span
                    style={{
                      display: "block",
                      color: "var(--admin-muted)",
                      fontSize: ".82rem",
                    }}
                  >
                    {session.ipAddress}
                  </span>
                ) : null}
              </td>
              <td data-label="Connexion" style={{ whiteSpace: "nowrap" }}>
                {session.signedIn}
              </td>
              <td data-label="Dernière activité" style={{ whiteSpace: "nowrap" }}>
                {session.lastSeen}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {state.status !== "idle" ? (
        <p
          className={state.status === "error" ? "error-text" : "hint"}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <form action={submit}>
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={pending || others === 0}
        >
          {pending
            ? "Déconnexion…"
            : others === 0
              ? "Aucun autre appareil connecté"
              : `Déconnecter les autres appareils (${others})`}
        </button>
      </form>
    </div>
  );
}
