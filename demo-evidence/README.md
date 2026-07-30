# Demo evidence — real BMONI sandbox traffic

Captured request/response pairs from `https://embedded-dev.bmoni.com`, kept per the
hackathon guidance in case the sandbox is unavailable during judging.

**Nothing here is mocked.** Every file is a real HTTP exchange. The partner API key is
replaced with `***REDACTED***` before anything is written, and BVN/NIN fields are
redacted separately. Regenerate with `npm run capture-evidence`.

| File | Call | Shows |
|---|---|---|
| `01-smart-wallets.json` | `GET .../smart-wallets/account/wallets` | Live NGN smart wallet, on-chain address |
| `02-balances.json` | `GET .../smart-wallets/account/balances` | Real ₦10,000 cNGN balance |
| `03-onboarding-status.json` | `GET .../onboarding/status` | Anchor rail state |
| `04-deposit-accounts-ngn.json` | `GET .../bank-accounts/deposit-accounts/NGN` | The Nigerian collection account shown to customers |
| `05-transactions.json` | `GET .../transactions/{walletId}` | Transaction ledger used for reconciliation |
| `06-nigerian-banks.json` | `GET .../bank-accounts/nigerian-banks` | 170 Nigerian banks with CBN codes |
| `07-verify-nigerian-account.json` | `POST .../verify-nigerian-account` | Live account-name resolution |
| `08-kyc-readiness.json` | `GET .../kyc/readiness` | What KYC still requires |
| `09-kyc-profile.json` | `GET .../kyc` | KYC profile state |
| `10-bank-accounts-all.json` | `GET .../bank-accounts` | Deposit + withdrawal accounts |

`live-calls.jsonl` is an append-only log of every BMONI call the running app makes,
written by `lib/bmoni-log.ts` with the same redaction. It is the audit trail for a live
demo; the numbered files above are the curated snapshot.

## Known sandbox limitations (verified, not assumed)

1. **No dedicated virtual account on this key.** `POST /onboarding/start-nigeria`
   returns `200` with `hasBvn: true, hasLocalWallet: true`, but `anchorStatus` stays
   `not_started` and the only NGN deposit account is the shared `pooled-vba-1`.
   Tracko therefore shows that pooled account plus a unique per-order reference, and
   says so in the UI rather than implying a private account.

2. **KYC activation needs identity documents.** `POST /kyc/activate` rejects an empty
   body and demands a `sumsubLevelName`; every valid level requires uploading an ID
   document. This project deliberately does not collect real identity documents, so the
   Anchor rail cannot be activated here.

3. **The pooled account carries placeholder data.** `bankCode` is `"XXXXXXX"` and
   `targetCurrency` reads `"EUR"` on an NGN account. The UI shows the bank *name* rather
   than the code for this reason.

## Discrepancies between the published docs and the live API

| Documented | Actual |
|---|---|
| `openapi.json` on the docs site | A Mintlify placeholder (`/plants`). The real spec is at `embedded-dev.bmoni.com/docs/openapi.json` |
| NGN `POST /kyc/activate` takes an empty body | Rejects it; requires `sumsubLevelName` |
| `onramp/vba/nigeria` "issues a virtual account" | Links an *existing* `bankAccountId` to a wallet |
| Transactions wrapped in `{ data: { transactions } }` | Returned flat: `{ transactions, page, total, ... }` |
| Onboarding status has 4 provider fields | Also returns `bridgeStatus` |
