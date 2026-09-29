"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TRADES,
  fcfa,
  humanDuration,
  tradeById,
  type Trade,
  type TradeService,
} from "@/lib/marketing/trades";

/**
 * A working lap of the product, with nothing behind it.
 *
 * She books on her own site, then turns the page over and finds the booking
 * sitting in her diary waiting to be confirmed and cashed. That loop — the
 * client side and her side being the same appointment — is the whole product,
 * and it is much easier to show than to describe.
 *
 * Every button works and nothing is saved. That is deliberate in both
 * directions: she can press anything without being careful, and we never ask
 * a visitor who has not signed up for a client's name or telephone number.
 *
 * The state is plain React. A demo that needed a database would need an
 * account, and an account is exactly the thing she has not decided on yet.
 */

export type DemoDay = {
  date: string;
  weekday: string;
  dayNumber: number;
  today: boolean;
};

type Status = "pending" | "confirmed" | "paid";

type Appointment = {
  id: string;
  date: string;
  time: string;
  service: string;
  price: number;
  minutes: number;
  client: string;
  status: Status;
  /** Hers, made during this visit — worth pointing at when she turns over. */
  mine?: boolean;
};

/** The shape of a day. Wide enough to look like a real diary, short enough to
 *  fit on a phone without scrolling sideways. */
const SLOTS = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];

/** Names that sound like a client list in Cotonou rather than in a tutorial. */
const SEED_CLIENTS = ["Amina D.", "Grâce H.", "Fatima B.", "Reine A."];

type View = "site" | "board";
type Step = "service" | "slot" | "who" | "done";

