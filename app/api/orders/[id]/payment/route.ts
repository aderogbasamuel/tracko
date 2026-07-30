import { NextRequest, NextResponse } from "next/server";
import { recordPayment } from "../../../../../lib/payments";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Records cash the trader collected in person, including part payments. */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    const { amount } = await req.json();
    const order = await recordPayment(id, parseFloat(amount), { source: "cash" });
    return NextResponse.json(order);
  } catch (err: any) {
    const message = err?.message ?? "Could not record the payment.";
    const status = message === "Order not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
