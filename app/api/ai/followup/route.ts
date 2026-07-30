import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { generateFollowUpMessage, AiError, type FollowUpType } from "../../../../lib/ai";
import { amountOutstanding, daysLate, type CreditOrder } from "../../../../lib/credit";

const VALID: FollowUpType[] = ["PAYMENT_REMINDER", "DELIVERY_UPDATE", "RESTOCK_NUDGE"];

export async function POST(req: NextRequest) {
  try {
    const { orderId, type } = await req.json();

    if (!VALID.includes(type)) {
      return NextResponse.json({ error: "Unknown message type." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // The customer's phone is deliberately not passed on — the WhatsApp link is
    // built in the browser, so the number never reaches the model.
    const message = await generateFollowUpMessage({
      customerName: order.customerName,
      item: order.item,
      type,
      daysLate: daysLate(order as unknown as CreditOrder),
      outstanding: amountOutstanding(order as unknown as CreditOrder),
    });

    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("followup error:", err);
    return NextResponse.json({ error: "Could not draft the message." }, { status: 500 });
  }
}
