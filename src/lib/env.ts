import { z } from "zod";

/**
 * Environment configuration.
 *
 * Parsing is lazy so that importing this module never throws at build time;
 * a missing variable only surfaces when the feature that needs it is used.
 */

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().min(1),

  /** Public origin used to build absolute links in emails. */
  APP_URL: z.string().url().default("http://localhost:3000"),

  /** 32-byte key, hex or base64, used for AES-256-GCM at-rest encryption. */
  ENCRYPTION_KEY: z.string().min(32),

  /** Shared secret required by the scheduled-job endpoints. */
  CRON_SECRET: z.string().min(16).optional(),

  SESSION_COOKIE_NAME: z.string().default("prestataire_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24 * 7),

  // --- File storage -------------------------------------------------------
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // --- Email --------------------------------------------------------------
  MAIL_DRIVER: z.enum(["console", "smtp", "resend"]).default("console"),
  MAIL_FROM: z.string().default("Prestataire <no-reply@example.com>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true" || v === "1")
    .default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // --- Google Calendar ----------------------------------------------------
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: forget the parsed cache. */
export function resetEnvCache(): void {
  cached = null;
}

export function appUrl(path = "/"): string {
  const base = env().APP_URL.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isProduction(): boolean {
  return env().NODE_ENV === "production";
}
