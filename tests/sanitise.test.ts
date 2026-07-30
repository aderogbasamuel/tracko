import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitiseForAI, assertSafeForAI, scrubText, firstNameOnly } from "../lib/sanitise";

// A realistic order, carrying every kind of identifier the app handles.
const ORDER = {
  id: "cms7tb66u0000qbsxzm34aq6g",
  orderId: "cms7tb66u0000qbsxzm34aq6g",
  customerName: "Chidi Okafor",
  customerPhone: "+2348031234567",
  email: "chidi@example.com",
  item: "2 yards Ankara fabric",
  price: 8000,
  amountPaid: 3000,
  status: "PARTIALLY_PAID",
  paymentRef: "TRACKO-34AQ6G",
  vaAccountNumber: "6177463833",
  vaAccountName: "Bkey Limited",
  walletAddress: "0xD2c817a09130c8b596B05adE3DC276C6C9c89fC4",
  bvn: "22222222222",
  smartWalletId: "d5486925-8481-4164-8aff-951407c48047",
  createdAt: new Date("2026-07-30T12:00:00Z"),
};

test("every identifying field is stripped from an order", () => {
  const safe = sanitiseForAI(ORDER) as Record<string, unknown>;

  for (const key of [
    "id",
    "orderId",
    "customerPhone",
    "email",
    "paymentRef",
    "vaAccountNumber",
    "vaAccountName",
    "walletAddress",
    "bvn",
    "smartWalletId",
  ]) {
    assert.equal(safe[key], undefined, `${key} should have been stripped`);
  }
});

test("business facts the AI actually needs are preserved", () => {
  const safe = sanitiseForAI(ORDER) as Record<string, unknown>;
  assert.equal(safe.price, 8000);
  assert.equal(safe.amountPaid, 3000);
  assert.equal(safe.status, "PARTIALLY_PAID");
  assert.equal(safe.item, "2 yards Ankara fabric");
  assert.equal(safe.createdAt, "2026-07-30");
});

test("names are reduced to a first name", () => {
  const safe = sanitiseForAI(ORDER) as Record<string, unknown>;
  assert.equal(safe.customerName, "Chidi");
  assert.equal(firstNameOnly("Samuel Adeolu Aderogba"), "Samuel");
  assert.equal(firstNameOnly(null), "");
});

test("identifiers hidden inside free text are scrubbed", () => {
  // The failure mode key-dropping alone cannot catch.
  const safe = sanitiseForAI({
    item: "Wig — call 08031234567 or mail ada@shop.ng",
    note: "send to 0xD2c817a09130c8b596B05adE3DC276C6C9c89fC4",
  }) as Record<string, string>;

  assert.ok(!/08031234567/.test(safe.item));
  assert.ok(!/ada@shop\.ng/.test(safe.item));
  assert.ok(!/0xD2c817/.test(safe.note));
});

test("nested and array payloads are sanitised all the way down", () => {
  const safe = sanitiseForAI({
    customers: [{ customerName: "Ada Obi", customerPhone: "+2348031234567", outstanding: 5000 }],
    wallet: { walletAddress: "0xabc123def456", balance: 10000 },
  }) as any;

  assert.equal(safe.customers[0].customerName, "Ada");
  assert.equal(safe.customers[0].customerPhone, undefined);
  assert.equal(safe.customers[0].outstanding, 5000);
  assert.equal(safe.wallet.walletAddress, undefined);
  assert.equal(safe.wallet.balance, 10000);
});

test("a newly added identifying field is excluded by default", () => {
  // Guards against the model growing a field nobody remembers to sanitise.
  const safe = sanitiseForAI({
    nextOfKinPhone: "+2348031234567",
    guarantorAccountNumber: "0123456789",
    supplierId: "sup_123",
    profit: 2500,
  }) as Record<string, unknown>;

  assert.equal(safe.nextOfKinPhone, undefined);
  assert.equal(safe.guarantorAccountNumber, undefined);
  assert.equal(safe.supplierId, undefined);
  assert.equal(safe.profit, 2500);
});

test("sanitised output passes the pre-send assertion", () => {
  assert.doesNotThrow(() => assertSafeForAI(sanitiseForAI(ORDER)));
});

test("the assertion catches a leak that bypassed the sanitiser", () => {
  assert.throws(() => assertSafeForAI({ note: "pay 6177463833" }), /account or phone number/);
  assert.throws(() => assertSafeForAI({ note: "mail me at a@b.co" }), /email address/);
  assert.throws(() => assertSafeForAI({ w: "0xD2c817a09130c8b5" }), /wallet address/);
});

test("scrubbing leaves ordinary prices and quantities alone", () => {
  // Over-scrubbing would make the insights useless.
  assert.equal(scrubText("sold 3 wigs for 25000 naira"), "sold 3 wigs for 25000 naira");
});
