# Agent Prompt: Make Tracko Pitch-Ready

> Paste everything below into Claude Code (or your agent) as the opening message.
> Attach `BMONI_Hackathon_Quick_Start.docx` and `Tracko_Project_Doc.pdf` alongside it.

---

## Context

You are working on **Tracko**, a Next.js (App Router) + TypeScript + Tailwind app being
submitted to the NITHUB Innovation Fair Hackathon 2026, theme "Intelligent Money for
Everyone." It is a sales, customer, and credit tracker for informal Nigerian traders
(market sellers, small shop owners, WhatsApp/Instagram vendors), built on the BMONI
Embedded API plus an AI layer.

I am the product lead and pitch lead. The demo is judged live by BMONI technical staff,
so the integration has to be real, not simulated.

**Reference docs you must read before writing code:**

- BMONI docs index: https://bkey.mintlify.site/llms.txt
- Integration flow: https://bkey.mintlify.app/api-reference/integration-flow
- Lifecycle: https://bkey.mintlify.app/lifecycle
- NGN deposits and bank withdrawals: https://bkey.mintlify.app/api-reference/ngn-rails
- Nigeria KYC requirements: https://bkey.mintlify.app/api-reference/kyc-nga-requirements
- Interactive API reference: https://embedded-dev.bmoni.com/docs
- OpenAPI spec: https://bkey.mintlify.app/api-reference/openapi.json

Read the actual docs. Do not guess endpoint shapes from memory.

---

## Hard constraints (do not violate any of these)

1. **Sandbox base URL is `https://embedded-dev.bmoni.com`. Do NOT append `/v1`** to the
   base URL. The endpoint paths already contain `/v1`.
2. **The API key never touches the client.** It lives in `BMONI_API_KEY` in `.env.local`,
   is read only inside server-side route handlers, and is sent as the `x-api-key` header.
   Make sure `.env.local` is in `.gitignore`. Never log it, never return it in a response,
   never reference it in a `"use client"` file.
3. **Wallet currency is `CNGN`, not `NGN`** wherever a wallet endpoint asks for currency.
4. **Sandbox KYC only.** Test BVN `22222222222`, country code `NGA`. Never accept or
   submit a real BVN, NIN, or identity document anywhere in this codebase.
5. **The BMONI call order is strict and calls fail if you break it:**
   `create user → create wallet → complete KYC → activate NGN rail → fund wallet →
   read or move money`
6. **Never send secrets or PII to the AI model.** No API keys, no BVNs, no wallet
   addresses, no full phone numbers, no account numbers in any prompt. Aggregates and
   first names only. Enforce this with a sanitiser function, not just discipline.
7. **No mocking or faking BMONI responses.** Every BMONI-labelled thing in the UI must
   come from a real sandbox call. If a call can't be made yet, surface an honest error
   state rather than a fake success.

---

## Task 1: Replace the wallet address with a Nigerian virtual account

**This is the highest priority change.**

Right now `POST /api/bmoni/create-payment` returns a raw `0x...` smart wallet address and
the UI tells the customer to send money there. No Nigerian market customer will do this,
and it will not survive a judge's first question.

Read the NGN rails doc and rework the flow so that requesting payment on an order
provisions or reuses a **Nigerian virtual account**, and the UI shows the customer a
normal **bank name + 10-digit account number + account name + amount + reference**.

Acceptance criteria:
- The payment card in the order detail page shows bank details, not a hex address.
- Virtual account details are persisted on the order record, not held only in React state.
- The trader can reopen the order after a page refresh and still see the account details.
- There is a visible "copy account number" button.

If the sandbox does not support virtual account provisioning on the shared dev key, stop
and tell me what it does support instead, and propose the closest realistic alternative.
Do not silently fall back to showing a wallet address.

---

## Task 2: Complete and verify the full onboarding chain

Audit every file under `app/api/bmoni/` (and any BMONI service/lib module) against the
documented sequence. Build whatever is missing so a trader can go from zero to
receiving money.

Required:
- `POST /v1/users` with a unique email and phone per trader. Persist `bmoniUserId`.
- Smart wallet creation, including the owner-proof challenge and signature step.
  Persist the smart wallet ID and address.
- Sandbox KYC submission, then poll `GET /v1/users/{userId}/onboarding/status`.
- `POST /v1/users/{userId}/onboarding/start-nigeria` to activate the NGN rail.
  Confirm the rail is active before allowing any deposit or withdrawal action in the UI.
- Read endpoints wired up: `.../account/wallets`, `.../account/balances`,
  `.../account/transactions`.

Add a single **onboarding status component** in the trader's settings or dashboard that
shows each stage as pending / in progress / complete, driven by real API responses. This
doubles as a debugging tool for me and as proof of a real integration for the judges.

Every BMONI request/response should be logged server-side (with the key and any BVN
redacted) to a file or console, so I have evidence if the sandbox goes down mid-judging.

---

## Task 3: Make payment confirmation feel automatic

The project doc promises the order auto-marks Paid when BMONI confirms. The code
currently requires the trader to tap "I've sent it, check payment."

