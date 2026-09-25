"use client";

import { useActionState, useState } from "react";
import type { PaymentMethod } from "@prisma/client";
import { recordSaleAction } from "@/app/dashboard/actions/till";
import type { ActionState } from "@/lib/validation";

/**
 * Recording a sale.
 *
 * Meant to be filled in between two customers, so picking a prestation fills
 * the label and the price in one gesture, and everything else already has a
 * sensible value. The label stays editable because half of what a salon sells
 * is not in the catalogue: a touch-up, a product, a repair.
 */

export type CatalogueOption = {
  id: string;
  name: string;
  /** In whole currency units, ready to drop into the amount field. */
  price: string;
};

const IDLE: ActionState = { status: "idle" };

export function TillForm({
  services,
  methods,
  date,
  time,
  currency,
}: {
  services: CatalogueOption[];
  methods: Array<{ value: PaymentMethod; label: string }>;
  /** The day being viewed, so a line added lands on the right one. */
  date: string;
  time: string;
  currency: string;
}) {
  const [state, action, pending] = useActionState(recordSaleAction, IDLE);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [serviceId, setServiceId] = useState("");

  const pick = (id: string) => {
    setServiceId(id);
    const service = services.find((item) => item.id === id);
    if (service) {
      setLabel(service.name);
      setAmount(service.price);
    }
  };

  return (
    <form
      action={action}
      // A submitted form keeps its typed values otherwise, and the next
      // customer would be recorded on top of the last one's amount.
      onSubmit={() => {
        setTimeout(() => {
          setLabel("");
          setAmount("");
          setServiceId("");
        }, 0);
      }}
    >
      <input type="hidden" name="serviceId" value={serviceId} />

      <div className="till-grid">
        {services.length > 0 ? (
          <div className="field" style={{ margin: 0 }}>
            <label className="label" htmlFor="till-service">
              Prestation du catalogue
            </label>
            <select
              id="till-service"
              className="input"
              value={serviceId}
              onChange={(event) => pick(event.target.value)}
            >
              <option value="">Autre chose…</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="field" style={{ margin: 0 }}>
          <label className="label" htmlFor="till-label">
            Ce qui a été fait
          </label>
          <input
            id="till-label"
            name="label"
            className="input"
            required
            value={label}
            onChange={(event) => {
              setLabel(event.target.value);
              // Typing over the name means it is no longer that catalogue
              // entry, so the link is dropped rather than left lying.
              setServiceId("");
            }}
            placeholder="Pose gel, retouche, produit…"
          />
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label className="label" htmlFor="till-amount">
            Montant encaissé ({currency})
          </label>
          <input
            id="till-amount"
            name="amount"
            className="input"
            required
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="6000"
          />
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label className="label" htmlFor="till-method">
            Payé par
          </label>
          <select id="till-method" name="method" className="input" defaultValue="CASH">
            {methods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label className="label" htmlFor="till-customer">
            Cliente <span style={{ fontWeight: 400 }}>(facultatif)</span>
          </label>
          <input id="till-customer" name="customerName" className="input" />
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label className="label" htmlFor="till-time">
            Heure
          </label>
          <input
            id="till-time"
            name="time"
            type="time"
            className="input"
            defaultValue={time}
            required
          />
        </div>
      </div>

      <input type="hidden" name="date" value={date} />

      <div style={{ display: "flex", gap: ".7rem", alignItems: "center", marginTop: ".9rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer l'encaissement"}
        </button>

        {state.status !== "idle" && state.message ? (
          <span
            style={{
              fontSize: ".86rem",
              color:
                state.status === "success"
                  ? "var(--tone-success-fg)"
                  : "var(--tone-danger-fg)",
            }}
          >
            {state.message}
          </span>
        ) : null}
      </div>

      <style>{`
        .till-grid {
          display: grid;
          gap: .75rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 700px) {
          .till-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 1100px) {
          .till-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}</style>
    </form>
  );
}
