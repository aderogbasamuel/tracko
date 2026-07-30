export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { buildNotifications } from "../../../lib/notifications";
import type { CreditOrder } from "../../../lib/credit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orders = (await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    })) as unknown as CreditOrder[];

    return NextResponse.json({ notifications: buildNotifications(orders) });
  } catch (err) {
    console.error("notifications error:", err);
    return NextResponse.json({ error: "Could not load your alerts." }, { status: 500 });
  }
}

