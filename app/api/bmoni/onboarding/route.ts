export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import {
  getTraderWallets,
  getOnboardingStatus,
  getKycProfile,
  getKycReadiness,
  getNgnBalance,
  getNgnDepositAccount,
  BmoniError,
} from "../../../../lib/bmoni";

export type StageState = "complete" | "in_progress" | "not_started" | "blocked" | "unknown";

export interface Stage {
  key: string;
  label: string;
  state: StageState;
  detail: string;
}

/**
 * Every stage of the documented BMONI chain, evaluated against live API
 * responses. Doubles as a debugging tool for the trader and as evidence for
 * judges that the integration is real rather than mocked.
 */
export async function GET() {
  const stages: Stage[] = [];

  // Each read is independent — one failing stage must not blank the whole panel.
  const settle = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (err) {
      console.error("onboarding stage read failed:", err);
      return null;
    }
  };

  const [wallets, onboarding, kyc, readiness, balance, deposit] = await Promise.all([
    settle(getTraderWallets),
    settle(getOnboardingStatus),
    settle(getKycProfile),
    settle(getKycReadiness),
    settle(getNgnBalance),
    settle(getNgnDepositAccount),
  ]);

  // 1. Trader account
  stages.push({
    key: "user",
    label: "Trader account created",
    state: wallets !== null ? "complete" : "unknown",
    detail:
      wallets !== null
        ? "BMONI user is live and reachable with the partner key."
        : "Could not reach BMONI to confirm the account.",
  });

  // 2. Smart wallet
  const ngnWallet = wallets?.find((w) => w.isActive && /^(C?NGN)$/i.test(w.currency));
  stages.push({
    key: "wallet",
    label: "Naira smart wallet provisioned",
    state: ngnWallet ? "complete" : wallets ? "not_started" : "unknown",
    detail: ngnWallet
      ? `Active ${ngnWallet.currency} smart wallet deployed on-chain.`
      : "No active naira smart wallet found for this trader.",
  });

  // 3. KYC
  const kycStatus: string = kyc?.status ?? "unknown";
  const missing: string[] = readiness?.missing ?? [];
  stages.push({
    key: "kyc",
    label: "Identity verification (KYC)",
    state:
      kycStatus === "approved" || kycStatus === "completed"
        ? "complete"
        : readiness?.ready
          ? "in_progress"
          : kyc
            ? "blocked"
            : "unknown",
    detail: readiness?.ready
      ? "KYC profile is ready for activation."
      : missing.length
        ? `Awaiting: ${missing.join(", ")}. Full activation needs identity documents, which this build deliberately does not collect.`
        : "KYC status unavailable.",
  });

  // 4. NGN rail (Anchor)
  const anchor = onboarding?.anchorStatus ?? "unknown";
  stages.push({
    key: "rail",
    label: "Naira rail activated (Anchor)",
    state:
      anchor === "active"
        ? "complete"
        : anchor === "pending"
          ? "in_progress"
          : anchor === "rejected"
            ? "blocked"
            : anchor === "not_started"
              ? "not_started"
              : "unknown",
    detail:
      anchor === "active"
        ? "Anchor rail is live — dedicated virtual accounts available."
        : `Anchor reports "${anchor}". Nigeria onboarding has been started, but the rail activates only after full KYC.${
            onboarding?.anchorRejectionReason ? ` Reason: ${onboarding.anchorRejectionReason}` : ""
          }`,
  });

  // 5. Collection account
  stages.push({
    key: "deposit",
    label: "Naira collection account",
    state: deposit ? "complete" : "not_started",
    detail: deposit
      ? deposit.pooled
        ? `Shared BMONI collection account (${deposit.bankName} · ${deposit.accountNumber}). Payments are identified by reference.`
        : `Dedicated virtual account (${deposit.bankName} · ${deposit.accountNumber}).`
      : "No naira deposit account available yet.",
  });

  // 6. Funding
  stages.push({
    key: "funded",
    label: "Wallet funded",
    state: balance != null && balance > 0 ? "complete" : balance === 0 ? "not_started" : "unknown",
    detail:
      balance != null
        ? `Balance reads ₦${balance.toLocaleString()} from the live chain.`
        : "Balance could not be read.",
  });

  const reachable = wallets !== null;
  return NextResponse.json(
    { stages, reachable, checkedAt: new Date().toISOString() },
    { status: reachable ? 200 : 503 }
  );
}

