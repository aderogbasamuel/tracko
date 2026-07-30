import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/db";



export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, customerPhone, item, price } = body;

  if (!customerName || !customerPhone || !item || !price) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const order = await prisma.order.create({
    data: {
      customerName,
      customerPhone,
      item,
      price: parseFloat(price),
      status: "PENDING",
    },
  });

  return NextResponse.json(order);
}