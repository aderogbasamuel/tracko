import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getNgnDepositAccount, BmoniError } from "../../../../lib/bmoni";
import { paymentReference } from "../../../../lib/reference";

/**
 * Issues the bank details a Nigerian customer can actually pay into: bank name,
 * 10-digit NUBAN, account name, amount and a per-order reference.
 *
 * The account BMONI exposes on this key is pooled across partners, so the
 * reference — not the account number — is what ties a credit to this order.
 * Details are persisted on the order so a refresh doesn't lose them.
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

    const reference = order.paymentRef ?? paymentReference(order.id);
    const account = await getNgnDepositAccount();

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentRef: reference,
        vaBankName: account.bankName,
        vaAccountNumber: account.accountNumber,
        vaAccountName: account.accountName,
        vaIsPooled: account.pooled,
        vaRequestedAt: order.vaRequestedAt ?? new Date(),
      },
    });

    return NextResponse.json({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      pooled: account.pooled,
      reference,
      amount: Math.max(0, order.price - order.amountPaid),
      requestedAt: updated.vaRequestedAt,
    });
  } catch (err) {
    if (err instanceof BmoniError) {
      console.error("create-payment BMONI error:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("create-payment error:", err);
    return NextResponse.json(
      { error: "Could not create the payment request. Try again." },
      { status: 500 }
    );
  }
}
