import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { hashPassword } from "../../../../lib/crypto";

/**
 * Creates the Tracko account only. The BMONI identity is provisioned separately
 * by /api/onboarding/start, so a slow or failing sandbox cannot block signup.
 */
export async function POST(request: Request) {
  try {
    const { name, email, password, phone } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are all required." },
        { status: 400 }
      );
    }
    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Use at least 8 characters for your password." },
        { status: 400 }
      );
    }
    if (!/^\+?\d[\d\s-]{8,}$/.test(String(phone ?? ""))) {
      return NextResponse.json(
        { error: "Enter the phone number you use for business, e.g. 08031234567." },
        { status: 400 }
      );
    }

    const normalisedEmail = String(email).trim().toLowerCase();
    if (await prisma.trader.findUnique({ where: { email: normalisedEmail } })) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    // BMONI wants E.164; traders type the local 0-prefixed form.
    const digits = String(phone).replace(/\D/g, "");
    const phoneE164 = digits.startsWith("234")
      ? `+${digits}`
      : `+234${digits.replace(/^0/, "")}`;

    const trader = await prisma.trader.create({
      data: {
        name: String(name).trim(),
        email: normalisedEmail,
        phone: phoneE164,
        passwordHash: hashPassword(String(password)),
      },
    });

    // Never return the hash or any BMONI key material.
    return NextResponse.json({
      user: { id: trader.id, name: trader.name, email: trader.email, phone: trader.phone },
    });
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json({ error: "Could not create your account." }, { status: 500 });
  }
}
