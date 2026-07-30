// Continues the onboarding probe: KYC submission -> readiness -> activate ->
// start-nigeria -> anchor status -> virtual account.
// Usage: node scripts/probe-kyc.mjs <userId> <walletAddress>
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const BASE = env.BMONI_BASE_URL.replace(/\/$/, "");
const [uid, walletAddress] = process.argv.slice(2);

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "x-api-key": env.BMONI_API_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  console.log(`\n${res.ok ? "OK " : "ERR"} ${method} ${path} -> ${res.status}`);
  console.log(JSON.stringify(parsed, null, 1).slice(0, 1100));
  return { status: res.status, body: parsed, ok: res.ok };
}

console.log("=== KYC options (valid enums) ===");
const options = await call("GET", `/v1/users/${uid}/kyc/options`);

console.log("\n=== PATCH /kyc — sandbox identity only ===");
await call("PATCH", `/v1/users/${uid}/kyc`, {
  personalInfo: {
    firstName: "Ada",
    lastName: "Okonkwo",
    dateOfBirth: "1992-04-17",
    gender: "female",
    nationality: "NG",
    placeOfBirth: "Lagos",
  },
  address: {
    streetLine1: "15 Admiralty Way",
    city: "Lekki",
    state: "Lagos",
    postalCode: "101241",
    countryCode: "NGA",
  },
  // Sandbox test BVN only — never a real one.
  identificationNumbers: [
    { type: "bvn", number: "22222222222", issuingCountryCode: "NGA" },
  ],
  sourceOfFunds: "business",
  estimatedMonthlyVolume: 500000,
  accountPurpose: "business",
  actingAsIntermediary: false,
});

console.log("\n=== readiness after KYC ===");
await call("GET", `/v1/users/${uid}/kyc/readiness`);

console.log("\n=== start-nigeria (index 0) ===");
await call("POST", `/v1/users/${uid}/onboarding/start-nigeria`, {
  bvn: "22222222222",
  ngnWalletAddress: walletAddress,
  ngnWalletIndex: 0,
});

console.log("\n=== onboarding status ===");
await call("GET", `/v1/users/${uid}/onboarding/status`);

console.log("\n=== deposit accounts (NGN) ===");
await call("GET", `/v1/users/${uid}/bank-accounts/deposit-accounts/NGN`);

console.log("\n=== kyc status / profile ===");
await call("GET", `/v1/users/${uid}/kyc/status`);
