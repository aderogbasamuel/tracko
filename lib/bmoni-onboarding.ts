import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { prisma } from "./db";
import { encryptSecret, decryptSecret } from "./crypto";
import { bmoniRequest, BmoniError } from "./bmoni";

/**
 * The BMONI onboarding chain, in the order the API requires:
 *
 *   create user -> create wallet -> complete KYC -> activate NGN rail
 *
 * Calls fail when this order is broken, so each step here checks what the
 * trader already has before doing anything. Every step is idempotent: running
 * the chain twice must not fork a trader's wallet history, which is BMONI's
 * own stated warning about re-creating users.
 *
 * On wallet creation: BMONI ships owner-key signing as a Flutter/React Native
 * SDK, and there is no web equivalent. But the owner proof is a plain EIP-191
 * `personal_sign`, so we generate a secp256k1 keypair with viem and sign
 * server-side. Verified working against the sandbox — see demo-evidence/onboarding.
 */

/** Sandbox BVN mandated by the hackathon rules. A real BVN is never accepted here. */
export const SANDBOX_BVN = "22222222222";

export interface TraderRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  bmoniUserId: string | null;
  ownerAddress: string | null;
  ownerKeyEncrypted: string | null;
  smartWalletId: string | null;
  smartWalletAddress: string | null;
  kycStatus: string;
  kycApplicantId: string | null;
  kycRejectLabels: string | null;
  railStatus: string;
}

async function loadTrader(traderId: string): Promise<TraderRecord> {
  const trader = await prisma.trader.findUnique({ where: { id: traderId } });
  if (!trader) throw new BmoniError("Trader not found.", 404);
  return trader as TraderRecord;
}

// ---------------------------------------------------------------------------
// Step 1 — create the BMONI user
// ---------------------------------------------------------------------------

export async function ensureBmoniUser(traderId: string): Promise<TraderRecord> {
  const trader = await loadTrader(traderId);
  if (trader.bmoniUserId) return trader;

  const [firstName, ...rest] = trader.name.trim().split(/\s+/);
  const created = await bmoniRequest<any>("/v1/users", {
    method: "POST",
    body: {
      firstName: firstName || "Trader",
      lastName: rest.join(" ") || undefined,
      email: trader.email,
      phoneNumber: trader.phone,
    },
  });

  // The response nests the user; accept either shape.
  const bmoniUserId = created?.user?.bmoniUserId ?? created?.bmoniUserId;
  if (!bmoniUserId) throw new BmoniError("BMONI did not return a user id.", 502);

  return (await prisma.trader.update({
    where: { id: traderId },
    data: { bmoniUserId },
  })) as TraderRecord;
}

// ---------------------------------------------------------------------------
// Step 2 — owner keypair, proof challenge, managed smart wallet
// ---------------------------------------------------------------------------

export async function ensureSmartWallet(traderId: string): Promise<TraderRecord> {
  let trader = await ensureBmoniUser(traderId);
  if (trader.smartWalletId) return trader;

  // Reuse the owner key across retries. Generating a fresh one after a failed
  // create-managed would orphan the previous address.
  let privateKey = trader.ownerKeyEncrypted ? decryptSecret(trader.ownerKeyEncrypted) : null;
  if (!privateKey) {
    privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    trader = (await prisma.trader.update({
      where: { id: traderId },
      data: {
        ownerKeyEncrypted: encryptSecret(privateKey),
        ownerAddress: account.address,
      },
    })) as TraderRecord;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const userId = trader.bmoniUserId!;

  // Wallet endpoints take the stablecoin code (CNGN); reads report the fiat
  // code (NGN). Sending NGN here is rejected.
  const challenge = await bmoniRequest<{ challengeId: string; message: string }>(
    `/v1/users/${userId}/smart-wallets/owner-proof-challenges`,
    { method: "POST", body: { currency: "CNGN", userOwnerAddress: account.address } }
  );

  // EIP-191 personal_sign over the exact message. The recovered signer must
  // equal userOwnerAddress, so the message cannot be reformatted or trimmed.
  const signature = await account.signMessage({ message: challenge.message });

  const wallet = await bmoniRequest<any>(
    `/v1/users/${userId}/smart-wallets/create-managed`,
    {
      method: "POST",
      body: {
        currency: "CNGN",
        userOwnerAddress: account.address,
        ownerProofChallengeId: challenge.challengeId,
        ownerProofSignature: signature,
      },
    }
  );

  return (await prisma.trader.update({
    where: { id: traderId },
    data: { smartWalletId: wallet.id, smartWalletAddress: wallet.walletAddress },
  })) as TraderRecord;
}

// ---------------------------------------------------------------------------
// Step 3 — KYC profile
// ---------------------------------------------------------------------------

export interface KycDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender?: string;
  streetLine1: string;
  city: string;
  state: string;
  postalCode: string;
}

