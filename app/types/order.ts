import type { CreditOrder, OrderStatus, DisplayStatus } from "@/lib/credit";

export type { OrderStatus, DisplayStatus };

/**
 * An order as it arrives over the wire (dates are ISO strings after JSON).
 * Structurally compatible with CreditOrder, so every helper in lib/credit.ts
 * works on it directly.
 */
export interface Order extends CreditOrder {
  createdAt: string;
  dueDate?: string | null;
  paidAt?: string | null;
  deliveredAt?: string | null;
  paymentRef?: string | null;

  // Bank details issued for this order, persisted so they survive a refresh.
  vaBankName?: string | null;
  vaAccountNumber?: string | null;
  vaAccountName?: string | null;
  vaIsPooled?: boolean | null;
  vaRequestedAt?: string | null;
  reconciledTxId?: string | null;
}
