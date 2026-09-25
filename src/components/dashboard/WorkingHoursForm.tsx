"use client";

import { useActionState, useState } from "react";
import { IDLE } from "@/lib/validation";
import { saveWorkingHoursAction } from "@/app/dashboard/actions/schedule";

/**
 * Weekly opening hours (cahier des charges section 6).
 *
 * Monday first, because that is how the week reads in French. Each row is
 * independent: a closed day keeps its times so reopening it does not mean
 * retyping them.
 */

export type DayRow = {
  dayOfWeek: number;
  label: string;
  active: boolean;
  open: string;
  close: string;
  breakStart: string | null;
  breakEnd: string | null;
};

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function WorkingHoursForm({ days }: { days: DayRow[] }) {
  const [state, submit, pending] = useActionState(saveWorkingHoursAction, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  const [rows, setRows] = useState<DayRow[]>(days);

  function update(dayOfWeek: number, patch: Partial<DayRow>) {
    setRows((current) =>
      current.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)),
    );
  }

  const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]));

  return (
    <form action={submit}>
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
          }}
        >
          {state.message}
        </p>
      ) : null}

      <div style={{ display: "grid", gap: ".6rem" }}>
        {ORDER.map((dayOfWeek) => {
          const row = byDay.get(dayOfWeek);
          if (!row) return null;

          const hasBreak = row.breakStart !== null && row.breakEnd !== null;
          const rowErrors = [
            errors[`day-${dayOfWeek}-closeMinute`],
            errors[`day-${dayOfWeek}-breakStartMinute`],
            errors[`day-${dayOfWeek}-breakEndMinute`],
          ].filter(Boolean);

          return (
            <fieldset
              key={dayOfWeek}
              className="card"
              style={{ border: "1px solid var(--admin-border)", margin: 0 }}
            >
              <legend className="visually-hidden">{row.label}</legend>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".6rem",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  cursor: "pointer",
                  minHeight: 32,
                }}
              >
                <input
                  type="checkbox"
                  name={`day-${dayOfWeek}-active`}
                  checked={row.active}
                  onChange={(event) => update(dayOfWeek, { active: event.target.checked })}
                />
                <span>{row.label}</span>
                {!row.active ? (
                  <span className="pill pill-neutral" style={{ marginLeft: "auto" }}>
                    Fermé
                  </span>
                ) : null}
              </label>

              {row.active ? (
                <div style={{ marginTop: ".9rem", display: "grid", gap: ".75rem" }}>
                  <div style={timeGrid}>
                    <TimeInput
                      id={`day-${dayOfWeek}-open`}
                      label="Ouverture"
                      value={row.open}
                      onChange={(value) => update(dayOfWeek, { open: value })}
                    />
                    <TimeInput
                      id={`day-${dayOfWeek}-close`}
                      label="Fermeture"
                      value={row.close}
                      onChange={(value) => update(dayOfWeek, { close: value })}
                    />
                  </div>

                  <label style={checkboxLabel}>
                    <input
                      type="checkbox"
                      name={`day-${dayOfWeek}-hasBreak`}
                      checked={hasBreak}
                      onChange={(event) =>
                        update(dayOfWeek, {
                          breakStart: event.target.checked ? (row.breakStart ?? "13:00") : null,
                          breakEnd: event.target.checked ? (row.breakEnd ?? "14:00") : null,
                        })
                      }
                    />
                    <span>Pause dans la journée</span>
                  </label>

                  {hasBreak ? (
                    <div style={timeGrid}>
                      <TimeInput
                        id={`day-${dayOfWeek}-breakStart`}
                        label="Début de pause"
                        value={row.breakStart ?? "13:00"}
                        onChange={(value) => update(dayOfWeek, { breakStart: value })}
                      />
                      <TimeInput
                        id={`day-${dayOfWeek}-breakEnd`}
                        label="Fin de pause"
                        value={row.breakEnd ?? "14:00"}
                        onChange={(value) => update(dayOfWeek, { breakEnd: value })}
                      />
                    </div>
                  ) : null}

                  {rowErrors.map((message) => (
                    <p key={message} className="error-text" role="alert" style={{ margin: 0 }}>
                      {message}
                    </p>
                  ))}
                </div>
              ) : (
                <>
                  {/* Keep the times in the payload so reopening the day
                      restores what was there before. */}
                  <input type="hidden" name={`day-${dayOfWeek}-open`} value={row.open} />
                  <input type="hidden" name={`day-${dayOfWeek}-close`} value={row.close} />
                </>
              )}
            </fieldset>
          );
        })}
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        style={{ marginTop: "1.25rem" }}
        disabled={pending}
      >
        {pending ? "Enregistrement…" : "Enregistrer les horaires"}
      </button>
    </form>
  );
}

function TimeInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field" style={{ margin: 0 }}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="time"
        className="input"
        value={value}
        step={300}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

const timeGrid: React.CSSProperties = {
  display: "grid",
  gap: ".75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
};

const checkboxLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: ".55rem",
  fontSize: ".9rem",
  cursor: "pointer",
  minHeight: 32,
};
