export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { detectAnomalies } from "../../../../lib/anomaly";
import { explainAnomaly } from "../../../../lib/ai";

export async function GET() {
  try {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  const anomalies = detectAnomalies(orders);

  if (anomalies.length === 0) {
    return NextResponse.json({ hasAlert: false });
  }
  
  // Only explain the most recent/first anomaly to keep it fast + cheap
  const topAnomaly = anomalies[0];
  try {
    const explanation = await explainAnomaly(topAnomaly);
    return NextResponse.json({
      hasAlert: true,
      message: explanation,
      orderId: topAnomaly.order.id,
    });
  } catch (err: any) {
    // Fall back to the rule-based detail if AI call fails — still useful
    return NextResponse.json({
      hasAlert: true,
      message: topAnomaly.detail,
      orderId: topAnomaly.order.id,
    });
  }
  } catch (err) {
    console.error("anomaly error:", err);
    return NextResponse.json({ hasAlert: false }, { status: 200 });
  }
}