import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { findMatchingPayment } from "../../../../lib/bmoni";

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

    if (order.status !== "PENDING") {
      return NextResponse.json({ paid: order.status === "PAID" || order.status === "DELIVERED", order });
    }

    const match = await findMatchingPayment(order.price);

    if (match) {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID", paidAt: new Date().toISOString() },
      });
      return NextResponse.json({ paid: true, order: updated });
    }

    return NextResponse.json({ paid: false });
  } catch (err: any) {
    console.error("check-payment error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}