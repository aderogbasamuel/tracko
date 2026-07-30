"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Order } from "../../types/order";
import StatusBadge from "../../components/StatusBadge";
import DashboardLayout from "@/app/Wrapper";

interface PaymentInfo {
  walletAddress: string;
  amount: number;
  reference: string;
}

type FollowUpType = "REMINDER" | "DELIVERY" | "THANKS";

const FOLLOW_UP_LABELS: Record<FollowUpType, string> = {
  REMINDER: "Payment Reminder",
  DELIVERY: "Delivery Update",
  THANKS: "Thank You",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment states
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Delivery state
  const [updatingDelivery, setUpdatingDelivery] = useState(false);

  // AI follow-up states
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      const data = await res.json();
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id, fetchOrder]);

  async function requestPayment() {
    setRequestingPayment(true);
    try {
      const res = await fetch("/api/bmoni/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPaymentInfo(data);
      console.log("Payment request successful:", data);
    } catch (err) {
      console.error("Payment request error:", err);
    } finally {
      setRequestingPayment(false);
    }
  }

  async function checkPayment() {
    setCheckingPayment(true);
    try {
      const res = await fetch("/api/bmoni/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });
      const data = await res.json();
      if (data.paid) await fetchOrder();
    } catch (err) {
      console.error("Payment check error:", err);
    } finally {
      setCheckingPayment(false);
    }
  }

  async function markDelivered() {
    setUpdatingDelivery(true);
    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DELIVERED",
          deliveredAt: new Date().toISOString(),
        }),
      });
      await fetchOrder();
    } catch (err) {
      console.error("Delivery update error:", err);
    } finally {
      setUpdatingDelivery(false);
    }
  }

  async function generateFollowUp(type: FollowUpType) {
    setGeneratingMsg(true);
    try {
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, type }),
      });
      const data = await res.json();
      setFollowUp(data.message);
    } catch (err) {
      console.error("AI follow-up error:", err);
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
        <div className="max-w-2xl mx-auto p-6 space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded-md w-1/3" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-32 bg-gray-200 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-6 text-center text-gray-500">
          Order not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 capitalize">
              {order.customerName}
            </h1>
            <p className="text-sm font-medium text-gray-500">{order.customerPhone}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Item details */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Item Details
          </span>
          <div className="flex justify-between items-baseline pt-1">
            <h2 className="text-lg font-semibold text-gray-800 capitalize">{order.item}</h2>
            <span className="text-xl font-bold text-gray-900">
              ₦{order.price.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900">Payment</h2>
            {order.status !== "PENDING" && (
              <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                ✓ Paid {order.paidAt && `• ${new Date(order.paidAt).toLocaleDateString()}`}
              </span>
            )}
          </div>

          {order.status === "PENDING" && !paymentInfo && (
            <button
              onClick={requestPayment}
              disabled={requestingPayment}
              className="w-full bg-gradient-to-r from-purple-900 to-purple-600 hover:opacity-90 text-white font-medium py-2.5 px-4 rounded-lg transition-opacity disabled:opacity-50 text-sm shadow-sm"
            >
              {requestingPayment ? "Requesting..." : "Request Payment via BMONI"}
            </button>
          )}

          {paymentInfo && order.status === "PENDING" && (
            <div className="bg-gray-50 border border-gray-200/80 p-4 rounded-lg text-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-600">
                <div>
                  <span className="block text-xs text-gray-400 font-medium">AMOUNT</span>
                  <span className="font-semibold text-gray-900">
                    ₦{paymentInfo.amount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-medium">REFERENCE</span>
                  <span className="font-mono text-gray-900">{paymentInfo.reference}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-medium">SEND TO</span>
                  <span className="font-mono text-xs text-gray-900 break-all">
                    {paymentInfo.walletAddress}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-end">
                <button
                  onClick={checkPayment}
                  disabled={checkingPayment}
                  className="text-purple-700 hover:text-emerald-800 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {checkingPayment ? "Checking..." : "I've sent it — check payment"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delivery */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Delivery</h2>
          {order.status === "DELIVERED" ? (
            <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              ✓ Delivered
            </span>
          ) : (
            <button
              onClick={markDelivered}
              disabled={order.status !== "PAID" || updatingDelivery}
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-white text-sm"
            >
              {updatingDelivery ? "Updating..." : "Mark as Delivered"}
            </button>
          )}
        </div>

        {/* AI follow-up */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">AI Follow-up</h2>
            {generatingMsg && (
              <span className="text-xs text-gray-400 animate-pulse">Generating draft...</span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {(Object.keys(FOLLOW_UP_LABELS) as FollowUpType[]).map((type) => (
              <button
                key={type}
                onClick={() => generateFollowUp(type)}
                disabled={generatingMsg}
                className="text-xs font-medium border border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
              >
                {FOLLOW_UP_LABELS[type]}
              </button>
            ))}
          </div>

          {followUp && (
            <div className="relative bg-gray-50 border border-gray-200/60 p-4 rounded-lg text-sm text-gray-700 space-y-3">
              <p className="leading-relaxed whitespace-pre-wrap">{followUp}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => handleCopy(followUp)}
                  className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  {copied ? "✓ Copied to clipboard" : "Copy message"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}