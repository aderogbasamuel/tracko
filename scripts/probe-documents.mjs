// Uploads SYNTHETIC sandbox KYC documents and checks whether the Anchor NGN
// rail activates. The images are generated here in code — they are solid-colour
// PNGs, not photographs of anybody. No real identity document is ever used.
// Usage: node scripts/probe-documents.mjs <userId> <walletAddress>
import { readFileSync } from "fs";
import { deflateSync } from "zlib";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const BASE = env.BMONI_BASE_URL.replace(/\/$/, "");
const [uid, walletAddress] = process.argv.slice(2);

/** Builds a valid solid-colour PNG without any image library. */
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
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type: truecolour
  const raw = Buffer.alloc(height * (width * 3 + 1));
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      // Dithered noise around the base colour. A flat fill deflates to under
      // the API's 2KB minimum, so the image has to carry some entropy.
      const n = () => (Math.random() * 40) | 0;
      raw[o++] = Math.min(255, r + n());
      raw[o++] = Math.min(255, g + n());
      raw[o++] = Math.min(255, b + n());
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function upload(path, fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value?.__file) form.append(key, new Blob([value.bytes], { type: "image/png" }), value.name);
    else form.append(key, value);
  }
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "x-api-key": env.BMONI_API_KEY }, // no Content-Type: fetch sets the boundary
    body: form,
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  console.log(`\n${res.ok ? "OK " : "ERR"} POST ${path} -> ${res.status}`);
  console.log(JSON.stringify(parsed, null, 1).slice(0, 700));
  return { ok: res.ok, body: parsed };
}

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "x-api-key": env.BMONI_API_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  console.log(`\n${res.ok ? "OK " : "ERR"} ${method} ${path} -> ${res.status}`);
  console.log(JSON.stringify(parsed, null, 1).slice(0, 800));
  return { ok: res.ok, body: parsed };
}

const file = (name, colour) => ({ __file: true, name, bytes: makePng(640, 400, colour) });

console.log("=== identification document (synthetic) ===");
await upload(`/v1/users/${uid}/kyc/documents/identification`, {
  files: file("sandbox-id-front.png", [30, 48, 51]),
  type: "national_id",
  documentNumber: "SANDBOX-TEST-0001",
  issuingCountry: "NGA",
});

console.log("\n=== proof of address (synthetic) ===");
await upload(`/v1/users/${uid}/kyc/documents/proof-of-address`, {
  files: file("sandbox-poa.png", [23, 108, 119]),
  type: "utility_bill",
});

console.log("\n=== biometric selfie (synthetic) ===");
await upload(`/v1/users/${uid}/kyc/documents/biometric`, {
  selfie: file("sandbox-selfie.png", [42, 218, 221]),
  type: "selfie",
});

console.log("\n=== readiness ===");
await call("GET", `/v1/users/${uid}/kyc/readiness`);

console.log("\n=== activate KYC (Nigeria: id-only level) ===");
await call("POST", `/v1/users/${uid}/kyc/activate`, { sumsubLevelName: "id-only" });

console.log("\n=== start-nigeria ===");
await call("POST", `/v1/users/${uid}/onboarding/start-nigeria`, {
  bvn: "22222222222",
  ngnWalletAddress: walletAddress,
  ngnWalletIndex: 0,
});

console.log("\n=== onboarding status ===");
await call("GET", `/v1/users/${uid}/onboarding/status`);

console.log("\n=== deposit accounts ===");
await call("GET", `/v1/users/${uid}/bank-accounts/deposit-accounts/NGN`);
