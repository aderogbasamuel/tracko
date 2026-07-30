"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Order } from "../types/order";
import { amountOutstanding, isSettled } from "@/lib/credit";
import ErrorNotice from "./ErrorNotice";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;
  amount: number;
  pooled: boolean;
}

/** Bank details a Nigerian customer can actually pay into, plus automatic confirmation. */
export default function PaymentPanel({
  order,
  onPaid,
}: {
  order: Order;
  onPaid: () => Promise<void> | void;
}) {
  const settled = isSettled(order);
  const owing = amountOutstanding(order);

  // Details persisted on the order survive a refresh, so the panel comes back
  // showing the same account the customer was already given.
  const persisted: BankDetails | null = order.vaAccountNumber
    ? {
        bankName: order.vaBankName ?? "",
        accountNumber: order.vaAccountNumber,
        accountName: order.vaAccountName ?? "",
        reference: order.paymentRef ?? "",
        amount: owing,
        pooled: Boolean(order.vaIsPooled),
      }
    : null;

  const [details, setDetails] = useState<BankDetails | null>(persisted);
  const [requesting, setRequesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [ambiguity, setAmbiguity] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const startedAt = useRef<number>(0);

  const check = useCallback(
    async (manual: boolean) => {
      if (manual) setChecking(true);
      try {
        const res = await fetch("/api/bmoni/check-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Could not check for payment.");

        if (data.ambiguous) {
          setAmbiguity(data.message ?? "");
          setWatching(false);
          return true; // stop polling — this needs a human
        }
        setAmbiguity("");
        if (data.paid) {
          setWatching(false);
          await onPaid();
          return true;
        }
        if (manual) setError("");
        return false;
      } catch (err: any) {
        setError(err?.message ?? "Could not check for payment.");
        // Keep polling through a blip; hackathon wifi drops packets.
        return false;
      } finally {
        if (manual) setChecking(false);
      }
    },
    [order.id, onPaid]
  );

  // Poll while a request is outstanding, then give up rather than hammer the
  // sandbox forever. The trader can always restart it with "Check now".
  useEffect(() => {
    if (!watching || settled) return;
    const timer = setInterval(async () => {
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        setWatching(false);
        setTimedOut(true);
        return;
      }
      await check(false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [watching, settled, check]);

  async function requestPayment() {
    setRequesting(true);
    setError("");
    try {
      const res = await fetch("/api/bmoni/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not create the payment request.");
      setDetails(data);
      setTimedOut(false);
      startedAt.current = Date.now();
      setWatching(true);
    } catch (err: any) {
      setError(err?.message ?? "Could not create the payment request.");
    } finally {
      setRequesting(false);
    }
  }

  function copy(label: string, value: string) {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
      },
      () => setError("Could not copy — long-press the number to copy it manually.")
    );
  }

  // Resume watching after a refresh if details exist and money is still owed.
  useEffect(() => {
    if (details && !settled && !watching && !timedOut && startedAt.current === 0) {
      startedAt.current = Date.now();
      setWatching(true);
    }
  }, [details, settled, watching, timedOut]);

  if (settled) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <Icon icon="ph:check-circle-fill" width="20" height="20" className="text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Payment received in full</p>
          {order.paidAt && (
            <p className="text-xs text-emerald-700 mt-0.5 dark:text-emerald-400">
              Confirmed {new Date(order.paidAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="space-y-3">
        <button
          onClick={requestPayment}
          disabled={requesting}
          className="w-full bg-gradient-to-r from-purple-900 to-purple-600 hover:opacity-90 text-white font-medium py-2.5 px-4 rounded-lg transition-opacity disabled:opacity-50 text-sm shadow-sm"
        >
          {requesting ? "Getting account details..." : "Request payment via BMONI"}
        </button>
        <ErrorNotice message={error} onRetry={requestPayment} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-surface-2 overflow-hidden">
        <div className="bg-white px-4 py-3 border-b border-line">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
            Ask your customer to transfer to
          </p>
        </div>

        <dl className="divide-y divide-line">
          <Row label="Bank" value={details.bankName} />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <dt className="text-xs text-text-muted">Account number</dt>
              <dd className="font-mono text-lg font-bold tracking-wide text-text">
                {details.accountNumber}
              </dd>
            </div>
            <button
              onClick={() => copy("account", details.accountNumber)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-text-muted hover:bg-surface-2 active:scale-95 transition"
            >
              <Icon icon={copied === "account" ? "ph:check-bold" : "ph:copy-bold"} width="14" height="14" />
              {copied === "account" ? "Copied" : "Copy"}
            </button>
          </div>
          <Row label="Account name" value={details.accountName} />
          <Row label="Amount" value={`₦${details.amount.toLocaleString()}`} emphasis />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <dt className="text-xs text-text-muted">Reference — customer must include this</dt>
              <dd className="font-mono text-sm font-semibold text-text">{details.reference}</dd>
            </div>
            <button
              onClick={() => copy("ref", details.reference)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-text-muted hover:bg-surface-2 active:scale-95 transition"
            >
              <Icon icon={copied === "ref" ? "ph:check-bold" : "ph:copy-bold"} width="14" height="14" />
              {copied === "ref" ? "Copied" : "Copy"}
            </button>
          </div>
        </dl>

        {details.pooled && (
          <p className="bg-amber-50 border-t border-amber-200 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            This is a shared BMONI collection account, so the reference is what identifies your
            payment. Make sure your customer includes it.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {watching ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Watching for payment...
          </span>
        ) : timedOut ? (
          <span className="text-xs text-text-muted">Stopped watching after 3 minutes.</span>
        ) : (
          <span />
        )}

        <button
          onClick={() => {
            setTimedOut(false);
            startedAt.current = Date.now();
            setWatching(true);
            check(true);
          }}
          disabled={checking}
          className="text-purple-700 hover:text-purple-900 text-xs font-semibold transition-colors disabled:opacity-50 dark:text-purple-300 dark:hover:text-purple-100"
        >
          {checking ? "Checking..." : "Check now"}
        </button>
      </div>

      {ambiguity && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm text-amber-900 dark:text-amber-200">{ambiguity}</p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Confirm with your customer, then record it with the cash button above.
          </p>
        </div>
      )}

      <ErrorNotice message={error} />
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className={`text-text dark:text-text ${emphasis ? "text-lg font-bold" : "font-medium"}`}>
        {value || "—"}
      </dd>
    </div>
  );
}
