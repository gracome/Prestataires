"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LABELS = ["", "Décevant", "Moyen", "Bien", "Très bien", "Parfait"];

/**
 * The customer's rating and comment, on her booking page once the appointment
 * is over. Stars are real radio buttons, so the choice works from a keyboard
 * and reads correctly to a screen reader, not only to a mouse.
 */
export function ReviewForm({ token, businessName }: { token: string; businessName: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (rating === 0) {
      setError("Choisissez une note, de 1 à 5 étoiles.");
      return;
    }
    setWorking(true);
    setError(null);

    try {
      const response = await fetch(`/api/reservation/${encodeURIComponent(token)}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload?.error ?? "L'envoi a échoué. Réessayez.");
        return;
      }

      router.refresh();
    } catch {
      setError("Connexion interrompue. Réessayez.");
    } finally {
      setWorking(false);
    }
  }

  const shown = hover || rating;

  return (
    <form onSubmit={submit} className="card review-form">
      <h2 className="font-display" style={{ margin: 0, fontSize: "1.3rem" }}>
        Comment s&apos;est passé votre rendez-vous ?
      </h2>
      <p style={{ margin: ".4rem 0 1.1rem", color: "var(--brand-muted)", fontSize: ".92rem", lineHeight: 1.6 }}>
        Votre avis aide {businessName} et les prochaines clientes. Il sera affiché
        sur le site avec votre prénom.
      </p>

      <fieldset className="review-stars" onMouseLeave={() => setHover(0)}>
        <legend className="label">Votre note</legend>
        <div className="review-stars-row">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="review-star" data-on={value <= shown ? "" : undefined} onMouseEnter={() => setHover(value)}>
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
              />
              <span aria-hidden="true">★</span>
              <span className="visually-hidden">
                {value} étoile{value > 1 ? "s" : ""}
              </span>
            </label>
          ))}
          <span className="review-star-label" aria-live="polite">
            {LABELS[shown]}
          </span>
        </div>
      </fieldset>

      <label className="label" htmlFor="review-comment">
        Votre commentaire
      </label>
      <textarea
        id="review-comment"
        className="textarea"
        style={{ minHeight: 110 }}
        maxLength={1000}
        required
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Ce que vous avez aimé, l'accueil, le résultat…"
      />

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={working} style={{ marginTop: "1rem" }}>
        {working ? "Envoi…" : "Publier mon avis"}
      </button>
    </form>
  );
}
