import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { verifyPassword } from "../../../../lib/crypto";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const trader = await prisma.trader.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    // One message for both cases: saying "no such email" tells an attacker
    // which addresses are registered.
    if (!trader || !verifyPassword(String(password), trader.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: trader.id,
        name: trader.name,
        email: trader.email,
        phone: trader.phone,
        bmoniUserId: trader.bmoniUserId,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Could not sign you in." }, { status: 500 });
  }
}
