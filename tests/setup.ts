/**
 * Environment for the unit suite.
 *
 * These tests exercise pure logic, so the values only need to be well-formed:
 * nothing here connects to a database, a mail server or Google.
 */

// `process.env.NODE_ENV` is typed read-only, so the object is widened once
// rather than casting at every assignment.
const env = process.env as Record<string, string | undefined>;

env.NODE_ENV ??= "test";
env.DATABASE_URL ??= "postgresql://localhost:5432/prestataire_test";
env.APP_URL ??= "http://localhost:3000";
env.ENCRYPTION_KEY ??=
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
env.MAIL_DRIVER ??= "console";
env.STORAGE_DRIVER ??= "local";
