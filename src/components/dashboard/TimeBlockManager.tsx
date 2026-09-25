"use client";

import { useActionState, useState, useTransition } from "react";
import { IDLE } from "@/lib/validation";
import {
  createTimeBlockAction,
  deleteTimeBlockAction,
} from "@/app/dashboard/actions/schedule";

/**
 * Days off, holidays and manually blocked slots (cahier des charges section 6).
 * Periods mirrored from Google Calendar are listed too, but read-only: they
 * are edited in Google itself.
 */

export type BlockRow = {
  id: string;
  type: "TIME_OFF" | "HOLIDAY" | "MANUAL_BLOCK" | "EXTERNAL_CALENDAR";
  label: string;
  range: string;
  reason: string | null;
  editable: boolean;
};

const TYPE_LABELS: Record<BlockRow["type"], string> = {
  TIME_OFF: "Congé",
  HOLIDAY: "Jour férié",
  MANUAL_BLOCK: "Créneau bloqué",
  EXTERNAL_CALENDAR: "Google Calendar",
};

export function TimeBlockManager({
  blocks,
  today,
}: {
  blocks: BlockRow[];
  today: string;
}) {
  const [state, submit, pending] = useActionState(createTimeBlockAction, IDLE);
  const [allDay, setAllDay] = useState(true);
  const [removing, startRemoving] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function remove(block: BlockRow) {
    if (!window.confirm("Supprimer cette indisponibilité ?")) return;
    startRemoving(async () => {
      const result = await deleteTimeBlockAction(block.id);
      setFeedback(result.status === "idle" ? null : result.message);
    });
  }

  return (
    <div>
      <form action={submit} className="card" style={{ marginBottom: "1.5rem" }}>
        <p style={{ margin: "0 0 1rem", fontWeight: 700 }}>
          Ajouter une indisponibilité
        </p>

        {state.status !== "idle" ? (
          <p
            role="status"
            style={{
              margin: "0 0 1rem",
              padding: ".7rem .85rem",
              borderRadius: 10,
              fontSize: ".88rem",
              background: state.status === "success" ? "var(--tone-success-bg)" : "var(--tone-danger-bg)",
              color: state.status === "success" ? "var(--tone-success-fg)" : "var(--tone-danger-fg)",
              lineHeight: 1.55,
            }}
          >
            {state.message}
          </p>
        ) : null}

        <div className="field">
          <label className="label" htmlFor="type">
            Type
          </label>
          <select id="type" name="type" className="select" defaultValue="TIME_OFF">
            <option value="TIME_OFF">Congé ou absence</option>
            <option value="HOLIDAY">Jour férié</option>
            <option value="MANUAL_BLOCK">Créneau bloqué</option>
          </select>
        </div>

        <label style={checkboxLabel}>
          <input
            type="checkbox"
            name="allDay"
            checked={allDay}
            onChange={(event) => setAllDay(event.target.checked)}
          />
          <span>Journée(s) entière(s)</span>
        </label>

        <div style={{ ...grid, marginTop: ".9rem" }}>
          <div className="field" style={{ margin: 0 }}>
            <label className="label" htmlFor="startDate">
              Du
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="input"
              defaultValue={today}
              min={today}
              required
            />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label className="label" htmlFor="endDate">
              Au
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              className="input"
              defaultValue={today}
              min={today}
            />
          </div>
        </div>

        {!allDay ? (
          <div style={{ ...grid, marginTop: ".75rem" }}>
            <div className="field" style={{ margin: 0 }}>
              <label className="label" htmlFor="startTime">
                Heure de début
              </label>
              <input
                id="startTime"
                name="startTime"
                type="time"
                className="input"
                defaultValue="09:00"
                step={300}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="label" htmlFor="endTime">
                Heure de fin
              </label>
              <input
                id="endTime"
                name="endTime"
                type="time"
                className="input"
                defaultValue="12:00"
                step={300}
              />
            </div>
          </div>
        ) : null}

        <div className="field" style={{ marginTop: ".9rem" }}>
          <label className="label" htmlFor="reason">
            Motif (facultatif, visible uniquement par vous)
          </label>
          <input id="reason" name="reason" className="input" maxLength={200} />
        </div>

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Bloquer cette période"}
        </button>
      </form>

      {feedback ? (
        <p
          role="status"
          style={{
            margin: "0 0 1rem",
            padding: ".7rem .85rem",
            borderRadius: 10,
            fontSize: ".88rem",
            background: "var(--tone-info-bg)",
            color: "var(--tone-info-fg)",
          }}
        >
          {feedback}
        </p>
      ) : null}

      {blocks.length === 0 ? (
        <p style={{ color: "var(--admin-muted)", fontSize: ".9rem" }}>
          Aucune indisponibilité à venir.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".5rem" }}>
          {blocks.map((block) => (
            <li key={block.id} className="card" style={{ padding: ".85rem 1rem" }}>
              <div
                style={{
                  display: "flex",
                  gap: ".75rem",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: ".92rem" }}>
                    {block.range}
                  </p>
                  <p style={{ margin: ".2rem 0 0", fontSize: ".82rem", color: "var(--admin-muted)" }}>
                    {TYPE_LABELS[block.type]}
                    {block.reason ? ` · ${block.reason}` : ""}
                  </p>
                </div>

                {block.editable ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: ".35rem .8rem", minHeight: 34, fontSize: ".82rem", color: "var(--tone-danger-fg)" }}
                    disabled={removing}
                    onClick={() => remove(block)}
                  >
                    Supprimer
                  </button>
                ) : (
                  <span className="pill pill-neutral">Depuis Google</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gap: ".75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
};

const checkboxLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: ".55rem",
  fontSize: ".9rem",
  cursor: "pointer",
  minHeight: 32,
};
