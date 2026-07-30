# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Note: the Next.js docs referenced above live in `node_modules/next/dist/docs/`, so `npm install` must have been run before you can read them. This project is on Next.js 16.2.12 + React 19.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # production build
npm run lint         # eslint (flat config, eslint-config-next core-web-vitals + typescript)
npm test             # node:test via tsx — tests/*.test.ts
npm run seed         # wipes and reseeds the Order table (tsx lib/seed.ts)
npm run capture-evidence   # re-record real BMONI calls into demo-evidence/

npx prisma migrate dev --name <name>   # create + apply a migration
npx prisma generate                    # regenerate client after schema edits
npx prisma studio                      # inspect prisma/dev.db
```

Run a single test file with `npx tsx --test tests/credit.test.ts`.

`prisma.config.ts` is a **Prisma 7** file and this project runs Prisma 5.22 — the CLI
never reads it. It is inert scaffolding. `npx prisma db seed` is not wired up; use
`npm run seed`.

## Environment

Split deliberately (see `.env.example`); both are gitignored:

- **`.env`** — `DATABASE_URL` only. Not a secret, and the Prisma 5 CLI reads *only* `.env`.
- **`.env.local`** — every secret. Next.js loads both.

`BMONI_TRADER_SMART_WALLET_ID` must be the wallet **UUID**, not the `0x` address —
passing the address makes every transaction lookup 404. `getSmartWalletId()` treats the
env var as a hint and re-resolves from the live wallet list if it is stale, so a bad
value cannot take a demo down.

Missing AI/BMONI keys don't crash the app: every surface degrades to a visible,
human-readable error rather than a silent failure.

## Architecture

Tracko is a single-trader order tracker (Nigerian informal-trade context) that layers a payments integration and an LLM commentary layer over one Prisma model.

**Everything is client-fetched.** Every page is `"use client"` and pulls data through `fetch("/api/...")` in `useEffect`. No page reads the database directly as a server component. When adding a feature, follow that split: DB/secret access goes in an `app/api/**/route.ts`, the page only fetches.

**Data model.** One model — `Order` in `prisma/schema.prisma`. `status` is a plain `String` in the DB but is treated as the union `PENDING | CREDIT | PARTIALLY_PAID | PAID | DELIVERED` declared in `lib/credit.ts`. Adding a status means touching that union, `app/components/StatusBadge.tsx`, and the tab list in `app/orders/page.tsx` — the schema won't enforce it for you.

**`lib/credit.ts` is the single definition of "owed" and "late".** Everything — dashboard, AI prompts, WhatsApp summary — derives its numbers from it, and it is pure so it is directly testable. Two rules matter:

- `amountOutstanding` is **derived** (`price - amountPaid`), never stored, so it cannot drift.
- `OVERDUE` is **derived from the clock**, not stored. A stored overdue flag goes stale the moment nobody looks at it. Use `displayStatus(order)` for rendering, never `order.status` directly.
- `isSettled()` is the only correct "has this been paid?" check. The original bug was `status !== "PENDING"`, which counted DELIVERED — and every status added after it — as paid.

**Two independent UI shells:**
- `app/Wrapper.tsx` exports `DashboardLayout` — the sidebar/header shell. It is *not* a Next.js `layout.tsx`; pages import and wrap themselves in it manually (`app/orders/page.tsx`, `app/orders/[id]/page.tsx`). `app/page.tsx` renders `Navbar` itself instead. `app/layout.tsx` only sets fonts.
- `app/landing/` is a self-contained marketing site (its own `LandingNavbar`, `Footer`, scroll-reveal effects in `page.tsx`).

**`lib/` is the integration boundary** — API routes should stay thin and delegate here:
- `lib/db.ts` — Prisma singleton with the dev hot-reload `globalThis` guard. It casts `PrismaClient` through `any`, so **query results arrive untyped** — annotate them at the call site.
- `lib/credit.ts`, `lib/reconcile.ts`, `lib/summary.ts`, `lib/sanitise.ts`, `lib/whatsapp.ts` — all pure, no IO, all covered by `tests/`.
- `lib/bmoni.ts` — the only module that touches the BMONI API or the key. Every call is logged through `lib/bmoni-log.ts` with the key and BVN redacted.
- `lib/ai.ts` — all Groq calls. System prompts are deliberately tuned for terse, non-hedging output; preserve that tone.
- `lib/anomaly.ts` — pure rule engine (price outliers > 2.5× mean, duplicates within 10 min), needs ≥3 orders.

**The AI privacy boundary is `lib/sanitise.ts`, and it is not optional.** Every payload goes through `sanitiseForAI()`, and `callGroq` calls `assertSafeForAI()` which *throws* rather than sending if a phone number, email, wallet address or long digit run survived. Two watch-outs when editing it:
- Key matching is split into a case-insensitive word list and a **case-sensitive** ID list. The `[a-z]Id$` pattern is what separates `orderId` from `amountPaid`; adding an `i` flag silently strips the amount.
- Credit-risk flags are decided in code (`CustomerCredit.isRisky`), not by the model. The route sends a `riskyCustomers` allowlist and filters the response against it — left alone, the model invents "high risk of default" for customers who never took credit.

**Payment flow** (`app/api/bmoni/`): `create-payment` reads the trader's Nigerian deposit account and persists bank name + NUBAN + account name + a `TRACKO-XXXXXX` reference onto the order, so the details survive a refresh. `check-payment` reconciles via `lib/reconcile.ts`.

The deposit account BMONI exposes is **pooled** — every customer of every partner pays into the same NUBAN — so the account number identifies nothing and the *reference* does the work. Reconciliation matches on reference first, then amount within a time window, and returns **`ambiguous`** rather than guessing when two orders could claim the same credit. `reconciledTxId` stops one credit settling two orders. References use the **tail** of the cuid because the head is a timestamp and collides for orders created in the same second.

**Auth is a demo stand-in, not real auth.** `data/users.json` holds plaintext passwords; `app/api/auth/{login,signup}` read/write that file directly; `lib/auth.ts` stores the user in `localStorage`. `middleware.ts` is an empty passthrough — no route is actually protected. Don't assume a session exists server-side.

## Conventions

- API routes import lib with relative paths (`../../../lib/db`) even though the `@/*` alias exists. Both work; match the surrounding file.
- Dynamic route handlers take `params` as a `Promise` and must `await` it (see `app/api/orders/[id]/route.ts`) — this is the Next 16 signature.
- Tailwind v4 via `@tailwindcss/postcss`; no `tailwind.config` file — global styles and theme live in `app/globals.css`.
- Icons come from `@iconify/react` (`<Icon icon="solar:..." />`), not a local icon set.
- `.claude/`, `.agents/`, and `.windsurf/` are gitignored copies of the same vendored Prisma skill docs.

## Onboarding a trader (the BMONI chain)

`lib/bmoni-onboarding.ts` drives `create user → create wallet → KYC → activate NGN rail`,
in that order, because BMONI's calls fail when it is broken. Every step is idempotent —
re-running must not fork a trader's wallet history.

**The wallet is self-custodied and signed server-side.** BMONI documents owner-key signing
as a Flutter/React Native SDK with no web equivalent, which looks like it rules out a
browser product. It doesn't: the owner proof is a plain **EIP-191 `personal_sign`**, so
Tracko generates a secp256k1 keypair with `viem` and signs the challenge in a route
handler. Verified against the sandbox — see `demo-evidence/onboarding/`.

- Wallet **writes** take the stablecoin code (`CNGN`); reads report the fiat code (`NGN`).
- The owner private key is AES-256-GCM encrypted via `lib/crypto.ts` before it touches the
  database. Production belongs in a KMS — that migration is a change to `lib/crypto.ts`
  alone, which is why nothing else touches ciphertext.
- Passwords are scrypt with a per-user salt. The old `data/users.json` plaintext store is gone.
- KYC document review is Sumsub and it is real: synthetic images get
  `action_required / DOCUMENT_PAGE_MISSING`. Clearing it needs a genuine ID, which the
  hackathon rules forbid submitting, so `anchorStatus` stays `not_started` by design.

## Colour

`app/globals.css` registers the official palette with `@theme` (`teal`, `cyan`, `gold`,
`clay`, `paper`, `ink`…) plus **semantic tokens** — `surface`, `surface-2`, `line`, `text`,
`text-muted`, `background`. Use the semantic ones for anything that must flip with the
theme; they are redefined under `.dark`, so `bg-surface` needs no `dark:` variant. Reach
for a brand token (`bg-teal`, `text-gold`) only where the colour is deliberately fixed.

## BMONI sandbox reality

Verified against the live sandbox; see `demo-evidence/README.md` for the captured proof.

- The **real** OpenAPI spec is at `https://embedded-dev.bmoni.com/docs/openapi.json`. The `openapi.json` linked from the docs site is a Mintlify placeholder containing a `/plants` demo API.
- Wallet **reads** report the fiat code (`NGN`); wallet **writes** take the stablecoin code (`CNGN`). Match on `/^(C?NGN)$/i`.
- Transactions come back **flat** (`{transactions, page, total}`), not wrapped in `data` as the spec claims.
- `anchorStatus` is `not_started` and cannot be advanced: `POST /kyc/activate` requires a `sumsubLevelName`, and every level requires uploading identity documents, which this project deliberately does not collect. So there is **no dedicated virtual account** — only the pooled one.

Never append `/v1` to `BMONI_BASE_URL`; the endpoint paths already contain it.