Change it so that once a payment request is generated, the client polls
`/api/bmoni/check-payment` on an interval (every 5 seconds, stop after 3 minutes or on
success). The check should verify against real BMONI balance or transaction data, not a
local flag. Keep a manual "check now" button as a fallback, but the happy path should
require no tap.

When payment lands: update order status, show a clear success state, and stop polling.

---

## Task 4: Build the credit book

This is the feature that makes Tracko recognisable to a real trader and it is currently
missing entirely.

Extend the order model:
- `isCredit: boolean` (sold on credit rather than paid up front)
- `dueDate: Date | null`
- `amountPaid: number` to support part payments
- Derive `amountOutstanding` from `price - amountPaid`

Extend the status model beyond `PENDING | PAID | DELIVERED` so that credit and overdue
states are representable. Fix the existing bug where the "✓ Paid" badge renders on any
status that is not `PENDING`, which currently makes delivered orders and every future
status look paid.

Add to the dashboard:
- Total outstanding across all customers
- A list of overdue debts, sorted by how late they are
- Per-customer credit history (how many times they took credit, how many times late)

---

## Task 5: Make the AI prescriptive, not descriptive

Two AI surfaces, both must produce decisions rather than summaries.

**Follow-up messages** (`/api/ai/followup`):
- Keep the three types but rename to match reality: payment reminder, delivery update,
  restock nudge.
- Generate in warm, plain Nigerian English. Short. Suitable for WhatsApp.
- Adjust tone by how overdue the debt is: gentle at 2 days, firmer at 3 weeks.
- Replace copy-to-clipboard with a WhatsApp deep link
  (`https://wa.me/{digits}?text={encodeURIComponent(message)}`), keeping copy as a
  secondary option. The phone number is used to build the link client-side and is never
  sent to the AI model.

**Business insights** (new or reworked endpoint):
Do not ship "your top customer is X." Ship judgements a trader can act on:
- Credit risk flags: which customers have a pattern of paying late, with the evidence
- Cash-flow-gap prediction: money owed to you this week versus your current wallet
  balance, and who to chase first
- Concrete next actions, ranked

Send the model aggregated stats and first names only. Write a `sanitiseForAI()` helper
that strips phone numbers, wallet addresses, account numbers, emails, and any ID fields,
and route every AI call through it. Add a test that proves the sanitiser works.

---

## Task 6: End-of-day WhatsApp summary

Add a "Send today's summary" action that composes a short end-of-day performance
message (sales today, payments received, new debts, who is overdue tomorrow) and opens
it as a prefilled WhatsApp message to the trader's own number. If a scheduled job is
feasible, add one; otherwise the manual trigger is enough for the demo, but structure the
code so scheduling is a small change later.

---

## Task 7: Demo hardening

Nothing here is optional. The demo runs on hackathon wifi.

- **Error states everywhere.** Every `catch` block currently does `console.error` and
  nothing else. Replace with visible, human-readable error UI. A silent failure on stage
  looks like a frozen app.
- **Loading states** on every async action, including the new polling.
- **Mobile-first check.** Traders use phones. Verify every screen at 375px width.
- **Seed script** that populates realistic demo data: a dozen customers with Nigerian
  names, a spread of orders across the last 6 weeks, at least two customers with a clear
  late-payment pattern so the credit-risk flag actually fires on stage, and one cash-flow
  gap the insights can catch.
- **Response capture.** Save real sandbox request/response pairs for the key calls into a
  `demo-evidence/` folder. The hackathon rules explicitly recommend this in case the
  sandbox is unavailable during judging.

---

## Task 8: Correct the project doc

`Tracko_Project_Doc.pdf` section 4 lists Mastercard issuance and biometric-secured access
as BMONI capabilities we're using. Those are consumer BMONI app features, not part of the
Embedded API we have access to. BMONI staff are judging this, so it will be noticed.

Produce a corrected version of section 4 that lists only capabilities that exist in the
Embedded API and that we actually use: Nigerian virtual accounts for receiving payment,
cNGN and USDB balances, bank withdrawal via the offramp flow, and transaction history as
the substrate for a verifiable trader credit record.

Also flag any other claim in the doc that the code does not currently support, so I can
fix the deck before I pitch.

---

## How to work

1. Start by reading the BMONI docs listed above and the two attached files.
2. Then read the existing codebase and give me a short written audit: what exists, what
   is stubbed, what is missing, and the order you plan to tackle the tasks in. **Wait for
   me to confirm before writing code.**
3. Work task by task. After each task, tell me what changed and what I should test.
4. If a BMONI endpoint behaves differently from the docs, stop and tell me. Do not
   invent a workaround that fakes the result.
5. Do not refactor anything unrelated to these tasks. Time is short.

## Definition of done

The submission must demonstrably show all six of the hackathon's minimum qualifying
criteria:

- [ ] A working, testable product
- [ ] Real requests to the BMONI sandbox (evidenced in `demo-evidence/`)
- [ ] At least one meaningful BMONI-powered financial function
- [ ] A functional AI component with clear user value
- [ ] Responsible handling of data, privacy, and financial safety
- [ ] A clearly defined target user and financial problem

Tell me explicitly, at the end, which of these you consider met and which are weak.