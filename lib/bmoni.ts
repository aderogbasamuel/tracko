import { logBmoniCall } from "./bmoni-log";

// Origin only — every endpoint path already carries /v1, so appending it here
// would produce /v1/v1/... and 404 everything.
const BASE_URL = (process.env.BMONI_BASE_URL ?? "").replace(/\/$/, "");
const API_KEY = process.env.BMONI_API_KEY ?? "";
const USER_ID = process.env.BMONI_TRADER_USER_ID ?? "";

/** Raised when the sandbox is reachable but unhappy, so callers can show the real reason. */
export class BmoniError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "BmoniError";
  }
}

function assertConfigured() {
  const missing = [
    !BASE_URL && "BMONI_BASE_URL",
    !API_KEY && "BMONI_API_KEY",
    !USER_ID && "BMONI_TRADER_USER_ID",
  ].filter(Boolean);
  if (missing.length) {
    throw new BmoniError(`BMONI is not configured — missing ${missing.join(", ")}.`, 500);
  }
}

/**
 * The single door to the BMONI API. Every call carries the key, is logged with
 * the key redacted, and raises BmoniError on failure.
 *
 * `form` sends multipart (KYC document upload); `body` sends JSON. Content-Type
 * is deliberately omitted for multipart so fetch can set its own boundary.
 */
