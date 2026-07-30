import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { initialStatus, statusAfterPayment } from "../../../lib/credit";

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, item, price, isCredit, dueDate, amountPaid } = body;

    if (!customerName || !customerPhone || !item || !price) {
      return NextResponse.json(
        { error: "Customer name, phone, item and price are all required." },
        { status: 400 }
      );
    }

    const parsedPrice = parseFloat(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({ error: "Price must be a number above zero." }, { status: 400 });
    }

    // A deposit taken at the point of sale.
    const deposit = Math.max(0, Math.min(parsedPrice, parseFloat(amountPaid) || 0));
    const credit = Boolean(isCredit);

    let due: Date | null = null;
    if (credit && dueDate) {
      const parsed = new Date(dueDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Due date is not a valid date." }, { status: 400 });
      }
      due = parsed;
    }

    const base = { price: parsedPrice, status: initialStatus(credit) };

    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        item,
        price: parsedPrice,
        isCredit: credit,
        dueDate: due,
        amountPaid: deposit,
        status: deposit > 0 ? statusAfterPayment(base, deposit) : base.status,
        paidAt: deposit >= parsedPrice ? new Date() : null,
      },
    });

    return NextResponse.json(order);
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json({ error: "Could not save the order. Try again." }, { status: 500 });
  }
}