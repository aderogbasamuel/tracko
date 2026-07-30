"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { Order } from "../../types/order";
import StatusBadge from "../../components/StatusBadge";
import ErrorNotice from "../../components/ErrorNotice";
import PaymentPanel from "../../components/PaymentPanel";
import DashboardLayout from "@/app/Wrapper";
import { amountOutstanding, daysLate, displayStatus, isSettled } from "@/lib/credit";
import { whatsAppLink } from "@/lib/whatsapp";

type FollowUpType = "PAYMENT_REMINDER" | "DELIVERY_UPDATE" | "RESTOCK_NUDGE";

const FOLLOW_UP_LABELS: Record<FollowUpType, string> = {
  PAYMENT_REMINDER: "Payment reminder",
  DELIVERY_UPDATE: "Delivery update",
  RESTOCK_NUDGE: "Restock nudge",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deliveryError, setDeliveryError] = useState("");

  // Delivery state
  const [updatingDelivery, setUpdatingDelivery] = useState(false);

  // Cash collected in person, including part payments
  const [cashAmount, setCashAmount] = useState("");
  const [recordingCash, setRecordingCash] = useState(false);
  const [cashError, setCashError] = useState("");

  // AI follow-up states
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [followUpError, setFollowUpError] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not load this order.");
      setOrder(data);
    } catch (err: any) {
      setLoadError(err?.message ?? "Could not load this order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id, fetchOrder]);

  async function recordCash() {
    setRecordingCash(true);
    setCashError("");
    try {
      const res = await fetch(`/api/orders/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: cashAmount }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? "Could not record the payment.");
      setCashAmount("");
      await fetchOrder();
    } catch (err: any) {
      setCashError(err?.message ?? "Could not record the payment.");
    } finally {
      setRecordingCash(false);
    }
  }

  async function markDelivered() {
    setUpdatingDelivery(true);
    setDeliveryError("");
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not mark this as delivered.");
      await fetchOrder();
    } catch (err: any) {
      setDeliveryError(err?.message ?? "Could not mark this as delivered.");
    } finally {
      setUpdatingDelivery(false);
    }
  }

  async function generateFollowUp(type: FollowUpType) {
    setGeneratingMsg(true);
    setFollowUpError("");
    try {
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, type }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not draft the message.");
      setFollowUp(data.message);
    } catch (err: any) {
      setFollowUpError(err?.message ?? "Could not draft the message.");
      setFollowUp(null);
    } finally {
      setGeneratingMsg(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 animate-pulse">
          <div className="h-8 bg-line-strong rounded-md w-1/3" />
          <div className="h-24 bg-line-strong rounded-xl" />
          <div className="h-32 bg-line-strong rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
          <ErrorNotice
            message={loadError || "This order could not be found."}
            onRetry={loadError ? fetchOrder : undefined}
          />
          <Link href="/orders" className="inline-block text-sm font-semibold text-teal dark:text-cyan">
            ← Back to orders
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const settled = isSettled(order);
  const owing = amountOutstanding(order);
  const late = daysLate(order);
  // Built here, in the browser, from the stored number — never sent to the model.
  const waLink = followUp ? whatsAppLink(order.customerPhone, followUp) : null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text capitalize">
              {order.customerName}
            </h1>
            <p className="text-sm font-medium text-text-muted">{order.customerPhone}</p>
          </div>
          <StatusBadge status={displayStatus(order)} daysLate={late} />
        </div>

        {/* Item details */}
        <div className="bg-white border border-line rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-soft">
            Item Details
          </span>
          <div className="flex justify-between items-baseline pt-1">
            <h2 className="text-lg font-semibold text-text capitalize">{order.item}</h2>
            <span className="text-xl font-bold text-text">
              ₦{order.price.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white border border-line rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-text">Payment</h2>
            {settled && (
              <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full dark:bg-emerald-950/40 dark:text-emerald-300">
                ✓ Paid {order.paidAt && `• ${new Date(order.paidAt).toLocaleDateString()}`}
              </span>
            )}
          </div>

          {!settled && (
            <div className="rounded-lg bg-surface-2 border border-line p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-text-muted">Balance owed</span>
                <span className="text-lg font-bold text-text">
                  ₦{owing.toLocaleString()}
                </span>
              </div>
              {order.amountPaid > 0 && (
                <p className="text-xs text-text-muted">
                  ₦{order.amountPaid.toLocaleString()} of ₦{order.price.toLocaleString()} received
                  so far.
                </p>
              )}
              {order.dueDate && (
                <p className={`text-xs font-medium ${late > 0 ? "text-red-600" : "text-text-muted"}`}>
                  {late > 0
                    ? `Was due ${new Date(order.dueDate).toLocaleDateString()} — ${late} day${late === 1 ? "" : "s"} late.`
                    : `Due ${new Date(order.dueDate).toLocaleDateString()}.`}
                </p>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <input
                  type="number"
                  min="1"
                  step="any"
                  inputMode="decimal"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder={`Cash received (max ₦${owing.toLocaleString()})`}
                  className="flex-1 border border-line-strong rounded-md p-2 text-sm bg-white"
                />
                <button
                  onClick={recordCash}
                  disabled={recordingCash || !cashAmount}
                  className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-40"
                >
                  {recordingCash ? "Saving..." : "Record cash"}
                </button>
              </div>
              <ErrorNotice message={cashError} />
            </div>
          )}

          <PaymentPanel order={order} onPaid={fetchOrder} />
        </div>

        {/* Delivery */}
        <div className="bg-white border border-line rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-text">Delivery</h2>
          {order.status === "DELIVERED" ? (
            <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full dark:bg-emerald-950/40 dark:text-emerald-300">
              ✓ Delivered
            </span>
          ) : (
            <button
              onClick={markDelivered}
              disabled={!settled || updatingDelivery}
              title={settled ? undefined : "Settle the outstanding balance first"}
              className="w-full bg-white border border-line-strong hover:bg-surface-2 text-text-muted font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-white text-sm dark:disabled:hover:bg-slate-800"
            >
              {updatingDelivery ? "Updating..." : "Mark as Delivered"}
            </button>
          )}
          <ErrorNotice message={deliveryError} />
        </div>

        {/* AI follow-up */}
        <div className="bg-white border border-line rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">AI Follow-up</h2>
            {generatingMsg && (
              <span className="text-xs text-text-soft animate-pulse">Generating draft...</span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {(Object.keys(FOLLOW_UP_LABELS) as FollowUpType[]).map((type) => (
              <button
                key={type}
                onClick={() => generateFollowUp(type)}
                disabled={generatingMsg}
                className="text-xs font-medium border border-line bg-surface-2 hover:bg-surface-2 text-text-muted px-3.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
              >
                {FOLLOW_UP_LABELS[type]}
              </button>
            ))}
          </div>

          <ErrorNotice message={followUpError} />

          {followUp && (
            <div className="relative bg-surface-2 border border-line/60 p-4 rounded-lg text-sm text-text-muted space-y-3 dark:border-line/60">
              <p className="leading-relaxed whitespace-pre-wrap">{followUp}</p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => handleCopy(followUp)}
                  className="inline-flex items-center text-xs font-semibold text-text-muted hover:text-text transition-colors px-2 py-2"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
                {waLink ? (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-105 active:scale-95 transition"
                  >
                    <Icon icon="ph:whatsapp-logo-fill" width="15" height="15" />
                    Send on WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-text-soft">
                    No valid phone number — copy the message instead.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}