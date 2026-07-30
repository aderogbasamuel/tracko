import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { generateInsightsSummary } from "../../../../lib/ai";
import { getTraderBalances } from "../../../../lib/bmoni";

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  if (orders.length === 0) {
    return NextResponse.json({
      summary: "No orders yet — add your first order to see insights here.",
    });
  }

  try {
    let walletBalance: number | undefined;
    try {
            const res = await fetch("/api/bmoni/balance");
      if (!res.ok) throw new Error("Failed to fetch balance");
      const data = await res.json();
      // Adjust this line once you see the real response shape from BMONI —
      // placeholder assumes a `balances` array with a currency + amount field
      const ngnBalance = data.balances?.find((b: any) => b.currency === "CNGN" || b.currency === "NGN");
      walletBalance = ngnBalance?.balance;
    } catch {
      walletBalance = 1000; // don't fail insights if balance fetch fails
    }

    const summary = await generateInsightsSummary(orders, walletBalance);
    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}