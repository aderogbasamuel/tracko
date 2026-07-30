import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { BmoniError, bmoniRequest } from "../../../lib/bmoni";
import {
  ensureSmartWallet,
  submitKycProfile,
  uploadKycDocument,
  activateKyc,
  startNigerianRail,
  refreshOnboardingState,
} from "../../../lib/bmoni-onboarding";

export const dynamic = "force-dynamic";

/** Live onboarding state for a trader, refreshed from BMONI on every read. */
export async function GET(req: NextRequest) {
  const traderId = req.nextUrl.searchParams.get("traderId");
  if (!traderId) {
    return NextResponse.json({ error: "traderId is required" }, { status: 400 });
  }

  try {
    const trader = await prisma.trader.findUnique({ where: { id: traderId } });
    if (!trader) return NextResponse.json({ error: "Trader not found" }, { status: 404 });

    const refreshed = trader.bmoniUserId ? await refreshOnboardingState(traderId) : trader;

    // Readiness tells the trader exactly which documents BMONI is still waiting
    // for. Without it the UI can only say "not ready" and leave them guessing.
    let readiness: { ready: boolean; missing: string[] } | null = null;
    if (refreshed.bmoniUserId) {
      readiness = await bmoniRequest<{ ready: boolean; missing: string[] }>(
        `/v1/users/${refreshed.bmoniUserId}/kyc/readiness`
      ).catch(() => null);
    }

    return NextResponse.json({ trader: publicView(refreshed), readiness });
  } catch (err) {
    return handle(err, "Could not read your onboarding status.");
  }
}

/**
 * Drives one step of the chain. Split by action rather than exposed as one
 * "do everything" call so the UI can show which step failed and retry just that.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  try {
    // Document upload arrives as multipart.
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const traderId = String(form.get("traderId") ?? "");
      const kind = String(form.get("kind") ?? "") as
        | "identification"
        | "proof-of-address"
        | "biometric";

      if (!traderId || !["identification", "proof-of-address", "biometric"].includes(kind)) {
        return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
      }

      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      if (!files.length) {
        return NextResponse.json({ error: "Attach at least one image." }, { status: 400 });
      }

      const fields: Record<string, string> = { type: String(form.get("type") ?? "") };
      if (kind === "identification") {
        fields.documentNumber = String(form.get("documentNumber") ?? "");
        fields.issuingCountry = "NGA";
      }

      const result = await uploadKycDocument(traderId, kind, files, fields);
      return NextResponse.json({ ok: true, result });
    }

    const { traderId, action, details } = await req.json();
    if (!traderId) {
      return NextResponse.json({ error: "traderId is required" }, { status: 400 });
    }

    switch (action) {
      case "start": {
        // Creates the BMONI user and the self-custodied smart wallet.
        const trader = await ensureSmartWallet(traderId);
        return NextResponse.json({ trader: publicView(trader) });
      }
      case "kyc-profile": {
        const result = await submitKycProfile(traderId, details);
        return NextResponse.json({ result });
      }
      case "activate": {
        const result = await activateKyc(traderId);
        const trader = await refreshOnboardingState(traderId);
        return NextResponse.json({ result, trader: publicView(trader) });
      }
      case "start-rail": {
        const result = await startNigerianRail(traderId);
        const trader = await refreshOnboardingState(traderId);
        return NextResponse.json({ result, trader: publicView(trader) });
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    return handle(err, "That onboarding step failed.");
  }
}

/** Strips the encrypted owner key and password hash before anything is returned. */
function publicView(trader: any) {
  return {
    id: trader.id,
    name: trader.name,
    email: trader.email,
    phone: trader.phone,
    bmoniUserId: trader.bmoniUserId,
    ownerAddress: trader.ownerAddress,
    smartWalletId: trader.smartWalletId,
    smartWalletAddress: trader.smartWalletAddress,
    kycStatus: trader.kycStatus,
    kycRejectLabels: trader.kycRejectLabels ? trader.kycRejectLabels.split(",") : [],
    railStatus: trader.railStatus,
  };
}

function handle(err: unknown, fallback: string) {
  if (err instanceof BmoniError) {
    console.error("onboarding BMONI error:", err.message);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("onboarding error:", err);
  const message = err instanceof Error ? err.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}
