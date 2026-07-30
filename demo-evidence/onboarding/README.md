# Live new-trader onboarding — real BMONI sandbox calls

Every step below is a **real** call against `https://embedded-dev.bmoni.com`, run
end-to-end on a brand-new sandbox trader created specifically for this test. Nothing
here is mocked or replayed.

| # | Step | Endpoint | Result |
|---|------|----------|--------|
| 1 | Create trader | `POST /v1/users` | **201** — `bmoniUserId` issued |
| 2 | Owner-proof challenge | `POST /v1/users/{id}/smart-wallets/owner-proof-challenges` | **201** — EIP-191 message returned |
| 3 | Sign challenge | viem `signMessage` (secp256k1, server-side) | signature produced |
| 4 | Create smart wallet | `POST /v1/users/{id}/smart-wallets/create-managed` | **201** — on-chain smart account deployed |
| 5 | Submit KYC profile | `PATCH /v1/users/{id}/kyc` | **200** — personalInfo, address, sandbox BVN saved |
| 6 | Upload ID document | `POST /v1/users/{id}/kyc/documents/identification` | **201** |
| 7 | Upload proof of address | `POST /v1/users/{id}/kyc/documents/proof-of-address` | **201** |
| 8 | Upload biometric | `POST /v1/users/{id}/kyc/documents/biometric` | **201** |
| 9 | Readiness | `GET /v1/users/{id}/kyc/readiness` | **200** — `ready: true, missing: []` |
| 10 | Activate KYC | `POST /v1/users/{id}/kyc/activate` | **200** — `activated: true`, Sumsub applicant created |
| 11 | Poll review | `GET /v1/users/{id}/kyc/status` | **200** — live verdict from Sumsub |
| 12 | Start NGN rail | `POST /v1/users/{id}/onboarding/start-nigeria` | **200** — `hasBvn: true, hasLocalWallet: true` |

## Wallet creation without the mobile SDK

BMONI documents wallet creation via the Flutter / React Native SDK. There is no web SDK,
which appears to rule out a browser-based product entirely.

It does not. The owner proof is a standard **EIP-191 `personal_sign`**, so Tracko
generates a secp256k1 keypair with `viem` and signs the challenge server-side. BMONI
verified the recovered signer and deployed the smart account — step 4 above returned
`201` with a real on-chain address.

This is the single most important technical finding in the build: it is what makes a web
Tracko possible at all.

## The one step that cannot complete, and why

Sumsub returns `action_required / RED / DOCUMENT_PAGE_MISSING`.

It performs genuine document analysis, so the synthetic placeholder images generated for
this test are correctly rejected. Retried with both front and back pages via
`POST /kyc/retry` — same verdict. A generated image will never pass, by design.

Clearing it requires a **real** national ID, passport or driver's licence. The hackathon
rules state plainly:

> Do not submit a participant's real BVN, NIN, passport or other identity documents.

So this is a deliberate stop on our side, not a missing feature. Tracko implements the
upload endpoints in full; we simply decline to feed them a real identity document.

**Consequence:** `anchorStatus` stays `not_started`, so no dedicated per-trader virtual
account is issued. Tracko therefore collects into BMONI's shared Nigerian account with a
unique per-order reference, and says so in the UI. The moment a real document clears
review, the same code path issues a dedicated account with no changes.

## Reproducing

```bash
node scripts/probe-onboarding.mjs          # steps 1–4, prints the new userId
node scripts/probe-kyc.mjs <userId> <addr> # step 5
node scripts/probe-documents.mjs <userId> <addr>  # steps 6–12
```

The application does the same thing through `lib/bmoni-onboarding.ts`; the scripts exist
so the chain can be demonstrated independently of the UI.
