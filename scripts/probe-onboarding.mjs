// Probes the FULL BMONI onboarding chain on a brand-new throwaway user, to find
// exactly where it breaks before committing it to application code.
import { readFileSync } from "fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/)
  .filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1).trim().replace(/^["']|["']$/g,"")]}));
const BASE = env.BMONI_BASE_URL.replace(/\/$/,"");

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "x-api-key": env.BMONI_API_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  const ok = res.ok ? "OK " : "ERR";
  console.log(`\n${ok} ${method} ${path} -> ${res.status}`);
  console.log(JSON.stringify(parsed, null, 1).slice(0, 900));
  return { status: res.status, body: parsed, ok: res.ok };
}

const stamp = Date.now();
// Nigerian mobile numbers are 11 digits locally: 0 + 10. Keep it plausible.
const phone = `+23480${String(stamp).slice(-8)}`;
const email = `tracko.trader.${stamp}@example.com`;

console.log("=== STEP 1: create user ===");
const user = await call("POST", "/v1/users", {
  firstName: "Ada",
  lastName: "Okonkwo",
  email,
  phoneNumber: phone,
});
const uid = user.body?.user?.bmoniUserId ?? user.body?.bmoniUserId;
console.log("\n>>> userId:", uid, "| phone:", phone);
if (!uid) process.exit(1);

console.log("\n=== STEP 2: owner keypair + proof challenge ===");
const pk = generatePrivateKey();
const account = privateKeyToAccount(pk);
console.log(">>> owner address:", account.address);

const challenge = await call("POST", `/v1/users/${uid}/smart-wallets/owner-proof-challenges`, {
  currency: "CNGN",
  userOwnerAddress: account.address,
});
if (!challenge.ok) process.exit(1);

const signature = await account.signMessage({ message: challenge.body.message });
console.log("\n>>> signature:", signature.slice(0, 30) + "...");

console.log("\n=== STEP 3: create managed smart wallet ===");
const wallet = await call("POST", `/v1/users/${uid}/smart-wallets/create-managed`, {
  currency: "CNGN",
  userOwnerAddress: account.address,
  ownerProofChallengeId: challenge.body.challengeId,
  ownerProofSignature: signature,
});

console.log("\n=== STEP 4: state after wallet ===");
await call("GET", `/v1/users/${uid}/smart-wallets/account/wallets`);
await call("GET", `/v1/users/${uid}/kyc/readiness`);
await call("GET", `/v1/users/${uid}/onboarding/status`);

console.log("\n\n########## SUMMARY ##########");
console.log("userId:", uid);
console.log("email:", email);
console.log("phone:", phone);
console.log("ownerAddress:", account.address);
console.log("ownerPrivateKey:", pk);
console.log("walletId:", wallet.body?.id);
