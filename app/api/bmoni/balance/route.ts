export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getNgnBalance, BmoniError } from "../../../../lib/bmoni";

export async function GET() {
  try {
    // Returns the naira figure directly so callers don't each re-implement
    // "find the NGN entry", which is where the old currency-code bug lived.
    return NextResponse.json({ balance: await getNgnBalance(), currency: "NGN" });
  } catch (err) {
    if (err instanceof BmoniError) {
      console.error("balance fetch error:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("balance fetch error:", err);
    return NextResponse.json({ error: "Could not load your BMONI balance." }, { status: 500 });
  }
}

