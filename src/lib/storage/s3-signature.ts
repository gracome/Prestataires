import { createHash, createHmac } from "node:crypto";

/**
 * Minimal AWS Signature Version 4 for S3-compatible object storage.
 *
 * Written by hand so the app does not depend on an AWS SDK just to put and
 * get a handful of files. Only the single-request, payload-hashed form is
 * implemented, which is all the storage driver needs.
 */

export type SignParams = {
  method: "PUT" | "GET" | "DELETE";
  url: string;
  region: string;
  accessKey: string;
  secretKey: string;
  body: Uint8Array;
  contentType?: string;
  service?: string;
};

export async function signS3Request(
  params: SignParams,
): Promise<Record<string, string>> {
  const service = params.service ?? "s3";
  const url = new URL(params.url);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = createHash("sha256").update(params.body).digest("hex");

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (params.contentType) headers["content-type"] = params.contentType;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${headers[name].trim()}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");

  const canonicalRequest = [
    params.method,
    encodePath(url.pathname),
    url.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${params.region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const hmac = (key: Buffer | string, data: string): Buffer =>
    createHmac("sha256", key).update(data).digest();

  const kDate = hmac(`AWS4${params.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, params.region);
  const kService = hmac(kRegion, service);
  const signingKey = hmac(kService, "aws4_request");

  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  headers.authorization =
    `AWS4-HMAC-SHA256 Credential=${params.accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return headers;
}

/** Percent-encode each path segment, leaving the separators alone. */
function encodePath(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join("/");
}
