export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { composeDailySummary } from "../../../../lib/summary";
import { getNgnBalance, getTraderProfile } from "../../../../lib/bmoni";
import type { CreditOrder } from "../../../../lib/credit";

/**
 * Composes the trader's end-of-day summary.
 *
 * Returns the message plus the trader's own number so the client can open it in
 * WhatsApp. A scheduled job would call composeDailySummary() the same way — the
 * only difference is who triggers it.
 */
export async function GET() {
  try {
    const orders = (await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    })) as unknown as CreditOrder[];

    // Neither of these should be able to stop the summary being produced.
    const [balance, profile] = await Promise.all([
      getNgnBalance().catch(() => null),
      getTraderProfile().catch(() => null),
    ]);

    return NextResponse.json({
      message: composeDailySummary(orders, balance),
      // The trader's own number, shown back to the trader.
      phone: profile?.phoneNumber ?? null,
    });
  } catch (err) {
    console.error("daily summary error:", err);
    return NextResponse.json({ error: "Could not build today's summary." }, { status: 500 });
  }
}

