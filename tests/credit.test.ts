import { test } from "node:test";
import assert from "node:assert/strict";
import {
  amountOutstanding,
  buildCreditBook,
  daysLate,
  displayStatus,
  isSettled,
  statusAfterPayment,
  customerCreditHistory,
  type CreditOrder,
} from "../lib/credit";

const NOW = new Date("2026-07-30T12:00:00Z");

function order(overrides: Partial<CreditOrder> = {}): CreditOrder {
  return {
    id: "o1",
    customerName: "Ada",
    customerPhone: "+2348000000000",
    item: "Wig - closure style",
    price: 10000,
    status: "CREDIT",
    isCredit: true,
    amountPaid: 0,
    createdAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

test("a delivered order with money still owed is not settled", () => {
  // The original bug: `status !== "PENDING"` treated DELIVERED as paid.
  assert.equal(isSettled(order({ status: "DELIVERED", amountPaid: 0 })), false);
  assert.equal(isSettled(order({ status: "DELIVERED", amountPaid: 10000 })), true);
});

test("outstanding is price minus paid, and never negative", () => {
  assert.equal(amountOutstanding(order({ amountPaid: 4000 })), 6000);
  assert.equal(amountOutstanding(order({ amountPaid: 99999 })), 0);
});

test("lateness is counted in whole days past the due date", () => {
  assert.equal(daysLate(order({ dueDate: "2026-07-20T12:00:00Z" }), NOW), 10);
  assert.equal(daysLate(order({ dueDate: "2026-08-20T12:00:00Z" }), NOW), 0);
});

test("a settled debt is never overdue, however old", () => {
  const paid = order({ dueDate: "2026-07-20T12:00:00Z", amountPaid: 10000 });
  assert.equal(daysLate(paid, NOW), 0);
  assert.equal(displayStatus(paid, NOW), "CREDIT");
  assert.equal(displayStatus(order({ dueDate: "2026-07-20T12:00:00Z" }), NOW), "OVERDUE");
});

test("delivered is terminal — a late payment cannot walk the status backwards", () => {
  assert.equal(statusAfterPayment({ price: 10000, status: "DELIVERED" }, 10000), "DELIVERED");
  assert.equal(statusAfterPayment({ price: 10000, status: "CREDIT" }, 4000), "PARTIALLY_PAID");
  assert.equal(statusAfterPayment({ price: 10000, status: "CREDIT" }, 10000), "PAID");
});

test("credit book totals only unsettled money and sorts overdue worst-first", () => {
  const book = buildCreditBook(
    [
      order({ id: "a", dueDate: "2026-07-25T12:00:00Z" }), // 5 days late
      order({ id: "b", dueDate: "2026-07-10T12:00:00Z" }), // 20 days late
      order({ id: "c", amountPaid: 10000 }), // settled, excluded
      order({ id: "d", dueDate: "2026-08-02T12:00:00Z" }), // due in 3 days
    ],
    NOW
  );

  assert.equal(book.totalOutstanding, 30000);
  assert.deepEqual(book.overdue.map((o) => o.id), ["b", "a"]);
  assert.deepEqual(book.dueThisWeek.map((o) => o.id), ["d"]);
  // Overdue money is money you should already have, so it counts toward the week.
  assert.equal(book.expectedThisWeek, 30000);
});

test("one late payment does not make a customer risky; a pattern does", () => {
  const once = customerCreditHistory(
    [
      order({ id: "a", dueDate: "2026-07-01T00:00:00Z", paidAt: "2026-07-05T00:00:00Z", amountPaid: 10000 }),
      order({ id: "b", dueDate: "2026-07-01T00:00:00Z", paidAt: "2026-06-30T00:00:00Z", amountPaid: 10000 }),
    ],
    NOW
  );
  assert.equal(once[0].timesPaidLate, 1);
  assert.equal(once[0].isRisky, false);

  const habitual = customerCreditHistory(
    [
      order({ id: "a", dueDate: "2026-07-01T00:00:00Z", paidAt: "2026-07-09T00:00:00Z", amountPaid: 10000 }),
      order({ id: "b", dueDate: "2026-06-01T00:00:00Z", paidAt: "2026-06-15T00:00:00Z", amountPaid: 10000 }),
    ],
    NOW
  );
  assert.equal(habitual[0].timesPaidLate, 2);
  assert.equal(habitual[0].isRisky, true);
  assert.equal(habitual[0].worstDaysLate, 14);
});

test("customers are grouped case-insensitively by name", () => {
  const history = customerCreditHistory(
    [order({ customerName: "Ada Obi" }), order({ customerName: "ada obi", amountPaid: 2000 })],
    NOW
  );
  assert.equal(history.length, 1);
  assert.equal(history[0].outstanding, 18000);
});
