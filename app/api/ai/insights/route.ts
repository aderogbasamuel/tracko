import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { generateInsights, AiError, type InsightsInput } from "../../../../lib/ai";
import { getNgnBalance } from "../../../../lib/bmoni";
import { buildCreditBook, amountOutstanding, daysLate, daysUntilDue, isSettled, type CreditOrder } from "../../../../lib/credit";
import { firstNameOnly } from "../../../../lib/sanitise";

export async function GET() {
  try {
    const orders = (await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    })) as unknown as CreditOrder[];

    if (orders.length === 0) {
      return NextResponse.json({
        insights: {
          headline: "No orders yet — add your first order to see what to do next.",
          cashFlow: "",
          risks: [],
          actions: [],
        },
      });
    }

    const now = new Date();
    const book = buildCreditBook(orders, now);

    // The balance is called directly rather than fetched from our own /api route
    // — a relative fetch from server code always throws, which is why this used
    // to silently fall back to a hardcoded figure.
    let walletBalance: number | null = null;
    try {
      walletBalance = await getNgnBalance();
    } catch (err) {
      console.error("insights: balance unavailable", err);
    }

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const recent = orders.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);

    const input: InsightsInput = {
      walletBalance,
      totalOutstanding: book.totalOutstanding,
      expectedThisWeek: book.expectedThisWeek,
      overdue: book.overdue.slice(0, 8).map((o) => ({
        name: firstNameOnly(o.customerName),
        item: o.item,
        owed: amountOutstanding(o),
        daysLate: daysLate(o, now),
      })),
      dueSoon: book.dueThisWeek.slice(0, 8).map((o) => ({
        name: firstNameOnly(o.customerName),
        item: o.item,
        owed: amountOutstanding(o),
        daysUntilDue: daysUntilDue(o, now) ?? 0,
      })),
      // Only customers with an actual credit history — sending the rest invites
      // the model to invent a risk narrative from a plain unpaid balance.
      customers: book.customers
        .filter((c) => c.timesTookCredit > 0)
        .slice(0, 10)
        .map((c) => ({
          name: firstNameOnly(c.customerName),
          creditSales: c.timesTookCredit,
          timesPaidLate: c.timesPaidLate,
          timesOverdueNow: c.timesCurrentlyOverdue,
          outstanding: c.outstanding,
          worstDaysLate: c.worstDaysLate,
        })),
      riskyCustomers: book.customers
        .filter((c) => c.isRisky)
        .map((c) => firstNameOnly(c.customerName)),
      salesLast30Days: recent.length,
      revenueCollected: Math.round(
        orders.filter(isSettled).reduce((sum, o) => sum + o.price, 0)
      ),
    };

    return NextResponse.json({ insights: await generateInsights(input) });
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("insights error:", err);
    return NextResponse.json({ error: "Could not work out your insights." }, { status: 500 });
  }
}