export function DemoApp({
  trade: initialTrade,
  initialName,
  days,
}: {
  trade: Trade;
  initialName: string;
  days: DemoDay[];
}) {
  const [tradeId, setTradeId] = useState(initialTrade.id);
  const [name, setName] = useState(initialName);
  const [view, setView] = useState<View>("site");

  const trade = tradeById(tradeId);
  const businessName = name.trim() || trade.sampleName;

  // Changing trade rebuilds the diary, because the seeded appointments are
  // that trade's services. Keying the state on the trade is simpler than
  // migrating bookings between vocabularies nobody will look at twice.
  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    seed(initialTrade, days),
  );
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<TradeService | null>(null);
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState<string | null>(null);
  const [client, setClient] = useState("");

  function pickTrade(next: string) {
    setTradeId(next);
    setAppointments(seed(tradeById(next), days));
    restart();
  }

  function restart() {
    setStep("service");
    setService(null);
    setSlot(null);
    setClient("");
  }

  const taken = useMemo(
    () =>
      new Set(
        appointments
          .filter((appointment) => appointment.date === day.date)
          .map((appointment) => appointment.time),
      ),
    [appointments, day.date],
  );

  function confirmBooking() {
    if (!service || !slot) return;
    setAppointments((current) => [
      ...current,
      {
        id: `mine-${Date.now()}`,
        date: day.date,
        time: slot,
        service: service.name,
        price: service.price,
        minutes: service.minutes,
        client: client.trim() || "Vous",
        status: "pending",
        mine: true,
      },
    ]);
    setStep("done");
  }

  function setStatus(id: string, status: Status) {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment,
      ),
    );
  }

  function remove(id: string) {
    setAppointments((current) =>
      current.filter((appointment) => appointment.id !== id),
    );
  }

  const pendingCount = appointments.filter(
    (appointment) => appointment.status === "pending",
  ).length;

  return (
    <div className="dm" style={{ ["--demo" as string]: trade.accent }}>
      <div className="dm-bar">
        <div className="container">
          <p className="dm-bar-note">
            <strong>Démonstration.</strong> Tous les boutons fonctionnent et
            rien n&apos;est enregistré.
          </p>

          <div className="dm-switch" role="tablist" aria-label="Point de vue">
            <button
              type="button"
              role="tab"
              aria-selected={view === "site"}
              data-on={view === "site" ? "true" : undefined}
              onClick={() => setView("site")}
            >
              Mon site
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "board"}
              data-on={view === "board" ? "true" : undefined}
              onClick={() => setView("board")}
            >
              Mon tableau de bord
              {pendingCount > 0 ? (
                <span className="dm-badge">{pendingCount}</span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      <div className="dm-setup">
        <div className="container">
          <label className="dm-setup-field">
            <span>Nom de votre activité</span>
            <input
              type="text"
              value={name}
              maxLength={40}
              placeholder={trade.sampleName}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="dm-setup-field">
            <span>Votre métier</span>
            <div className="mk-chips">
              {TRADES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="mk-chip"
                  data-on={option.id === tradeId ? "true" : undefined}
                  aria-pressed={option.id === tradeId}
                  onClick={() => pickTrade(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="container dm-main">
        {view === "site" ? (
          <SiteView
            trade={trade}
            businessName={businessName}
            days={days}
            day={day}
            setDay={setDay}
            taken={taken}
            step={step}
            setStep={setStep}
            service={service}
            setService={setService}
            slot={slot}
            setSlot={setSlot}
            client={client}
            setClient={setClient}
            confirmBooking={confirmBooking}
            restart={restart}
            openBoard={() => setView("board")}
          />
        ) : (
          <BoardView
            trade={trade}
            businessName={businessName}
            appointments={appointments}
            days={days}
            setStatus={setStatus}
            remove={remove}
            openSite={() => setView("site")}
          />
        )}
      </main>

      <section className="dm-foot">
        <div className="container">
          <h2>Ça vous parle ?</h2>
          <p>
            C&apos;est exactement ce que vous auriez, avec vos prestations, vos
            tarifs et votre adresse. Il n&apos;y a rien à installer.
          </p>
          <div className="dm-foot-actions">
            <Link href="/#tarifs" className="mk-btn">
              Voir les tarifs
            </Link>
            <Link href="/#nous" className="mk-btn mk-btn-ghost">
              Qui sommes-nous
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ====================================================== the client's side */

function SiteView({
  trade,
  businessName,
  days,
  day,
  setDay,
  taken,
  step,
  setStep,
  service,
  setService,
  slot,
  setSlot,
  client,
  setClient,
  confirmBooking,
  restart,
  openBoard,
}: {
  trade: Trade;
  businessName: string;
  days: DemoDay[];
  day: DemoDay;
  setDay: (day: DemoDay) => void;
  taken: Set<string>;
  step: Step;
  setStep: (step: Step) => void;
  service: TradeService | null;
  setService: (service: TradeService) => void;
  slot: string | null;
  setSlot: (slot: string) => void;
  client: string;
  setClient: (value: string) => void;
  confirmBooking: () => void;
  restart: () => void;
  openBoard: () => void;
}) {
  return (
    <div className="dm-site">
      <div className="dm-site-hero">
        <p className="dm-site-name">{businessName}</p>
        <p className="dm-site-tag">{trade.tagline}</p>
      </div>

      <ol className="dm-steps" aria-label="Étapes">
        {(["service", "slot", "who"] as const).map((key, index) => (
          <li
            key={key}
            data-on={step === key ? "true" : undefined}
            data-done={
              step === "done" || STEP_ORDER[step] > index ? "true" : undefined
            }
          >
            <span>{index + 1}</span>
            {STEP_LABELS[key]}
          </li>
        ))}
      </ol>

      {step === "service" ? (
        <section className="dm-panel">
          <h2>Choisissez une prestation</h2>
          <ul className="dm-services">
            {trade.services.map((option) => (
              <li key={option.name}>
                <button
                  type="button"
                  onClick={() => {
                    setService(option);
                    setStep("slot");
                  }}
                >
                  <span>
                    <strong>{option.name}</strong>
                    <em>{humanDuration(option.minutes)}</em>
                  </span>
                  <b>{fcfa(option.price)} F</b>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step === "slot" && service ? (
        <section className="dm-panel">
          <h2>Choisissez un créneau</h2>
          <p className="dm-chosen">
            {service.name} · {humanDuration(service.minutes)} ·{" "}
            {fcfa(service.price)} F
          </p>

          <div className="dm-days">
            {days.map((option) => (
              <button
                key={option.date}
                type="button"
                data-on={option.date === day.date ? "true" : undefined}
                onClick={() => setDay(option)}
              >
                <span>{option.today ? "aujourd’hui" : option.weekday}</span>
                <b>{option.dayNumber}</b>
              </button>
            ))}
          </div>

          {/* A slot already taken is shown and disabled rather than hidden: a
              row of times with gaps in it is what tells her the diary is real
              and that nobody can be double-booked. */}
          <div className="dm-slots">
            {SLOTS.map((option) => {
              const busy = taken.has(option);
              return (
                <button
                  key={option}
                  type="button"
                  disabled={busy}
                  data-on={option === slot ? "true" : undefined}
                  onClick={() => setSlot(option)}
                >
                  {option}
                  {busy ? <em>pris</em> : null}
                </button>
              );
            })}
          </div>

          <div className="dm-actions">
            <button
              type="button"
              className="mk-btn"
              disabled={!slot}
              onClick={() => setStep("who")}
            >
              Continuer
            </button>
            <button
              type="button"
              className="dm-link"
              onClick={() => setStep("service")}
            >
              Changer de prestation
            </button>
          </div>
        </section>
      ) : null}

      {step === "who" && service && slot ? (
        <section className="dm-panel">
          <h2>Vos coordonnées</h2>
          <p className="dm-chosen">
            {service.name} · {day.today ? "aujourd’hui" : day.weekday}{" "}
            {day.dayNumber} à {slot}
          </p>

          <label className="dm-field">
            <span>Votre nom</span>
            <input
              type="text"
              value={client}
              maxLength={40}
              placeholder="Comme une cliente le remplirait"
              onChange={(event) => setClient(event.target.value)}
            />
          </label>

          <p className="dm-deposit">
            Avec le module acomptes, c&apos;est ici qu&apos;elle verserait son
            acompte de {fcfa(Math.round(service.price * 0.3))} F.
          </p>

          <div className="dm-actions">
            <button type="button" className="mk-btn" onClick={confirmBooking}>
              Réserver
            </button>
            <button
              type="button"
              className="dm-link"
              onClick={() => setStep("slot")}
            >
              Changer de créneau
            </button>
          </div>
        </section>
      ) : null}

      {step === "done" && service && slot ? (
        <section className="dm-panel dm-panel-done">
          <p className="dm-tick" aria-hidden="true">
            ✓
          </p>
          <h2>C&apos;est réservé.</h2>
          <p className="dm-chosen">
            {service.name} · {day.today ? "aujourd’hui" : day.weekday}{" "}
            {day.dayNumber} à {slot}
          </p>
          <p className="dm-done-note">
            Votre cliente recevrait sa confirmation. De votre côté, le
            rendez-vous vous attend déjà.
          </p>

          <div className="dm-actions">
            <button type="button" className="mk-btn" onClick={openBoard}>
              Voir mon tableau de bord →
            </button>
            <button type="button" className="dm-link" onClick={restart}>
              Réserver autre chose
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

const STEP_LABELS = {
  service: "Prestation",
  slot: "Créneau",
  who: "Coordonnées",
} as const;

const STEP_ORDER: Record<Step, number> = {
  service: 0,
  slot: 1,
  who: 2,
  done: 3,
};

/* ========================================================== her own side */

function BoardView({
  trade,
  businessName,
  appointments,
  days,
  setStatus,
  remove,
  openSite,
}: {
  trade: Trade;
  businessName: string;
  appointments: Appointment[];
  days: DemoDay[];
  setStatus: (id: string, status: Status) => void;
  remove: (id: string) => void;
  openSite: () => void;
}) {
  const sorted = [...appointments].sort((a, b) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
  );

  const cashed = appointments
    .filter((appointment) => appointment.status === "paid")
    .reduce((total, appointment) => total + appointment.price, 0);

  const pending = appointments.filter(
    (appointment) => appointment.status === "pending",
  ).length;

  const average =
    appointments.length > 0
      ? Math.round(
          appointments.reduce((total, a) => total + a.price, 0) /
            appointments.length,
        )
      : 0;

  const labelOf = (date: string) => {
    const match = days.find((option) => option.date === date);
    if (!match) return date;
    return match.today
      ? "Aujourd’hui"
      : `${match.weekday} ${match.dayNumber}`;
  };

  return (
    <div className="dm-board">
      <div className="dm-board-head">
        <div>
          <p className="dm-board-hello">Bonjour</p>
          <h2>{businessName}</h2>
        </div>
        <button type="button" className="dm-link" onClick={openSite}>
          ← Retourner sur mon site
        </button>
      </div>

      <div className="dm-stats">
        <Stat label="Rendez-vous" value={String(appointments.length)} />
        <Stat label="À confirmer" value={String(pending)} accent={pending > 0} />
        <Stat label="Encaissé" value={`${fcfa(cashed)} F`} />
        <Stat label="Panier moyen" value={`${fcfa(average)} F`} />
      </div>

      <h3 className="dm-list-title">Votre agenda</h3>

      {sorted.length === 0 ? (
        <p className="dm-empty">
          Plus rien au programme. Retournez sur votre site pour reprendre un
          rendez-vous.
        </p>
      ) : (
        <ul className="dm-list">
          {sorted.map((appointment) => (
            <li key={appointment.id} data-mine={appointment.mine ? "true" : undefined}>
              <div className="dm-when">
                <b>{appointment.time}</b>
                <span>{labelOf(appointment.date)}</span>
              </div>

              <div className="dm-what">
                <strong>{appointment.service}</strong>
                <span>
                  {appointment.client} · {humanDuration(appointment.minutes)} ·{" "}
                  {fcfa(appointment.price)} F
                </span>
                {appointment.mine ? (
                  <span className="dm-mine">réservé à l&apos;instant</span>
                ) : null}
              </div>

              <div className="dm-row-actions">
                <span className="dm-status" data-status={appointment.status}>
                  {STATUS_LABELS[appointment.status]}
                </span>

                {appointment.status === "pending" ? (
                  <button
                    type="button"
                    onClick={() => setStatus(appointment.id, "confirmed")}
                  >
                    Confirmer
                  </button>
                ) : null}

                {appointment.status === "confirmed" ? (
                  <button
                    type="button"
                    onClick={() => setStatus(appointment.id, "paid")}
                  >
                    Encaisser
                  </button>
                ) : null}

                {appointment.status !== "paid" ? (
                  <button
                    type="button"
                    className="dm-danger"
                    onClick={() => remove(appointment.id)}
                  >
                    Annuler
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="dm-board-note">
        Dans la vraie application, cet agenda est aussi une caisse, un fichier
        clientes et vos chiffres du mois — pour une {trade.practitioner} comme
        pour n&apos;importe quel métier sur rendez-vous.
      </p>
    </div>
  );
}

const STATUS_LABELS: Record<Status, string> = {
  pending: "À confirmer",
  confirmed: "Confirmé",
  paid: "Encaissé",
};

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="dm-stat" data-accent={accent ? "true" : undefined}>
      <p>{label}</p>
      <b>{value}</b>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

/**
 * A diary that is already running.
 *
 * An empty demo is a worse demo: half of what she is judging is whether the
 * screen stays readable once there is something on it, and a slot she cannot
 * book because it is taken is the clearest possible proof that two clients
 * cannot land on the same one.
 */
function seed(trade: Trade, days: DemoDay[]): Appointment[] {
  const plan: Array<[number, string, number, Status]> = [
    [0, "09:00", 0, "confirmed"],
    [0, "12:00", 1, "paid"],
    [1, "10:30", 2, "pending"],
    [2, "15:30", 3, "confirmed"],
  ];

  return plan.flatMap(([offset, time, serviceIndex, status], index) => {
    const day = days[offset];
    if (!day) return [];
    const service = trade.services[serviceIndex % trade.services.length];
    return [
      {
        id: `seed-${index}`,
        date: day.date,
        time,
        service: service.name,
        price: service.price,
        minutes: service.minutes,
        client: SEED_CLIENTS[index % SEED_CLIENTS.length],
        status,
      },
    ];
  });
}
