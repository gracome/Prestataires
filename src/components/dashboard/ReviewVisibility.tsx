"use client";

import { useTransition } from "react";
import { setReviewHiddenAction } from "@/app/dashboard/actions/reviews";

/** Show or hide one review on the public site. */
export function ReviewVisibility({ reviewId, hidden }: { reviewId: string; hidden: boolean }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-secondary"
      style={{ minHeight: 36, padding: ".4rem .9rem", fontSize: ".85rem" }}
      disabled={pending}
      onClick={() => start(() => void setReviewHiddenAction(reviewId, !hidden))}
    >
      {pending ? "…" : hidden ? "Afficher sur le site" : "Masquer du site"}
    </button>
  );
}
