"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Order } from "../../types/order";
import StatusBadge from "../../components/StatusBadge";
import DashboardLayout from "@/app/Wrapper";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [generatingMsg, setGeneratingMsg] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    setLoading(true);
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json();
    setOrder(data);
    setLoading(false);
  }

  const [paymentInfo, setPaymentInfo] = useState<{
  walletAddress: string;
  amount: number;
  reference: string;
} | null>(null);
const [checking, setChecking] = useState(false);

async function requestPayment() {
  setRequestingPayment(true);
  const res = await fetch("/api/bmoni/create-payment", {
    method: "POST",
    body: JSON.stringify({ orderId: id }),
  });
  const data = await res.json();
  setPaymentInfo(data);
  setRequestingPayment(false);
}

async function checkPayment() {
  setChecking(true);
  const res = await fetch("/api/bmoni/check-payment", {
    method: "POST",
    body: JSON.stringify({ orderId: id }),
  });
  const data = await res.json();
  if (data.paid) {
    fetchOrder(); // refresh to show "Paid" status
  }
  setChecking(false);
}

  async function markDelivered() {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "DELIVERED",
        deliveredAt: new Date().toISOString(),
      }),
    });
    fetchOrder();
  }

  async function generateFollowUp(type: "REMINDER" | "DELIVERY" | "THANKS") {
    setGeneratingMsg(true);
    const res = await fetch("/api/ai/followup", {
      method: "POST",
      body: JSON.stringify({ orderId: id, type }),
    });
    const data = await res.json();
    setFollowUp(data.message);
    setGeneratingMsg(false);
  }

  if (loading || !order) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <DashboardLayout>
    <div className="p-4 space-y-6 pt-4">
      <div>
        <h1 className="text-xl font-bold capitalize">{order.customerName}</h1>
        <p className="text-sm text-gray-500">{order.customerPhone}</p>
      </div>

      <div className="border border-gray-300 rounded-lg p-4 space-y-1 bg-white">
        <p className="font-medium capitalize">{order.item}</p>
        <p className="text-gray-600">₦{order.price.toLocaleString()}</p>
        <StatusBadge status={order.status} />
      </div>

      {/* Payment section */}
      <div className="border border-gray-300 rounded-lg p-4 space-y-2 bg-white">
        <h2 className="font-semibold">Payment</h2>
        {/* {order.status === "PENDING" ? (
          <button
            onClick={requestPayment}
            disabled={requestingPayment}
            className="w-full bg-green-700 text-white py-2 rounded-md"
          >
            {requestingPayment ? "Requesting..." : "Request Payment via BMONI"}
          </button>
        ) : (
          <p className="text-green-700">✓ Paid{order.paidAt ? ` — ${new Date(order.paidAt).toLocaleString()}` : ""}</p>
        )} */}
        {paymentInfo && order.status === "PENDING" && (
  <div className="bg-gray-50 p-3 rounded-md text-sm space-y-2">
    <p><b>Send to:</b> {paymentInfo.walletAddress}</p>
    <p><b>Amount:</b> ₦{paymentInfo.amount}</p>
    <p><b>Reference:</b> {paymentInfo.reference}</p>
    <button
      onClick={checkPayment}
      disabled={checking}
      className="text-green-700 text-xs font-medium"
    >
      {checking ? "Checking..." : "I've sent it — check payment"}
    </button>
  </div>
)}
      </div>

      {/* Delivery section */}
      <div className="border border-gray-300 rounded-lg p-4 space-y-2 bg-white">
        <h2 className="font-semibold">Delivery</h2>
        {order.status === "DELIVERED" ? (
          <p className="text-green-700">✓ Delivered</p>
        ) : (
          <button
            onClick={markDelivered}
            disabled={order.status !== "PAID"}
            className="w-full border border-gray-400 py-2 rounded-md disabled:opacity-40"
          >
            Mark as Delivered
          </button>
        )}
      </div>

      {/* AI Follow-up section */}
      <div className="border rounded-lg p-4 space-y-3 bg-white border-gray-300">
        <h2 className="font-semibold">AI Follow-up</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => generateFollowUp("REMINDER")} className="text-sm border px-3 py-1 rounded-full">
            Payment Reminder
          </button>
          <button onClick={() => generateFollowUp("DELIVERY")} className="text-sm border px-3 py-1 rounded-full">
            Delivery Update
          </button>
          <button onClick={() => generateFollowUp("THANKS")} className="text-sm border px-3 py-1 rounded-full">
            Thank You
          </button>
        </div>
        {generatingMsg && <p className="text-sm text-gray-500">Generating...</p>}
        {followUp && (
          <div className="bg-gray-50 p-3 rounded-md text-sm">
            <p>{followUp}</p>
            <button
              onClick={() => navigator.clipboard.writeText(followUp)}
              className="mt-2 text-green-700 text-xs font-medium"
            >
              Copy message
            </button>
          </div>
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}