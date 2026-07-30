import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { generateFollowUpMessage } from "../../../../lib/ai";

export async function POST(req: NextRequest) {
  const { orderId, type } = await req.json();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const message = await generateFollowUpMessage({
      customerName: order.customerName,
      item: order.item,
      type,
    });
    return NextResponse.json({ message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}