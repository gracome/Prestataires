"use client";

import { useActionState } from "react";
import type { UserRole } from "@prisma/client";
import {
  addTeamMemberAction,
  removeTeamMemberAction,
  resetTeamPasswordAction,
} from "@/app/dashboard/actions/settings";
import type { ActionState } from "@/lib/validation";
import { MAX_ACCOUNTS_PER_PROVIDER, roleLabelFr } from "@/lib/auth/permissions";

/**
 * The people who can sign in to this workspace.
 *
 * The generated password is shown once, inside the confirmation message. There
 * is no second chance on purpose: storing it anywhere so it could be read
 * again would defeat the point of hashing it.
 */

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastLoginAt: Date | null;
  isSelf: boolean;
};

const IDLE: ActionState = { status: "idle" };

export function TeamPanel({
  members,
  timezone,
}: {
  members: TeamMember[];
  timezone: string;
}) {
  const full = members.length >= MAX_ACCOUNTS_PER_PROVIDER;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".6rem" }}>
        {members.map((member) => (
          <li key={member.id} className="card">
            <div
              style={{
                display: "flex",
                gap: ".9rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  {member.name}
                  {member.isSelf ? (
                    <span style={{ fontWeight: 400, color: "var(--admin-muted)" }}>
                      {" "}
                      · vous
                    </span>
                  ) : null}
                </p>
                <p style={{ margin: ".2rem 0 0", fontSize: ".84rem", color: "var(--admin-muted)" }}>
                  {member.email}
                </p>
                <p style={{ margin: ".15rem 0 0", fontSize: ".8rem", color: "var(--admin-muted)" }}>
                  {roleLabelFr(member.role)} · dernière connexion{" "}
                  {member.lastLoginAt
                    ? new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: timezone,
                      }).format(member.lastLoginAt)
                    : "jamais"}
                </p>
              </div>

              {member.role === "STAFF" ? (
                <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                  <MemberButton
                    userId={member.id}
                    action={resetTeamPasswordAction}
                    label="Nouveau mot de passe"
                    confirm={`Générer un nouveau mot de passe pour ${member.name} ? L'ancien cessera de fonctionner.`}
                  />
                  <MemberButton
                    userId={member.id}
                    action={removeTeamMemberAction}
                    label="Retirer"
                    tone="danger"
                    confirm={`Retirer l'accès de ${member.name} ? Elle sera déconnectée immédiatement.`}
                  />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {full ? (
        <p style={{ margin: 0, fontSize: ".86rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
          Vous avez atteint {MAX_ACCOUNTS_PER_PROVIDER} comptes. Retirez-en un
          pour en ajouter un autre.
        </p>
      ) : (
        <AddMemberForm />
      )}
    </div>
  );
}

function AddMemberForm() {
  const [state, action, pending] = useActionState(addTeamMemberAction, IDLE);

  return (
    <form action={action} className="card">
      <h3 style={{ margin: "0 0 .3rem", fontSize: ".95rem", fontWeight: 700 }}>
        Ajouter quelqu&apos;un
      </h3>
      <p style={{ margin: "0 0 .9rem", fontSize: ".85rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
        Elle pourra gérer les rendez-vous, le calendrier, les prestations, les
        horaires, la galerie et les demandes de devis. Elle ne verra ni votre
        chiffre d&apos;affaires, ni vos rapports, ni vos coordonnées bancaires,
        ni vos paramètres.
      </p>

      <div className="team-pair">
        <div className="field" style={{ margin: 0 }}>
          <label className="label" htmlFor="team-name">
            Nom
          </label>
          <input id="team-name" name="name" className="input" required />
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label className="label" htmlFor="team-email">
            E-mail de connexion
          </label>
          <input id="team-email" name="email" type="email" className="input" required />
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-secondary"
        disabled={pending}
        style={{ marginTop: ".9rem" }}
      >
        {pending ? "Création…" : "Créer le compte"}
      </button>

      {state.status !== "idle" && state.message ? (
        <p
          style={{
            margin: ".9rem 0 0",
            padding: ".7rem .8rem",
            borderRadius: 9,
            fontSize: ".86rem",
            lineHeight: 1.6,
            wordBreak: "break-word",
            background:
              state.status === "success"
                ? "var(--tone-success-bg)"
                : "var(--tone-danger-bg)",
            color:
              state.status === "success"
                ? "var(--tone-success-fg)"
                : "var(--tone-danger-fg)",
          }}
        >
          {state.message}
        </p>
      ) : null}

      <style>{`
        .team-pair { display: grid; gap: .9rem; }
        @media (min-width: 600px) {
          .team-pair { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </form>
  );
}

function MemberButton({
  userId,
  action,
  label,
  tone = "default",
  confirm,
}: {
  userId: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  tone?: "default" | "danger";
  confirm: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className={tone === "danger" ? "btn btn-danger" : "btn btn-secondary"}
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(confirm)) event.preventDefault();
        }}
        style={{ fontSize: ".82rem", minHeight: 38, padding: ".35rem .75rem" }}
      >
        {pending ? "…" : label}
      </button>

      {state.status !== "idle" && state.message ? (
        <p
          style={{
            margin: ".5rem 0 0",
            fontSize: ".82rem",
            lineHeight: 1.6,
            wordBreak: "break-word",
            color:
              state.status === "success"
                ? "var(--tone-success-fg)"
                : "var(--tone-danger-fg)",
          }}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