export async function submitKycProfile(traderId: string, details: KycDetails) {
  const trader = await ensureSmartWallet(traderId);
  const userId = trader.bmoniUserId!;

  const result = await bmoniRequest<any>(`/v1/users/${userId}/kyc`, {
    method: "PATCH",
    body: {
      personalInfo: {
        firstName: details.firstName,
        lastName: details.lastName,
        dateOfBirth: details.dateOfBirth,
        gender: details.gender,
        nationality: "NG",
      },
      address: {
        streetLine1: details.streetLine1,
        city: details.city,
        state: details.state,
        postalCode: details.postalCode,
        countryCode: "NGA",
      },
      // Sandbox BVN only. Tracko never accepts a real BVN from a trader —
      // there is no field for one anywhere in the UI.
      identificationNumbers: [
        { type: "bvn", number: SANDBOX_BVN, issuingCountryCode: "NGA" },
      ],
      sourceOfFunds: "business",
      estimatedMonthlyVolume: 500000,
      accountPurpose: "business",
      actingAsIntermediary: false,
    },
  });

  await prisma.trader.update({
    where: { id: traderId },
    data: { kycStatus: result?.canActivate ? "ready" : "profile_saved" },
  });

  return result;
}

/** Uploads one KYC document. `files` are passed straight through as multipart. */
export async function uploadKycDocument(
  traderId: string,
  kind: "identification" | "proof-of-address" | "biometric",
  files: File[],
  fields: Record<string, string>
) {
  const trader = await loadTrader(traderId);
  if (!trader.bmoniUserId) throw new BmoniError("Start onboarding first.", 400);

  const form = new FormData();
  // The biometric endpoint names its field `selfie`; the others use `files`.
  const fieldName = kind === "biometric" ? "selfie" : "files";
  for (const file of files) form.append(fieldName, file, file.name);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);

  return bmoniRequest<any>(`/v1/users/${trader.bmoniUserId}/kyc/documents/${kind}`, {
    method: "POST",
    form,
  });
}

// ---------------------------------------------------------------------------
// Step 4 — activate KYC and the Nigerian rail
// ---------------------------------------------------------------------------

export async function activateKyc(traderId: string) {
  const trader = await loadTrader(traderId);
  const userId = trader.bmoniUserId!;

  const readiness = await bmoniRequest<{ ready: boolean; missing: string[] }>(
    `/v1/users/${userId}/kyc/readiness`
  );
  if (!readiness.ready) {
    return { activated: false, missing: readiness.missing };
  }

  // The docs say Nigeria sends an empty body; the live API rejects that and
  // requires a Sumsub level. `id-only` is the lightest that passes validation.
  const result = await bmoniRequest<any>(`/v1/users/${userId}/kyc/activate`, {
    method: "POST",
    body: { sumsubLevelName: "id-only" },
  });

  await prisma.trader.update({
    where: { id: traderId },
    data: { kycStatus: result?.activated ? "in_review" : "profile_saved" },
  });

  return { activated: Boolean(result?.activated), message: result?.message, missing: [] };
}

export async function startNigerianRail(traderId: string) {
  const trader = await ensureSmartWallet(traderId);
  const userId = trader.bmoniUserId!;

  const result = await bmoniRequest<any>(`/v1/users/${userId}/onboarding/start-nigeria`, {
    method: "POST",
    body: {
      bvn: SANDBOX_BVN,
      ngnWalletAddress: trader.smartWalletAddress,
      ngnWalletIndex: 0,
    },
  });

  await refreshOnboardingState(traderId);
  return result;
}

/** Pulls the live KYC verdict and rail status back onto the trader record. */
export async function refreshOnboardingState(traderId: string) {
  const trader = await loadTrader(traderId);
  if (!trader.bmoniUserId) return trader;
  const userId = trader.bmoniUserId;

  const [review, onboarding] = await Promise.all([
    // 404s until a Sumsub applicant exists, which is expected pre-activation.
    bmoniRequest<any>(`/v1/users/${userId}/kyc/status`).catch(() => null),
    bmoniRequest<any>(`/v1/users/${userId}/onboarding/status`).catch(() => null),
  ]);

  return (await prisma.trader.update({
    where: { id: traderId },
    data: {
      kycStatus: review?.status ?? trader.kycStatus,
      kycApplicantId: review?.applicantId ?? trader.kycApplicantId,
      kycRejectLabels: review?.rejectLabels?.length
        ? review.rejectLabels.join(",")
        : null,
      railStatus: onboarding?.anchorStatus ?? trader.railStatus,
    },
  })) as TraderRecord;
}
