"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { getStoredUser, storeUser, clearStoredUser, type AuthUser } from "../../lib/auth";
import ErrorNotice from "../components/ErrorNotice";

interface TraderState {
  id: string;
  name: string;
  bmoniUserId: string | null;
  ownerAddress: string | null;
  smartWalletId: string | null;
  smartWalletAddress: string | null;
  kycStatus: string;
  kycRejectLabels: string[];
  railStatus: string;
}

const NIGERIAN_STATES = [
  "Abia", "Abuja (FCT)", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara",
];

/** BMONI's readiness keys are internal names; traders need plain words. */
function describeMissing(key: string): string {
  const map: Record<string, string> = {
    identificationDocuments: "a photo ID",
    proofOfAddressDocuments: "proof of address",
    biometricDocuments: "a selfie",
  };
  return map[key] ?? key.replace(/([A-Z])/g, " $1").toLowerCase();
}

/**
 * Walks a new trader through the real BMONI chain:
 * create user -> self-custodied wallet -> KYC -> NGN rail.
 *
 * Each step shows what actually happened at BMONI rather than a spinner and a
 * green tick, because the honest answer at the end is "your documents are in
 * review", not "you're done".
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [trader, setTrader] = useState<TraderState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [readiness, setReadiness] = useState<{ ready: boolean; missing: string[] } | null>(null);

  // KYC form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [streetLine1, setStreetLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("Lagos");
  const [postalCode, setPostalCode] = useState("");

  const refresh = useCallback(
    async (traderId: string) => {
      try {
        const res = await fetch(`/api/onboarding?traderId=${traderId}`);
        const data = await res.json().catch(() => null);
        // A session from before the Trader table existed points at an id that
        // is no longer there. Send them back to sign in rather than showing a
        // wizard that can never complete.
        if (res.status === 404) {
          clearStoredUser();
          router.replace("/login");
          return;
        }
        if (!res.ok) throw new Error(data?.error ?? "Could not read your onboarding status.");
        setTrader(data.trader);
        setReadiness(data.readiness ?? null);
      } catch (err: any) {
        setError(err?.message ?? "Could not read your onboarding status.");
      }
    },
    [router]
  );

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(stored);
    const [first, ...rest] = stored.name.split(/\s+/);
    setFirstName(first ?? "");
    setLastName(rest.join(" "));
    refresh(stored.id);
  }, [router, refresh]);

  async function act(action: string, body: Record<string, unknown> = {}) {
    if (!user) return;
    setBusy(action);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traderId: user.id, action, ...body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "That step failed.");

      // A step can return 200 and still not have done what the trader wanted —
      // activate reports `activated: false` with a list of what is missing.
      // Swallowing that is why this screen felt broken: you pressed a button
      // and nothing at all happened.
      if (data?.result && data.result.activated === false) {
        setNotice(
          data.result.missing?.length
            ? `BMONI still needs: ${data.result.missing.map(describeMissing).join(", ")}.`
            : "BMONI could not start verification yet."
        );
      } else if (action === "activate") {
        setNotice("Documents submitted. BMONI's verification partner is reviewing them now.");
      }

      if (data.trader) {
        setTrader(data.trader);
        if (data.trader.bmoniUserId && user) {
          const next = { ...user, bmoniUserId: data.trader.bmoniUserId };
          storeUser(next);
          setUser(next);
        }
      }
      // Always re-read: readiness changes even when the trader row does not.
      await refresh(user.id);
      return data;
    } catch (err: any) {
      setError(err?.message ?? "That step failed.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadDocument(
    kind: string,
    type: string,
    files: FileList | null,
    label: string
  ) {
    if (!user || !files?.length) return;
    setBusy(kind);
    setError("");
    try {
      const form = new FormData();
      form.append("traderId", user.id);
      form.append("kind", kind);
      form.append("type", type);
      if (kind === "identification") form.append("documentNumber", "TRACKO-KYC");
      for (const file of Array.from(files)) form.append("files", file);

      const res = await fetch("/api/onboarding", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Upload failed.");
      setNotice(`${label} uploaded.`);
      await refresh(user.id);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  const hasWallet = Boolean(trader?.smartWalletId);
  const kycSubmitted = trader?.kycStatus && trader.kycStatus !== "not_started";
  const inReview = ["in_review", "pending", "action_required"].includes(trader?.kycStatus ?? "");
  const railActive = trader?.railStatus === "active";

  // BMONI reports outstanding items by key; absence means it has been accepted.
  const missing = readiness?.missing ?? [];
  const uploaded = (key: string) => Boolean(readiness) && !missing.includes(key);
  const allDocumentsIn = Boolean(readiness?.ready);

  const steps = [
    { done: Boolean(trader?.bmoniUserId), label: "Account" },
    { done: hasWallet, label: "Wallet" },
    { done: Boolean(kycSubmitted), label: "Identity" },
    { done: railActive, label: "Payments" },
  ];
  const completed = steps.filter((s) => s.done).length;

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <Link href="/landing" className="flex items-center gap-2.5">
            <img src="/tracko.svg" alt="" className="h-7 w-7" />
            <span className="font-display text-xl font-bold tracking-tight text-teal-deep dark:text-cyan">
              Tracko
            </span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-text-muted hover:text-teal">
            Skip for now
          </Link>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-text">
          Set up payments
        </h1>
        <p className="mt-1.5 text-text-muted">
          This creates your BMONI wallet so customers can pay you into a real Nigerian bank
          account.
        </p>

        {/* Progress */}
        <div className="mt-6 flex items-center gap-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-1 flex-col gap-1.5">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  step.done ? "bg-cyan" : i === completed ? "bg-gold" : "bg-line-strong"
                }`}
              />
              <span
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  step.done ? "text-teal dark:text-cyan" : "text-text-soft"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <ErrorNotice message={error} className="mt-6" />

        {notice && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-cyan/40 bg-cyan/10 px-3.5 py-3">
            <Icon
              icon="ph:info-fill"
              width="18"
              height="18"
              className="mt-0.5 shrink-0 text-teal dark:text-cyan"
            />
            <p className="flex-1 text-sm text-text">{notice}</p>
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss"
              className="shrink-0 text-text-soft hover:text-text"
            >
              <Icon icon="ph:x-bold" width="13" height="13" />
            </button>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {/* ---- Step 1 + 2: BMONI account and self-custodied wallet ---- */}
          <Card
            index={1}
            title="Create your BMONI wallet"
            done={hasWallet}
            description="Tracko generates a wallet key for you and proves ownership to BMONI by signing a cryptographic challenge."
          >
            {hasWallet ? (
              <dl className="space-y-2 text-sm">
                <Detail label="BMONI user" value={trader!.bmoniUserId!} mono />
                <Detail label="Smart wallet" value={trader!.smartWalletAddress ?? ""} mono />
              </dl>
            ) : (
              <button
                onClick={() => act("start")}
                disabled={busy === "start"}
                className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-mid disabled:opacity-60"
              >
                {busy === "start" ? (
                  <>
                    <Icon icon="ph:spinner-bold" width="15" height="15" className="animate-spin" />
                    Creating wallet...
                  </>
                ) : (
                  <>
                    <Icon icon="ph:wallet-bold" width="15" height="15" />
                    Create my wallet
                  </>
                )}
              </button>
            )}
          </Card>

          {/* ---- Step 3: KYC profile ---- */}
          <Card
            index={2}
            title="Confirm your details"
            done={Boolean(kycSubmitted)}
            disabled={!hasWallet}
            description="Nigerian regulations require this before a wallet can receive bank transfers."
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act("kyc-profile", {
                  details: {
                    firstName,
                    lastName,
                    dateOfBirth,
                    streetLine1,
                    city,
                    state: stateName,
                    postalCode,
                  },
                });
              }}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Field label="First name">
                <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="auth-input" />
              </Field>
              <Field label="Last name">
                <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="auth-input" />
              </Field>
              <Field label="Date of birth">
                <input type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="auth-input" />
              </Field>
              <Field label="Postal code">
                <input required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="101241" className="auth-input" />
              </Field>
              <Field label="Street address" full>
                <input required value={streetLine1} onChange={(e) => setStreetLine1(e.target.value)} placeholder="15 Admiralty Way" className="auth-input" />
              </Field>
              <Field label="City">
                <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lekki" className="auth-input" />
              </Field>
              <Field label="State">
                <select value={stateName} onChange={(e) => setStateName(e.target.value)} className="auth-input">
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <p className="mb-3 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-xs leading-relaxed text-text-muted">
                  <Icon icon="ph:shield-check-fill" width="14" height="14" className="mr-1 inline align-[-2px] text-teal" />
                  This is a sandbox build, so BMONI receives the official test BVN{" "}
                  <span className="font-mono">22222222222</span> — never your real one. Tracko has
                  no field for a real BVN anywhere.
                </p>
                <button
                  type="submit"
                  disabled={!hasWallet || busy === "kyc-profile"}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-mid disabled:opacity-60"
                >
                  {busy === "kyc-profile" ? "Saving..." : "Save details"}
                </button>
              </div>
            </form>
          </Card>

          {/* ---- Step 4: documents ---- */}
          <Card
            index={3}
            title="Upload your documents"
            done={inReview}
            disabled={!kycSubmitted}
            description="BMONI's verification partner reviews these. Photos of the real thing are required — a screenshot or scan will be rejected."
          >
            <div className="space-y-3">
              <Upload
                label="Photo ID (front and back)"
                hint="National ID, driver's licence or passport"
                multiple
                busy={busy === "identification"}
                done={uploaded("identificationDocuments")}
                onPick={(files) =>
                  uploadDocument("identification", "national_id", files, "Photo ID")
                }
              />
              <Upload
                label="Proof of address"
                hint="Utility bill or bank statement"
                busy={busy === "proof-of-address"}
                done={uploaded("proofOfAddressDocuments")}
                onPick={(files) =>
                  uploadDocument("proof-of-address", "utility_bill", files, "Proof of address")
                }
              />
              <Upload
                label="Selfie"
                hint="A clear photo of your face"
                busy={busy === "biometric"}
                done={uploaded("biometricDocuments")}
                onPick={(files) => uploadDocument("biometric", "selfie", files, "Selfie")}
              />

              {readiness && !allDocumentsIn && (
                <p className="rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2.5 text-xs text-text-muted">
                  Still needed: {missing.map(describeMissing).join(", ")}.
                </p>
              )}

              <button
                onClick={() => act("activate")}
                disabled={!allDocumentsIn || busy === "activate"}
                title={allDocumentsIn ? undefined : "Upload all three documents first"}
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink transition hover:brightness-105 disabled:opacity-60"
              >
                {busy === "activate" ? "Submitting..." : "Submit for verification"}
              </button>

              {trader?.kycStatus === "action_required" && (
                <div className="rounded-xl border border-clay/40 bg-clay-soft px-3.5 py-3 text-sm text-clay dark:bg-clay/10">
                  <p className="font-semibold">Verification needs another look</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    {trader.kycRejectLabels.includes("DOCUMENT_PAGE_MISSING")
                      ? "A page of your ID is missing or unreadable. Upload both the front and the back, in good light."
                      : `BMONI reported: ${trader.kycRejectLabels.join(", ") || "please re-upload your documents"}.`}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* ---- Step 5: rail ---- */}
          <Card
            index={4}
            title="Turn on Naira payments"
            done={railActive}
            disabled={!inReview}
            description="Activates the Nigerian rail so customer transfers reach your wallet."
          >
            <button
              onClick={() => act("start-rail")}
              disabled={busy === "start-rail"}
              className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-mid disabled:opacity-60"
            >
              {busy === "start-rail" ? "Activating..." : "Activate Naira payments"}
            </button>
            {trader && trader.railStatus !== "active" && trader.railStatus !== "not_started" && (
              <p className="mt-3 text-sm text-text-muted">
                BMONI reports the rail as <span className="font-semibold">{trader.railStatus}</span>.
              </p>
            )}
          </Card>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-5 py-4">
          <p className="text-sm text-text-muted">
            You can start recording sales straight away — payments switch on when verification
            clears.
          </p>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal"
          >
            Go to dashboard
            <Icon icon="ph:arrow-right-bold" width="14" height="14" />
          </Link>
        </div>
      </div>
    </main>
  );
}

function Card({
  index,
  title,
  description,
  done,
  disabled,
  children,
}: {
  index: number;
  title: string;
  description: string;
  done?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border bg-surface p-5 transition ${
        done ? "border-cyan/50" : "border-line"
      } ${disabled ? "opacity-55" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            done ? "bg-cyan text-teal-deep" : "bg-surface-2 text-text-muted"
          }`}
        >
          {done ? <Icon icon="ph:check-bold" width="14" height="14" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-text">{title}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-text-muted">{description}</p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2 last:border-0">
      <dt className="text-xs text-text-soft">{label}</dt>
      <dd className={`min-w-0 break-all text-right text-xs text-text ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Upload({
  label,
  hint,
  multiple,
  busy,
  done,
  onPick,
}: {
  label: string;
  hint: string;
  multiple?: boolean;
  busy?: boolean;
  done?: boolean;
  onPick: (files: FileList | null) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition hover:border-teal ${
        done ? "border-cyan/60 bg-cyan/5" : "border-dashed border-line-strong bg-surface-2"
      }`}
    >
      <Icon
        icon={busy ? "ph:spinner-bold" : done ? "ph:check-circle-fill" : "ph:upload-simple-bold"}
        width="18"
        height="18"
        className={`shrink-0 ${done ? "text-cyan" : "text-teal"} ${busy ? "animate-spin" : ""}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text">{label}</span>
        <span className="block text-xs text-text-soft">
          {done ? "Uploaded — tap to replace" : hint}
        </span>
      </span>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        // Reset so re-picking the same file still fires onChange; otherwise a
        // retry after a failed upload silently does nothing.
        onClick={(e) => {
          (e.target as HTMLInputElement).value = "";
        }}
        onChange={(e) => onPick(e.target.files)}
      />
    </label>
  );
}
