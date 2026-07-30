import { test } from "node:test";
import assert from "node:assert/strict";
import { composeDailySummary } from "../lib/summary";
import type { CreditOrder } from "../lib/credit";

const NOW = new Date("2026-07-30T18:00:00Z");
const day = (d: string) => new Date(d).toISOString();

function order(overrides: Partial<CreditOrder> = {}): CreditOrder {
  return {
    id: "o1",
    customerName: "Ada Obi",
    customerPhone: "+2348031234567",
    item: "Wig",
    price: 10000,
    status: "CREDIT",
    isCredit: true,
    amountPaid: 0,
    createdAt: day("2026-07-30T09:00:00Z"),
    ...overrides,
  };
}

test("today's sales and receipts are counted, older ones are not", () => {
  const text = composeDailySummary(
    [
      order({ id: "a", price: 5000 }),
      order({ id: "b", price: 3000 }),
      order({ id: "c", price: 90000, createdAt: day("2026-07-01T09:00:00Z") }),
    ],
    10000,
    NOW
  );
  assert.match(text, /Sales today: 2 orders, ₦8,000/);
});

test("overdue debts are listed worst-first and capped at five", () => {
  const orders = [
    order({ id: "a", customerName: "Late Larry", dueDate: day("2026-07-20T00:00:00Z") }),
    order({ id: "b", customerName: "Later Lucy", dueDate: day("2026-07-10T00:00:00Z") }),
  ];
  const text = composeDailySummary(orders, 500, NOW);
  assert.match(text, /Overdue \(2\)/);
  assert.ok(text.indexOf("Later Lucy") < text.indexOf("Late Larry"), "worst offender first");
});

test("debts falling due tomorrow get their own section", () => {
  const text = composeDailySummary(
    [order({ customerName: "Tomorrow Tunde", dueDate: day("2026-07-31T18:00:00Z") })],
    1000,
    NOW
  );
  assert.match(text, /Due tomorrow:/);
  assert.match(text, /Tomorrow Tunde/);
});

test("clean books say so rather than printing empty sections", () => {
  const text = composeDailySummary(
    [order({ amountPaid: 10000, status: "PAID", paidAt: day("2026-07-30T10:00:00Z") })],
    10000,
    NOW
  );
  assert.match(text, /Nothing outstanding/);
  assert.doesNotMatch(text, /Overdue/);
});

test("a missing wallet balance omits the line instead of printing null", () => {
  const text = composeDailySummary([order()], null, NOW);
  assert.doesNotMatch(text, /BMONI wallet/);
  assert.doesNotMatch(text, /null/);
});
