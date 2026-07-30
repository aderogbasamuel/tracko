export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../../lib/db";
import { isSettled, type CreditOrder } from "../../../../lib/credit";
interface PageProps {
    params: Promise<{ id: string }>; // Typed as a Promise
}
export async function GET(
    req: NextRequest,
    { params }: PageProps,
) {
    const { id } = await params;
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
    const { id } = await params;

    try {
        const body = await req.json();

        const existing = await prisma.order.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Whitelisted so a caller cannot rewrite price or amountPaid through here —
        // money only moves via /api/orders/[id]/payment and the BMONI reconciler.
        const data: Record<string, unknown> = {};

        if (body.status === "DELIVERED") {
            if (!isSettled(existing as unknown as CreditOrder)) {
                return NextResponse.json(
                    { error: "This order still has a balance outstanding — settle it before marking delivered." },
                    { status: 400 }
                );
            }
            data.status = "DELIVERED";
            data.deliveredAt = new Date();
        }

        if (body.dueDate !== undefined) {
            const due = body.dueDate ? new Date(body.dueDate) : null;
            if (due && Number.isNaN(due.getTime())) {
                return NextResponse.json({ error: "Due date is not a valid date." }, { status: 400 });
            }
            data.dueDate = due;
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
        }

        const order = await prisma.order.update({ where: { id }, data });
        return NextResponse.json(order);
    } catch (err) {
        console.error("Update order error:", err);
        return NextResponse.json({ error: "Could not update the order." }, { status: 500 });
    }
}