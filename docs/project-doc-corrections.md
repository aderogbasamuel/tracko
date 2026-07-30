# Corrections to `Tracko_Project_Doc.pdf`

Every claim below was checked against the live sandbox at
`https://embedded-dev.bmoni.com` and against the real OpenAPI spec at
`/docs/openapi.json`. Captured responses are in `demo-evidence/`.

BMONI staff are judging this, so the deck should only assert what the code does.

---

## Section 4 — replacement text

> ### Why BMONI Matters Here
>
> BMONI is not a bolt-on payment button — it is the backbone of the order record.
> A sale in Tracko is not marked paid until BMONI's transaction data confirms it,
> so every settled order carries real payment evidence rather than a trader's
> recollection.
>
> Over time this builds something informal traders have never had: a verified
> payment history. That history is the raw material for credit, savings products
> and better terms for people formal finance currently ignores.
>
> **BMONI capabilities Tracko actually uses:**
>
> - **Self-custodied smart wallets.** Tracko generates a secp256k1 owner key per
>   trader and proves ownership to BMONI with an EIP-191 signature, then BMONI
>   deploys a managed smart account. The trader's key is theirs, not ours.
> - **Nigerian bank collection.** Customers pay by ordinary bank transfer to a
>   Nigerian account number and reference — no app, no wallet, no crypto literacy
>   required of the buyer.
> - **cNGN balances and on-chain transaction history**, read live, used both to
>   confirm payment and as the evidence base for the credit book.
> - **Nigerian bank directory and account-name verification** — 170 banks with
>   CBN codes, and live NUBAN name resolution, used to confirm a payout account
>   belongs to who the trader thinks it does.
> - **Regulated onboarding** — KYC profile submission, document upload and rail
>   activation, driven end-to-end from the app.

---

## Claims removed, and why

### "Virtual/physical Mastercard card issuance"

**Partly wrong, and wrong in an important way.** The Embedded API *does* expose
card issuance — 15 endpoints covering creation, sensitive-data retrieval,
freeze/unfreeze, spend limits, PIN management and card transactions.

So the capability is real; the problem is that **Tracko does not use any of it**.
Listing it under "capabilities for this build" claims work that does not exist.
Either build it or drop it — the corrected text drops it.

*(If asked in Q&A, the honest and rather good answer is: card issuance is the
natural next step, because a trader who can spend directly from collected sales
never has to cash out at all.)*

### "Biometric-secured access, removing reliance on PINs/passwords"

**This one is simply not there.** The only biometric surface in the API is
`POST /kyc/documents/biometric` — a one-off selfie for identity verification, not
an authentication mechanism. BMONI's own SDKs authenticate signing with a **PIN**.
There is no biometric login to integrate.

### "Multi-currency wallets (Naira / USD)" and "stablecoin-backed USD balances"

**True of the API** — `USDB`, `CNGN`, `CADC`, `EURe`, `GBPe`, `MXNe` are all
supported currencies. But Tracko only provisions a **CNGN** wallet today, and the
project doc itself lists multi-currency under *Stretch / roadmap* in section 6.
Section 4 asserting it as a capability of this build contradicts section 6.
Moved to roadmap language.

---

## Other claims in the doc that the code does not currently support

| Section | Claim | Status |
|---|---|---|
| 3 | "order status updates automatically once BMONI confirms payment" | **Supported.** Client polls every 5s for 3 minutes. Note the honest caveat below on reconciliation. |
| 3 | "AI business insights — top customers, repeat buyers, revenue trend" | **Superseded, in a good way.** The AI now produces credit-risk flags with evidence, a cash-flow-gap prediction and ranked actions. "Top customer" was descriptive; this is prescriptive. Update the deck to match — it is a stronger story. |
| 6 | "BMONI payment link per order" | **Reword.** There is no hosted payment *link*. Tracko issues bank details plus a unique per-order reference, which is what a Nigerian customer can actually act on. |
| 6 | "AI-driven credit scoring — Stretch / roadmap" | **Partly built already.** Per-customer credit history, late-payment patterns and risk flags exist now. Worth promoting out of roadmap. |
| 8 | Demo step 3: "simulate payment" | **Change the wording.** Nothing is simulated. Say "trigger the payment check against live BMONI transaction data" — and be ready to explain the sandbox ledger is empty. |

---

## Two things to say before a judge asks

**1. The collection account is shared, not per-trader.** A dedicated virtual
account requires an activated Anchor rail, which requires KYC documents to clear
Sumsub review. Tracko implements every step of that chain, but clearing review
needs a real national ID — and the hackathon rules explicitly forbid submitting
one. So payments collect into BMONI's shared Nigerian account and are identified
by a unique per-order reference. This is how pooled collection genuinely works in
Nigerian fintech; it is not a workaround.

**2. Reconciliation is reference-first, and refuses to guess.** Because the
account is shared, two orders of the same amount could claim the same credit.
Tracko matches on reference first, then amount within a time window, and returns
*ambiguous* rather than silently marking the wrong order paid. Say this before
someone finds it.

---

## What to lead with instead

The strongest technical claim in this build is not in the doc at all:

> BMONI ships wallet-owner signing as a Flutter/React Native SDK, with no web
> equivalent — which appears to rule out a browser-based product. Tracko does it
> anyway: the owner proof is a standard EIP-191 `personal_sign`, so we generate
> the keypair and sign server-side with viem. BMONI verified the signature and
> deployed the smart account.

That is a real integration finding, it is reproducible, and it is the reason a
trader can onboard from any phone browser without installing anything.
