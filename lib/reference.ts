/**
 * Payment reference shown to the customer and matched against BMONI credits.
 *
 * Takes the TAIL of the cuid, not the head: a cuid begins with a timestamp, so
 * orders created in the same second share their leading characters and would
 * produce colliding references. The trailing block is the random one.
 */
export function paymentReference(orderId: string): string {
  return `TRACKO-${orderId.slice(-6).toUpperCase()}`;
}

/** True when a BMONI transaction's text carries this order's reference. */
export function referenceMatches(reference: string, ...fields: (string | null | undefined)[]) {
  const needle = reference.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return fields.some((field) => {
    if (!field) return false;
    return field.replace(/[^A-Z0-9]/gi, "").toUpperCase().includes(needle);
  });
}
