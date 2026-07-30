import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
interface PageProps {
  params: Promise<{ id: string }>; // Typed as a Promise
}
export async function GET(
  req: NextRequest,
  { params }: PageProps,
) {
    const {id}= await params;
    console.log("Fetching order with ID:", id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  console.log("Fetched order:", order);
  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: PageProps
) {
    const {id}= await params;
    // console.log("Fetching order with ID:", id);
  const body = await req.json();
  const order = await prisma.order.update({
    where: { id: id },
    data: body, // e.g. { status: "DELIVERED", deliveredAt: new Date().toISOString() }
  });
  return NextResponse.json(order);
}