/**
 * The privacy boundary for the AI layer.
 *
 * Nothing reaches a model without passing through here. Two independent
 * defences, because either one alone eventually leaks:
 *
 *   1. Key dropping — any field whose NAME looks identifying is removed
 *      outright, so a new field added to the Order model is excluded by
 *      default rather than silently forwarded.
 *   2. Value scrubbing — any surviving string is scanned for phone numbers,
 *      emails, 0x addresses and long digit runs, catching identifiers that
 *      arrive inside otherwise-innocent free text such as an item name.
 *
 * Names are reduced to a first name: a trader needs "chase Ada", and a full
 * name plus a debt is a meaningfully more identifying record.
 */

/** Identifying words, matched case-insensitively anywhere in the field name. */
const FORBIDDEN_WORD = /phone|email|address|account|bvn|\bnin\b|reference|ref$|token|key|secret|password/i;

/**
 * Identifier suffixes, matched CASE-SENSITIVELY on purpose: the camelCase
 * boundary in `[a-z]Id$` is what separates orderId from amountPaid, and an
 * `i` flag would collapse that distinction and strip the amount.
 */
const FORBIDDEN_ID = /^_?[iI][dD]$|[a-z]Id$|_id$/;

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_ID.test(key) || FORBIDDEN_WORD.test(key);
}

const SCRUBBERS: [RegExp, string][] = [
  // Emails
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email removed]"],
  // EVM / wallet addresses
  [/\b0x[a-fA-F0-9]{6,}\b/g, "[address removed]"],
  // Nigerian and international phone numbers
  [/\+?\d[\d\s().-]{8,}\d/g, "[number removed]"],
  // Bare account/BVN-length digit runs
  [/\b\d{10,}\b/g, "[number removed]"],
];

export function scrubText(input: string): string {
  return SCRUBBERS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), input);
}

/** "Chidi Okafor" -> "Chidi". Empty input stays empty rather than becoming "undefined". */
export function firstNameOnly(name: string | null | undefined): string {
  if (!name) return "";
  return scrubText(String(name).trim().split(/\s+/)[0] ?? "");
}

/**
 * Recursively strips identifying fields and scrubs identifying values.
 * Returns a structurally similar value that is safe to place in a prompt.
 */
export function sanitiseForAI<T>(value: T): T {
  return walk(value, 0) as T;
}

function walk(value: unknown, depth: number): unknown {
  if (depth > 12) return null; // cycle / bomb guard

  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10); // date, not time
  if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1));

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (isForbiddenKey(key)) continue;
      // Names are narrowed rather than dropped — the trader needs to know who.
      if (/name$/i.test(key) && typeof item === "string" && !/bankName|itemName/i.test(key)) {
        out[key] = firstNameOnly(item);
        continue;
      }
      out[key] = walk(item, depth + 1);
    }
    return out;
  }

  return null;
}

/**
 * Last line of defence. Throws if a payload still contains anything that looks
 * identifying, so a prompt-building mistake fails loudly in development instead
 * of quietly shipping a phone number to Groq.
 */
export function assertSafeForAI(payload: unknown): void {
  const json = JSON.stringify(payload ?? "");
  const leaks: string[] = [];

  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(json)) leaks.push("email address");
  if (/0x[a-fA-F0-9]{6,}/.test(json)) leaks.push("wallet address");
  if (/\d{10,}/.test(json)) leaks.push("account or phone number");

  if (leaks.length) {
    throw new Error(`Refusing to send data to the AI model — it still contains: ${leaks.join(", ")}.`);
  }
}
