import { test } from "node:test";
import assert from "node:assert/strict";
import { toWhatsAppNumber, whatsAppLink } from "../lib/whatsapp";

test("the three ways Nigerian numbers get stored all normalise the same", () => {
  assert.equal(toWhatsAppNumber("08031234567"), "2348031234567");
  assert.equal(toWhatsAppNumber("+234 803 123 4567"), "2348031234567");
  assert.equal(toWhatsAppNumber("234-803-123-4567"), "2348031234567");
  assert.equal(toWhatsAppNumber("8031234567"), "2348031234567");
});

test("unusable numbers return null rather than a broken link", () => {
  assert.equal(toWhatsAppNumber(""), null);
  assert.equal(toWhatsAppNumber(null), null);
  assert.equal(toWhatsAppNumber("12345"), null);
  assert.equal(toWhatsAppNumber("not a phone"), null);
});

test("the message is url-encoded into the link", () => {
  const link = whatsAppLink("08031234567", "Hi Ada, your ₦8,000 balance is due — thanks!");
  assert.ok(link?.startsWith("https://wa.me/2348031234567?text="));
  assert.ok(!link?.includes(" "));
  assert.ok(link?.includes(encodeURIComponent("₦8,000")));
});
