// Retries KYC after DOCUMENT_PAGE_MISSING: national_id needs front AND back.
// Usage: node scripts/probe-retry.mjs <userId> <walletAddress>
import { readFileSync } from "fs";
import { deflateSync } from "zlib";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const BASE = env.BMONI_BASE_URL.replace(/\/$/, "");
const [uid, walletAddress] = process.argv.slice(2);

function makePng(width, height, [r, g, b]) {
  const crcTable = [...Array(256)].map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc(height * (width * 3 + 1));
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    for (let x = 0; x < width; x++) {
      const n = () => (Math.random() * 40) | 0;
      raw[o++] = Math.min(255, r + n());
      raw[o++] = Math.min(255, g + n());
      raw[o++] = Math.min(255, b + n());
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method, headers: { "x-api-key": env.BMONI_API_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text(); let p; try { p = JSON.parse(t); } catch { p = t; }
  console.log(`\n${res.ok ? "OK " : "ERR"} ${method} ${path} -> ${res.status}`);
  console.log(JSON.stringify(p, null, 1).slice(0, 700));
  return { ok: res.ok, body: p };
}

console.log("=== retry KYC ===");
await call("POST", `/v1/users/${uid}/kyc/retry`, {});

console.log("\n=== re-upload identification with FRONT + BACK ===");
const form = new FormData();
form.append("files", new Blob([makePng(700, 440, [30, 48, 51])], { type: "image/png" }), "id-front.png");
form.append("files", new Blob([makePng(700, 440, [20, 84, 92])], { type: "image/png" }), "id-back.png");
form.append("type", "national_id");
form.append("documentNumber", "SANDBOX-TEST-0001");
form.append("issuingCountry", "NGA");
const up = await fetch(`${BASE}/v1/users/${uid}/kyc/documents/identification`, {
  method: "POST", headers: { "x-api-key": env.BMONI_API_KEY }, body: form,
});
console.log(`${up.ok ? "OK " : "ERR"} upload -> ${up.status}`);
console.log((await up.text()).slice(0, 400));

console.log("\n=== readiness ===");
await call("GET", `/v1/users/${uid}/kyc/readiness`);

console.log("\n=== activate ===");
await call("POST", `/v1/users/${uid}/kyc/activate`, { sumsubLevelName: "id-only" });

console.log("\n=== poll review + anchor ===");
for (let i = 1; i <= 8; i++) {
  await new Promise((r) => setTimeout(r, 9000));
  const st = await fetch(`${BASE}/v1/users/${uid}/kyc/status`, { headers: { "x-api-key": env.BMONI_API_KEY } });
  const ob = await fetch(`${BASE}/v1/users/${uid}/onboarding/status`, { headers: { "x-api-key": env.BMONI_API_KEY } });
  const s = await st.json().catch(() => null);
  const o = await ob.json().catch(() => null);
  console.log(`poll ${i}: kyc=${s?.status}/${s?.reviewAnswer} labels=${JSON.stringify(s?.rejectLabels)} anchor=${o?.anchorStatus}`);
  if (s?.reviewAnswer === "GREEN" || o?.anchorStatus === "active") { console.log("*** APPROVED"); break; }
}

console.log("\n=== final: start-nigeria + accounts ===");
await call("POST", `/v1/users/${uid}/onboarding/start-nigeria`, {
  bvn: "22222222222", ngnWalletAddress: walletAddress, ngnWalletIndex: 0,
});
await call("GET", `/v1/users/${uid}/onboarding/status`);
await call("GET", `/v1/users/${uid}/bank-accounts/deposit-accounts/NGN`);
