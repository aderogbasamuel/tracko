import { prisma } from "./db";
import { statusAfterPayment, type CreditOrder } from "./credit";

export type PaymentSource = "cash" | "bmoni";

/**
 * Records money received against an order and moves its status accordingly.
 * Both the manual "customer paid me cash" button and the BMONI reconciliation
 * poller go through here, so a part payment behaves identically either way.
 */
export async function recordPayment(
  orderId: string,
  amount: number,
  opts: { source: PaymentSource; reference?: string }
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be a number above zero.");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  // Never bank more than the order is worth — an overpayment is a conversation
  // to have with the customer, not a negative balance in the credit book.
  const totalPaid = Math.min(order.price, (order.amountPaid ?? 0) + amount);
  const status = statusAfterPayment(order as unknown as CreditOrder, totalPaid);
  const settled = totalPaid >= order.price;

  return prisma.order.update({
    where: { id: orderId },
    data: {
      amountPaid: totalPaid,
      status,
      // Keep the first settlement timestamp; lateness is judged against it.
      paidAt: settled ? (order.paidAt ?? new Date()) : null,
      ...(opts.reference ? { paymentRef: opts.reference } : {}),
    },
  });
}
