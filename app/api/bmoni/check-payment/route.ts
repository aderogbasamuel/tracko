export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getTraderTransactions, BmoniError } from "../../../../lib/bmoni";
import { reconcileOrder } from "../../../../lib/reconcile";
import { recordPayment } from "../../../../lib/payments";
import { isSettled, type CreditOrder } from "../../../../lib/credit";

/**
 * Checks real BMONI transaction data for a credit belonging to this order.
 * Polled by the client every few seconds after a payment request is issued.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (isSettled(order as unknown as CreditOrder)) {
      return NextResponse.json({ paid: true, order, alreadySettled: true });
    }

    const transactions = await getTraderTransactions();

    // Credits already claimed by another order are off the table, and other
    // unpaid orders are needed to spot a same-amount collision.
    // Explicitly typed because lib/db.ts casts PrismaClient through `any`,
    // so query results arrive untyped.
    const others: {
      id: string;
      price: number;
      amountPaid: number;
      paymentRef: string | null;
      reconciledTxId: string | null;
    }[] = await prisma.order.findMany({
      where: { id: { not: orderId } },
      select: { id: true, price: true, amountPaid: true, paymentRef: true, reconciledTxId: true },
    });

    const consumedTxIds = new Set(
      others.map((o) => o.reconciledTxId).filter((id): id is string => Boolean(id))
    );
    const otherOpenOrders = others.filter((o) => o.price - o.amountPaid > 0);

    const result = reconcileOrder(order, transactions, { consumedTxIds, otherOpenOrders });

    if (result.outcome === "matched") {
      const amount = Number(result.transaction.amount) || order.price - order.amountPaid;
      const updated = await recordPayment(orderId, amount, {
        source: "bmoni",
        reference: order.paymentRef ?? undefined,
      });
      await prisma.order.update({
        where: { id: orderId },
        data: { reconciledTxId: result.transaction.id },
      });
      return NextResponse.json({ paid: true, order: updated, matchedVia: result.via });
    }

    if (result.outcome === "ambiguous") {
      return NextResponse.json({
        paid: false,
        ambiguous: true,
        message: result.reason,
        transactions: result.transactions.map((t) => ({
          id: t.id,
          amount: t.amount,
          createdAt: t.createdAt,
          description: t.description,
        })),
      });
    }

    return NextResponse.json({ paid: false, checkedTransactions: transactions.length });
  } catch (err) {
    if (err instanceof BmoniError) {
      console.error("check-payment BMONI error:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("check-payment error:", err);
    return NextResponse.json({ error: "Could not check for payment." }, { status: 500 });
  }
}