export async function bmoniRequest<T = any>(
  path: string,
  // body is serialised here, so it takes an object rather than RequestInit's BodyInit.
  options: Omit<RequestInit, "body"> & { body?: unknown; form?: FormData } = {}
): Promise<T> {
  assertConfigured();
  const method = options.method ?? "GET";
  const startedAt = Date.now();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      method,
      // The key is attached here and nowhere else. It must never reach the client.
      headers: {
        "x-api-key": API_KEY,
        ...(options.form ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
      body: options.form ?? (options.body ? JSON.stringify(options.body) : undefined),
      cache: "no-store",
    });
  } catch {
    logBmoniCall({ method, path, status: 0, ms: Date.now() - startedAt, error: "network" });
    throw new BmoniError("Could not reach BMONI. Check your connection.", 503);
  }

  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  logBmoniCall({
    method,
    path,
    status: res.status,
    ms: Date.now() - startedAt,
    requestBody: options.body,
    responseBody: body,
  });

  if (!res.ok) {
    const detail =
      (typeof body === "object" && (body?.message || body?.error)) || `HTTP ${res.status}`;
    throw new BmoniError(
      `BMONI rejected the request (${res.status}): ${
        Array.isArray(detail) ? detail.join(", ") : detail
      }`,
      res.status
    );
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Wallets
// ---------------------------------------------------------------------------

export interface SmartWallet {
  id: string;
  currency: string;
  walletAddress: string | null;
  isActive: boolean;
}

export async function getTraderWallets(): Promise<SmartWallet[]> {
  const data = await bmoniRequest<SmartWallet[]>(
    `/v1/users/${USER_ID}/smart-wallets/account/wallets`
  );
  return Array.isArray(data) ? data : [];
}

let cachedWalletId: string | null = null;

/**
 * The smart wallet UUID, which is NOT the 0x wallet address — passing the
 * address to the transactions endpoint 404s. The env var is only a hint: if it
 * is missing or stale we resolve the live wallet list instead, so a bad value
 * can't take the demo down mid-judging.
 */
export async function getSmartWalletId(): Promise<string> {
  if (cachedWalletId) return cachedWalletId;

  const wallets = await getTraderWallets();
  const configured = process.env.BMONI_TRADER_SMART_WALLET_ID;
  const match =
    wallets.find((w) => w.id === configured) ??
    // Reads report the fiat code ("NGN") even though writes take the
    // stablecoin code ("CNGN"), so accept either.
    wallets.find((w) => w.isActive && /^(C?NGN)$/i.test(w.currency)) ??
    wallets.find((w) => w.isActive);

  if (!match) throw new BmoniError("This trader has no active BMONI smart wallet.", 404);
  cachedWalletId = match.id;
  return match.id;
}

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------

export interface BalanceEntry {
  smartWalletId: string;
  currency: string;
  balance: string | null;
  error: string | null;
}

export async function getTraderBalances(): Promise<BalanceEntry[]> {
  const data = await bmoniRequest<any>(`/v1/users/${USER_ID}/smart-wallets/account/balances`);
  // The live sandbox returns the payload flat; the published spec wraps it in
  // `data`. Accept both so a proxy change doesn't blank the dashboard.
  return data?.balances ?? data?.data?.balances ?? [];
}

/** The trader's naira balance, or null if the read failed. */
export async function getNgnBalance(): Promise<number | null> {
  const entry = (await getTraderBalances()).find((b) => /^(C?NGN)$/i.test(b.currency));
  if (!entry || entry.balance == null) return null;
  const value = Number(entry.balance);
  return Number.isFinite(value) ? value : null;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export interface BmoniTransaction {
  id: string;
  type?: string;
  status?: string;
  amount?: string;
  currency?: string;
  description?: string | null;
  createdAt?: string | null;
}

export async function getTraderTransactions(): Promise<BmoniTransaction[]> {
  const walletId = await getSmartWalletId();
  const data = await bmoniRequest<any>(`/v1/users/${USER_ID}/transactions/${walletId}`);
  return data?.transactions ?? data?.data?.transactions ?? [];
}

// ---------------------------------------------------------------------------
// Nigerian deposit account (the customer-facing bank details)
// ---------------------------------------------------------------------------

export interface DepositAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  bankCode?: string;
  /** True when the account is shared across partners, so the reference is what
   *  identifies the payer rather than the account number itself. */
  pooled: boolean;
}

export async function getNgnDepositAccount(): Promise<DepositAccount> {
  const data = await bmoniRequest<any>(
    `/v1/users/${USER_ID}/bank-accounts/deposit-accounts/NGN`
  );
  const accounts: any[] = data?.accounts ?? data?.data?.accounts ?? [];
  if (!accounts.length) {
    throw new BmoniError(
      "BMONI has not provisioned a Nigerian deposit account for this trader yet.",
      404
    );
  }

  // Prefer a dedicated account if the rail is ever activated for this key;
  // today only the shared "pooled-vba-*" account exists.
  const dedicated = accounts.find((a) => !/^pooled/i.test(a.id ?? ""));
  const account = dedicated ?? accounts[0];

  return {
    id: account.id,
    accountName: account.accountName,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    // Sandbox returns "XXXXXXX" here, so treat a non-numeric code as absent
    // rather than showing the trader a fake CBN code.
    bankCode: /^\d+$/.test(account.bankCode ?? "") ? account.bankCode : undefined,
    pooled: !dedicated,
  };
}

// ---------------------------------------------------------------------------
// Nigerian banks (used for withdrawal setup)
// ---------------------------------------------------------------------------

export async function getNigerianBanks(): Promise<{ bankName: string; bankCode: string }[]> {
  const data = await bmoniRequest<any>(`/v1/users/${USER_ID}/bank-accounts/nigerian-banks`);
  return data?.banks ?? data?.data?.banks ?? [];
}

export async function verifyNigerianAccount(accountNumber: string, bankCode: string) {
  return bmoniRequest<{
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
  }>(`/v1/users/${USER_ID}/bank-accounts/verify-nigerian-account`, {
    method: "POST",
    body: { accountNumber, bankCode },
  });
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface OnboardingStatus {
  anchorStatus: string;
  bridgeStatus?: string;
  moneriumStatus: string;
  paytrieStatus: string;
  etherfuseStatus: string;
  anchorRejectionReason?: string;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return bmoniRequest<OnboardingStatus>(`/v1/users/${USER_ID}/onboarding/status`);
}

export async function getKycReadiness(): Promise<{ ready: boolean; missing: string[] }> {
  return bmoniRequest(`/v1/users/${USER_ID}/kyc/readiness`);
}

export async function getKycProfile(): Promise<any> {
  return bmoniRequest(`/v1/users/${USER_ID}/kyc`);
}

export interface TraderProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

/** The trader's own BMONI profile — used to address the daily summary to them. */
export async function getTraderProfile(): Promise<TraderProfile> {
  return bmoniRequest<TraderProfile>(`/v1/users/${USER_ID}`);
}
