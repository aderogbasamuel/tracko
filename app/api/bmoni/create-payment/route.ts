import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getTraderWallets } from "../../../../lib/bmoni";

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const wallets = await getTraderWallets();
    console.log("Wallet response:", wallets);

    const ngnWallet =
      wallets.find((w: any) => w.currency === "NGN") ||
      wallets.data?.[0];

    const reference = `TRACKO-${order.id.slice(0, 8)}`;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentRef: reference,
      },
    });
    console.log("NGN Wallet:", ngnWallet);
    console.log(ngnWallet?.walletAddress);
    return NextResponse.json({
      walletAddress: ngnWallet?.walletAddress,
      amount: order.price,
      reference,
    });
  } catch (err) {
    console.error("CREATE PAYMENT ERROR:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}