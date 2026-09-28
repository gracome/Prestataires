import { createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayMode } from "@prisma/client";

/**
 * FedaPay, the payment aggregator used here for mobile money and cards in
 * West Africa.
 *
 * The keys belong to the provider, not to the platform: money moves from the
 * customer to her own FedaPay account and never passes through us. That is
 * what keeps the platform out of the payment chain, and out of everything
 * holding other people's money implies.
 *
 * Written against fetch rather than the vendor SDK, which is built around one
 * set of global credentials — the opposite of what a multi-tenant application
 * needs, where every request has to carry a different provider's key.
 */

export type FedaPayCredentials = {
  mode: GatewayMode;
  secretKey: string;
};

export class FedaPayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FedaPayError";
  }
}

function baseUrl(mode: GatewayMode): string {
  return mode === "LIVE"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";
}

async function call<T>(
  credentials: FedaPayCredentials,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl(credentials.mode)}${path}`, {
      method: init.method,
      headers: {
        authorization: `Bearer ${credentials.secretKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      // A customer is waiting on this: better a clear failure than a page that
      // hangs until the platform's own request timeout.
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new FedaPayError(
      error instanceof Error && error.name === "TimeoutError"
        ? "FedaPay n'a pas répondu à temps."
        : "FedaPay est injoignable.",
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // Left null: the status code below carries the useful part.
  }

  if (!response.ok) {
    throw new FedaPayError(
      messageFrom(payload) ?? `FedaPay a répondu ${response.status}.`,
      response.status,
    );
  }

  return payload as T;
}

function messageFrom(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  // Validation errors arrive as { errors: { field: ["..."] } }.
  if (record.errors && typeof record.errors === "object") {
    const first = Object.values(record.errors as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }
  return null;
}

/**
 * FedaPay wraps single resources under a versioned key, so a transaction comes
 * back as { "v1/transaction": { … } }. Unwrapped here rather than at each call
 * site, and tolerantly: an unwrapped body is accepted too, so a change in that
 * envelope does not break payments.
 */
function unwrap<T>(payload: unknown, key: string): T {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (record[key]) return record[key] as T;
  }
  return payload as T;
}

export type FedaPayStatus =
  | "pending"
  | "approved"
  | "declined"
  | "canceled"
  | "refunded"
  | "transferred"
  | "unknown";

type TransactionResource = {
  id: number | string;
  status?: string;
  amount?: number;
  reference?: string;
};

/**
 * Create a transaction and return the page to send the customer to.
 *
 * Two calls, because that is how FedaPay is shaped: one creates the
 * transaction, a second mints a single-use token for its payment page.
 */
export async function createCheckout(
  credentials: FedaPayCredentials,
  input: {
    amount: number;
    currency: string;
    description: string;
    callbackUrl: string;
    customer: {
      firstname: string;
      lastname?: string;
      email?: string | null;
      phone?: string | null;
    };
  },
): Promise<{ transactionId: string; paymentUrl: string }> {
  const created = await call<unknown>(credentials, "/transactions", {
    method: "POST",
    body: {
      description: input.description,
      amount: input.amount,
      currency: { iso: input.currency },
      callback_url: input.callbackUrl,
      customer: {
        firstname: input.customer.firstname,
        lastname: input.customer.lastname ?? input.customer.firstname,
        ...(input.customer.email ? { email: input.customer.email } : {}),
        ...(input.customer.phone
          ? { phone_number: { number: input.customer.phone, country: "bj" } }
          : {}),
      },
    },
  });

  const transaction = unwrap<TransactionResource>(created, "v1/transaction");
  if (!transaction?.id) {
    throw new FedaPayError("FedaPay n'a pas renvoyé de transaction.");
  }

  const tokenised = await call<{ token?: string; url?: string }>(
    credentials,
    `/transactions/${transaction.id}/token`,
    { method: "POST" },
  );

  if (!tokenised?.url) {
    throw new FedaPayError("FedaPay n'a pas renvoyé de page de paiement.");
  }

  return { transactionId: String(transaction.id), paymentUrl: tokenised.url };
}

/** The authoritative status, asked of FedaPay rather than trusted from a redirect. */
export async function fetchTransactionStatus(
  credentials: FedaPayCredentials,
  transactionId: string,
): Promise<{ status: FedaPayStatus; amount: number | null }> {
  const payload = await call<unknown>(
    credentials,
    `/transactions/${encodeURIComponent(transactionId)}`,
  );
  const transaction = unwrap<TransactionResource>(payload, "v1/transaction");

  return {
    status: normaliseStatus(transaction?.status),
    amount: typeof transaction?.amount === "number" ? transaction.amount : null,
  };
}

function normaliseStatus(value: string | undefined): FedaPayStatus {
  switch (value) {
    case "pending":
    case "approved":
    case "declined":
    case "canceled":
    case "refunded":
    case "transferred":
      return value;
    default:
      return "unknown";
  }
}

/** A cheap authenticated call, used to tell a provider her keys work. */
export async function checkCredentials(
  credentials: FedaPayCredentials,
): Promise<void> {
  await call(credentials, "/currencies");
}

/**
 * Verify a webhook signature.
 *
 * The header is "t=<unix seconds>,s=<hex hmac>", and the signed payload is
 * "<t>.<raw body>". The raw body matters: re-serialising the parsed JSON would
 * change the bytes and every signature would fail.
 *
 * The timestamp is checked as well as the signature, so a valid old callback
 * captured once cannot be replayed indefinitely.
 */
export function verifyWebhookSignature(input: {
  header: string | null;
  rawBody: string;
  secret: string;
  now?: Date;
  toleranceSeconds?: number;
}): boolean {
  if (!input.header) return false;

  const parts = new Map(
    input.header.split(",").map((piece) => {
      const [key, ...rest] = piece.trim().split("=");
      return [key, rest.join("=")] as const;
    }),
  );

  const timestamp = parts.get("t");
  const signature = parts.get("s");
  if (!timestamp || !signature) return false;

  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return false;

  const now = (input.now ?? new Date()).getTime() / 1000;
  const tolerance = input.toleranceSeconds ?? 300;
  if (Math.abs(now - seconds) > tolerance) return false;

  const expected = createHmac("sha256", input.secret)
    .update(`${timestamp}.${input.rawBody}`)
    .digest("hex");

  const given = Buffer.from(signature, "utf8");
  const mine = Buffer.from(expected, "utf8");
  if (given.length !== mine.length) return false;

  return timingSafeEqual(given, mine);
}
