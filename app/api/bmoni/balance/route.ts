import { NextResponse } from "next/server";
import { getTraderBalances } from "../../../../lib/bmoni";

export async function GET() {
  try {
    const data = await getTraderBalances();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("balance fetch error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}