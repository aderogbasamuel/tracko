/**
 * WhatsApp deep links.
 *
 * Built in the browser from the stored phone number. The number is never sent
 * to the AI model — the model writes the words, the client attaches the
 * recipient. Keeping those two steps apart is what makes the privacy claim true.
 */

/**
 * wa.me needs a bare international number: no +, no spaces, no leading zero.
 * Nigerian numbers are commonly stored as 0803…, +234803… or 234803…, so all
 * three normalise to the same 234803… form.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  // Local format: 0803… -> 234803…
  if (digits.startsWith("0")) digits = `234${digits.slice(1)}`;
  // Bare local without the trunk zero: 803… -> 234803…
  else if (digits.length === 10) digits = `234${digits}`;

  // Shortest plausible international number is 8 digits; longest is 15 (E.164).
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function whatsAppLink(phone: string | null | undefined, message: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
