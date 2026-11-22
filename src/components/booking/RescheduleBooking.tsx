"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Customer-initiated move of a confirmed appointment: same service, another
 * free time, picked the same way as when she booked. Nothing to ask the
 * provider for, nothing to pay again.
 */

type SlotDto = { startsAt: string; endsAt: string; label: string; endLabel: string };
type DayDto = { date: string; isOpen: boolean; slots: SlotDto[] };

const WINDOW_DAYS = 14;

export function RescheduleBooking({
  token,
  today,
}: {
  token: string;
  /** Today in the provider's timezone, computed on the server. */
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState(today);
  const [days, setDays] = useState<DayDto[]>([]);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(
    async (from: string) => {
      const ticket = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const to = addDaysIso(from, WINDOW_DAYS - 1);
        const response = await fetch(
          `/api/reservation/${encodeURIComponent(token)}/availability?from=${from}&to=${to}`,
          { headers: { accept: "application/json" }, cache: "no-store" },
        );
        const payload = await response.json();
        if (ticket !== requestId.current) return;
        if (!response.ok) {
          setDays([]);
          setError(payload?.error ?? "Impossible de charger les disponibilités.");
          return;
        }
        const loaded: DayDto[] = payload.days ?? [];
        setDays(loaded);
        setActiveDate((current) =>
          current && loaded.some((d) => d.date === current && d.slots.length > 0)
            ? current
            : (loaded.find((d) => d.slots.length > 0)?.date ?? null),
        );
      } catch {
        if (ticket !== requestId.current) return;
        setDays([]);
        setError("Connexion interrompue. Vérifiez votre réseau puis réessayez.");
      } finally {
        if (ticket === requestId.current) setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (open) void load(rangeStart);
  }, [open, rangeStart, load]);

  async function confirm() {
    if (!slot) return;
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/reservation/${encodeURIComponent(token)}/reschedule`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ startsAt: slot.startsAt }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload?.error ?? "Le changement d'horaire a échoué.");
        // The slot may just have been taken: show what is free now.
        setSlot(null);
        void load(rangeStart);
        return;
      }
      setOpen(false);
      setSlot(null);
      router.refresh();
    } catch {
      setError("Connexion interrompue. Réessayez.");
    } finally {
      setWorking(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen(true)}
      >
        Changer d&apos;horaire
      </button>
    );
  }

  const activeDay = days.find((d) => d.date === activeDate) ?? null;
  const atStart = rangeStart <= today;

  return (
    <section className="card" aria-label="Changer d'horaire">
      <h2 style={{ fontSize: "1.05rem", margin: "0 0 .35rem" }}>Choisissez un nouveau créneau</h2>
      <p style={{ margin: "0 0 1rem", fontSize: ".88rem", color: "var(--brand-muted)", lineHeight: 1.6 }}>
        Même prestation, même prix. Votre rendez-vous reste confirmé et votre
        acompte est conservé.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".75rem" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setRangeStart(maxIso(today, addDaysIso(rangeStart, -WINDOW_DAYS)))}
          disabled={atStart || loading}
          style={navButton}
        >
          <span aria-hidden="true">‹</span>
          <span className="visually-hidden">Deux semaines précédentes</span>
        </button>
        <p style={{ margin: 0, fontSize: ".85rem", color: "var(--brand-muted)", flex: 1, textAlign: "center" }}>
          {loading ? "Chargement des disponibilités…" : "Sélectionnez un jour"}
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setRangeStart(addDaysIso(rangeStart, WINDOW_DAYS))}
          disabled={loading}
          style={navButton}
        >
          <span aria-hidden="true">›</span>
          <span className="visually-hidden">Deux semaines suivantes</span>
        </button>
      </div>

      <div
        role="group"
        aria-label="Jours disponibles"
        style={{ display: "flex", gap: ".45rem", overflowX: "auto", paddingBottom: ".5rem", scrollbarWidth: "thin" }}
      >
        {days.map((day) => {
          const available = day.slots.length > 0;
          const selected = day.date === activeDate;
          return (
            <button
              key={day.date}
              type="button"
              disabled={!available}
              aria-pressed={selected}
              onClick={() => {
                setActiveDate(day.date);
                setSlot(null);
              }}
              style={{
                flex: "0 0 auto",
                minWidth: 62,
                minHeight: 62,
                padding: ".55rem .35rem",
                borderRadius: 12,
                border: `1px solid ${selected ? "var(--brand-primary)" : "var(--brand-border)"}`,
                background: selected ? "var(--brand-primary)" : "var(--brand-surface)",
                color: selected ? "#fff" : "var(--brand-text)",
                opacity: available ? 1 : 0.38,
                cursor: available ? "pointer" : "not-allowed",
                font: "inherit",
              }}
            >
              <span style={{ display: "block", fontSize: ".68rem", textTransform: "uppercase" }}>
                {WEEKDAYS[parseIso(day.date).getUTCDay()]}
              </span>
              <span style={{ display: "block", fontSize: "1.05rem", fontWeight: 700 }}>
                {Number(day.date.slice(8, 10))}
              </span>
              <span style={{ display: "block", fontSize: ".62rem" }}>
                {MONTHS[parseIso(day.date).getUTCMonth()]}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "1rem", minHeight: 90 }}>
        {loading ? (
          <p style={{ color: "var(--brand-muted)" }}>Chargement…</p>
        ) : !activeDay || activeDay.slots.length === 0 ? (
          <p style={{ color: "var(--brand-muted)", margin: 0 }}>
            Aucun créneau disponible sur cette période. Essayez les deux semaines
            suivantes.
          </p>
        ) : (
          <div className="slot-grid">
            {activeDay.slots.map((candidate) => (
              <button
                key={candidate.startsAt}
                type="button"
                className="slot"
                aria-pressed={slot?.startsAt === candidate.startsAt}
                onClick={() => setSlot(candidate)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: ".5rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setOpen(false);
            setSlot(null);
            setError(null);
          }}
          disabled={working}
        >
          Garder mon horaire
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={confirm}
          disabled={!slot || working}
        >
          {working
            ? "Changement…"
            : slot
              ? `Passer à ${slot.label}`
              : "Choisissez un créneau"}
        </button>
      </div>
    </section>
  );
}

const navButton: React.CSSProperties = {
  padding: ".4rem .85rem",
  minHeight: 40,
  fontSize: "1.1rem",
  lineHeight: 1,
};

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function maxIso(a: string, b: string): string {
  return a > b ? a : b;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const WEEKDAYS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const MONTHS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
