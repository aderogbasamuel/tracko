import { referenceMatches } from "./reference";
import type { BmoniTransaction } from "./bmoni";

/**
 * Matches BMONI credits to orders.
 *
 * The deposit account BMONI gives us is POOLED — every customer of every partner
 * pays into the same NUBAN — so the account number identifies nothing. Matching
 * therefore leans on the per-order reference first, and falls back to amount
 * within a time window.
 *
 * Amount-only matching is genuinely ambiguous when two orders cost the same, so
 * this returns "ambiguous" and asks the trader rather than guessing. Silently
 * marking the wrong order paid is worse than asking.
 */

export interface ReconcileCandidate {
  id: string;
  price: number;
  amountPaid: number;
  paymentRef?: string | null;
  vaRequestedAt?: string | Date | null;
}

export type ReconcileResult =
  | { outcome: "matched"; transaction: BmoniTransaction; via: "reference" | "amount" }
  | { outcome: "ambiguous"; transactions: BmoniTransaction[]; reason: string }
  | { outcome: "none" };

/** How far back an amount-only match may reach when no reference is quoted. */
const AMOUNT_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

function txAmount(tx: BmoniTransaction): number | null {
  const value = Number(tx.amount);
  return Number.isFinite(value) ? value : null;
}

function txTime(tx: BmoniTransaction): number | null {
  if (!tx.createdAt) return null;
  const t = new Date(tx.createdAt).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Outgoing money can never settle an incoming debt. */
function isIncomingSuccess(tx: BmoniTransaction): boolean {
  const status = (tx.status ?? "").toUpperCase();
  const settled = status === "" || ["SUCCESS", "COMPLETED", "COMPLETE", "CONFIRMED"].includes(status);
  const type = (tx.type ?? "").toUpperCase();
  const outgoing = ["WITHDRAWAL", "OFFRAMP", "DEBIT", "SEND", "PAYOUT"].some((t) =>
    type.includes(t)
  );
  return settled && !outgoing;
}

export function reconcileOrder(
  order: ReconcileCandidate,
  transactions: BmoniTransaction[],
  options: { consumedTxIds?: Set<string>; otherOpenOrders?: ReconcileCandidate[]; now?: Date } = {}
): ReconcileResult {
  const { consumedTxIds = new Set(), otherOpenOrders = [], now = new Date() } = options;

  const outstanding = Math.max(0, order.price - (order.amountPaid ?? 0));
  if (outstanding === 0) return { outcome: "none" };

  const usable = transactions.filter((tx) => tx.id && !consumedTxIds.has(tx.id) && isIncomingSuccess(tx));

  // 1. Reference match — unambiguous by construction, so amount need not agree
  //    exactly (a customer may round up, or pay in two instalments).
  if (order.paymentRef) {
    const byReference = usable.filter((tx) =>
      referenceMatches(order.paymentRef!, tx.description, tx.id)
    );
    if (byReference.length === 1) {
      return { outcome: "matched", transaction: byReference[0], via: "reference" };
    }
    if (byReference.length > 1) {
      return {
        outcome: "ambiguous",
        transactions: byReference,
        reason: `${byReference.length} payments quote reference ${order.paymentRef}. Confirm which one belongs to this order.`,
      };
    }
  }

  // 2. Amount match inside the window opened when the trader requested payment.
  const since = order.vaRequestedAt
    ? new Date(order.vaRequestedAt).getTime()
    : now.getTime() - AMOUNT_WINDOW_MS;

  const byAmount = usable.filter((tx) => {
    const amount = txAmount(tx);
    if (amount === null || Math.abs(amount - outstanding) > 0.01) return false;
    const time = txTime(tx);
    return time === null || time >= since;
  });

  if (byAmount.length === 0) return { outcome: "none" };

  // A same-priced order awaiting payment makes an amount-only match a coin flip.
  const competing = otherOpenOrders.filter(
    (o) => o.id !== order.id && Math.max(0, o.price - (o.amountPaid ?? 0)) === outstanding
  );

  if (byAmount.length > 1 || competing.length > 0) {
    return {
      outcome: "ambiguous",
      transactions: byAmount,
      reason:
        competing.length > 0
          ? `A payment of ₦${outstanding.toLocaleString()} arrived, but ${competing.length} other unpaid order${competing.length === 1 ? " is" : "s are"} for the same amount. Confirm this one is the right match.`
          : `${byAmount.length} payments of ₦${outstanding.toLocaleString()} arrived. Confirm which belongs to this order.`,
    };
  }

  return { outcome: "matched", transaction: byAmount[0], via: "amount" };
}
