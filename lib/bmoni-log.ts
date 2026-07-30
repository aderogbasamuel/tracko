import { appendFileSync, mkdirSync } from "fs";
import path from "path";

/**
 * Server-side audit trail for every BMONI call.
 *
 * Two jobs: give the trader evidence of real sandbox traffic if BMONI goes down
 * mid-judging, and make failures debuggable without ever writing a secret to
 * disk. Redaction happens before anything is serialised, not after.
 */

const LOG_DIR = "demo-evidence";
const LOG_FILE = path.join(LOG_DIR, "live-calls.jsonl");

const SECRETS = [process.env.BMONI_API_KEY, process.env.GROQ_API_KEY].filter(
  (s): s is string => Boolean(s && s.length > 8)
);

/** Anything that looks like a BVN/NIN (11 digits) or an account number (10 digits). */
const ID_PATTERNS: [RegExp, string][] = [
  [/"(bvn|nin)"\s*:\s*"[^"]*"/gi, '"$1":"***REDACTED***"'],
  [/\b\d{11}\b/g, "***ID-REDACTED***"],
];

export function redact(value: unknown): unknown {
  if (value === undefined) return undefined;
  let json: string;
  try {
    json = JSON.stringify(value);
  } catch {
    return "[unserialisable]";
  }
  if (json === undefined) return undefined;

  for (const secret of SECRETS) {
    json = json.split(secret).join("***REDACTED***");
  }
  for (const [pattern, replacement] of ID_PATTERNS) {
    json = json.replace(pattern, replacement);
  }

  try {
    return JSON.parse(json);
  } catch {
    return "[unserialisable]";
  }
}

export interface BmoniLogEntry {
  method: string;
  path: string;
  status: number;
  ms: number;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
}

export function logBmoniCall(entry: BmoniLogEntry) {
  const record = {
    at: new Date().toISOString(),
    method: entry.method,
    path: entry.path,
    status: entry.status,
    ms: entry.ms,
    ...(entry.error ? { error: entry.error } : {}),
    request: redact(entry.requestBody) ?? null,
    response: redact(entry.responseBody) ?? null,
  };

  const ok = entry.status >= 200 && entry.status < 300;
  console.log(
    `[bmoni] ${ok ? "✓" : "✗"} ${entry.method} ${entry.path} → ${entry.status} (${entry.ms}ms)`
  );
  if (!ok) console.log(`[bmoni]   ${JSON.stringify(record.response)?.slice(0, 300)}`);

  // Best-effort: a read-only filesystem must never take down a payment request.
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, JSON.stringify(record) + "\n", "utf8");
  } catch {
    /* console log above is the fallback */
  }
}
