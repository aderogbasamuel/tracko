import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileOrder, type ReconcileCandidate } from "../lib/reconcile";
import { paymentReference, referenceMatches } from "../lib/reference";

const NOW = new Date("2026-07-30T12:00:00Z");

function order(overrides: Partial<ReconcileCandidate> = {}): ReconcileCandidate {
  return {
    id: "order-1",
    price: 8000,
    amountPaid: 0,
    paymentRef: "TRACKO-ABC123",
    vaRequestedAt: "2026-07-30T10:00:00Z",
    ...overrides,
  };
}

const tx = (o: any) => ({
  id: "tx1",
  status: "SUCCESS",
  amount: "8000",
  currency: "CNGN",
  createdAt: "2026-07-30T11:00:00Z",
  ...o,
});

test("a quoted reference matches even when the amount differs", () => {
  const result = reconcileOrder(
    order(),
    [tx({ amount: "8500", description: "Transfer TRACKO-ABC123 from Ada" })],
    { now: NOW }
  );
  assert.equal(result.outcome, "matched");
  assert.equal(result.outcome === "matched" && result.via, "reference");
});

test("amount alone matches when nothing else competes", () => {
  const result = reconcileOrder(order(), [tx({ description: "Bank transfer" })], { now: NOW });
  assert.equal(result.outcome, "matched");
  assert.equal(result.outcome === "matched" && result.via, "amount");
});

test("a same-priced open order makes an amount match ambiguous, not paid", () => {
  // The pooled-account failure mode: two customers owe 8000, one credit arrives.
  const result = reconcileOrder(order(), [tx({ description: "Bank transfer" })], {
    otherOpenOrders: [order({ id: "order-2", paymentRef: "TRACKO-ZZZ999" })],
    now: NOW,
  });
  assert.equal(result.outcome, "ambiguous");
});

test("two identical credits are ambiguous rather than first-wins", () => {
  const result = reconcileOrder(
    order(),
    [tx({ id: "tx1" }), tx({ id: "tx2", createdAt: "2026-07-30T11:30:00Z" })],
    { now: NOW }
  );
  assert.equal(result.outcome, "ambiguous");
});

test("a credit already claimed by another order is not reused", () => {
  const result = reconcileOrder(order(), [tx({ description: "Bank transfer" })], {
    consumedTxIds: new Set(["tx1"]),
    now: NOW,
  });
  assert.equal(result.outcome, "none");
});

test("outgoing and unsettled transactions never settle a debt", () => {
  assert.equal(
    reconcileOrder(order(), [tx({ type: "WITHDRAWAL" })], { now: NOW }).outcome,
    "none"
  );
  assert.equal(
    reconcileOrder(order(), [tx({ status: "PENDING" })], { now: NOW }).outcome,
    "none"
  );
});

test("credits older than the payment request are ignored", () => {
  // Money that arrived before the trader asked cannot be for this request.
  const result = reconcileOrder(order(), [tx({ createdAt: "2026-07-29T09:00:00Z" })], {
    now: NOW,
  });
  assert.equal(result.outcome, "none");
});

test("a part-paid order matches on the remaining balance, not the full price", () => {
  const result = reconcileOrder(order({ amountPaid: 3000 }), [tx({ amount: "5000" })], {
    now: NOW,
  });
  assert.equal(result.outcome, "matched");
});

test("references come from the random tail of the id, not the timestamp head", () => {
  // Two cuids created in the same millisecond share a prefix but not a suffix.
  const a = paymentReference("cm4x9k2p0000abcdef111111");
  const b = paymentReference("cm4x9k2p0000abcdef222222");
  assert.notEqual(a, b);
  assert.ok(referenceMatches(a, "payment ref tracko111111 thanks"));
  assert.equal(referenceMatches(a, "unrelated transfer"), false);
});
