/**
 * Captures real BMONI sandbox request/response pairs into demo-evidence/.
 *
 * The hackathon rules recommend keeping these in case the sandbox is
 * unavailable during judging. The API key and any BVN are redacted before
 * anything is written to disk.
 *
 * Run with: node scripts/capture-evidence.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const BASE = env.BMONI_BASE_URL.replace(/\/$/, "");
const UID = env.BMONI_TRADER_USER_ID;
mkdirSync("demo-evidence", { recursive: true });

const redact = (value) =>
  JSON.parse(
    JSON.stringify(value)
      .split(env.BMONI_API_KEY)
      .join("***REDACTED***")
      .replace(/"(bvn|nin)":"[^"]*"/gi, '"$1":"***REDACTED***"')
  );

const captured = [];

async function capture(name, method, path, body) {
  const startedAt = new Date().toISOString();
  const res = await fetch(BASE + path, {
    method,
    headers: { "x-api-key": env.BMONI_API_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  const record = redact({
    name,
    capturedAt: startedAt,
    request: {
      method,
      url: BASE + path,
      headers: { "x-api-key": "***REDACTED***" },
      body: body ?? null,
    },
    response: { status: res.status, body: parsed },
  });

  writeFileSync(`demo-evidence/${name}.json`, JSON.stringify(record, null, 2));
  captured.push({ name, method, path, status: res.status });
  console.log(`${String(res.status).padEnd(4)} ${method.padEnd(5)} ${path}`);
  return parsed;
}

const wallets = await capture(
  "01-smart-wallets",
  "GET",
  `/v1/users/${UID}/smart-wallets/account/wallets`
);
const walletId = Array.isArray(wallets) ? wallets[0]?.id : undefined;

await capture("02-balances", "GET", `/v1/users/${UID}/smart-wallets/account/balances`);
await capture("03-onboarding-status", "GET", `/v1/users/${UID}/onboarding/status`);
await capture("04-deposit-accounts-ngn", "GET", `/v1/users/${UID}/bank-accounts/deposit-accounts/NGN`);
if (walletId) await capture("05-transactions", "GET", `/v1/users/${UID}/transactions/${walletId}`);
await capture("06-nigerian-banks", "GET", `/v1/users/${UID}/bank-accounts/nigerian-banks`);
await capture("07-verify-nigerian-account", "POST", `/v1/users/${UID}/bank-accounts/verify-nigerian-account`, {
  accountNumber: "0123456789",
  bankCode: "000013",
});
await capture("08-kyc-readiness", "GET", `/v1/users/${UID}/kyc/readiness`);
await capture("09-kyc-profile", "GET", `/v1/users/${UID}/kyc`);
await capture("10-bank-accounts-all", "GET", `/v1/users/${UID}/bank-accounts`);

writeFileSync(
  "demo-evidence/index.json",
  JSON.stringify({ capturedAt: new Date().toISOString(), baseUrl: BASE, calls: captured }, null, 2)
);

console.log(`\n${captured.length} calls captured to demo-evidence/`);
