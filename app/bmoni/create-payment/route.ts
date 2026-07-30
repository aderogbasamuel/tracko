import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/db";
import { getTraderWallets } from "../../lib/bmoni";

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const wallets = await getTraderWallets();
  const ngnWallet = wallets.wallets?.find((w: any) => w.currency === "CNGN") || wallets.data?.[0];

  // Store a reference so we can reconcile later
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentRef: `TRACKO-${order.id.slice(0, 8)}` },
  });

  return NextResponse.json({
    walletAddress: ngnWallet?.address,
    amount: order.price,
    reference: `TRACKO-${order.id.slice(0, 8)}`,
    instructions: `Send ₦${order.price} to the wallet address above. Include the reference if possible.`,
  });
}