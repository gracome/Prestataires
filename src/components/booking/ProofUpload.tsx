"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Payment proof upload (cahier des charges section 9).
 *
 * Accepts a screenshot, a photo or a PDF. The file is posted to a route that
 * checks the type by its actual bytes, stores it outside the public web root
 * and moves the booking to PAYMENT_PROOF_SUBMITTED.
 */

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 8 * 1024 * 1024;

export function ProofUpload({ token }: { token: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function choose(selected: File | null) {
    setError(null);

    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);

    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > MAX_BYTES) {
      setFile(null);
      setError("Fichier trop volumineux : 8 Mo maximum.");
      return;
    }

    setFile(selected);
    if (selected.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(selected));
    }
  }

  async function upload() {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("proof", file);

      const response = await fetch(
        `/api/reservation/${encodeURIComponent(token)}/proof`,
        { method: "POST", body },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error ?? "L'envoi a échoué. Réessayez.");
        return;
      }

      if (preview) URL.revokeObjectURL(preview);
      router.refresh();
    } catch {
      setError("Connexion interrompue. Vérifiez votre réseau puis réessayez.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="label" htmlFor="proof-input">
        Votre preuve de paiement
      </label>

      <input
        ref={inputRef}
        id="proof-input"
        type="file"
        accept={ACCEPT}
        className="input"
        style={{ paddingBlock: ".55rem" }}
        aria-describedby="proof-hint"
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
      />

      <p className="hint" id="proof-hint">
        Capture d&apos;écran, photo ou PDF. Formats acceptés : JPG, PNG, WEBP,
        PDF. 8 Mo maximum.
      </p>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Aperçu de votre preuve de paiement"
          style={{
            marginTop: ".75rem",
            maxWidth: "100%",
            maxHeight: 260,
            borderRadius: 12,
            border: "1px solid var(--brand-border)",
            display: "block",
          }}
        />
      ) : null}

      {file && !preview ? (
        <p style={{ marginTop: ".6rem", fontSize: ".88rem", color: "var(--brand-muted)" }}>
          Fichier sélectionné : {file.name}
        </p>
      ) : null}

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary btn-block"
        style={{ marginTop: "1rem" }}
        disabled={!file || uploading}
        onClick={upload}
      >
        {uploading ? "Envoi en cours…" : "Envoyer ma preuve de paiement"}
      </button>
    </div>
  );
}
