"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Order } from "../types/order";
import StatusBadge from "../components/StatusBadge";
import OrderForm from "../components/OrderForm";
import DashboardLayout from "../Wrapper";
import ErrorNotice from "../components/ErrorNotice";
import { amountOutstanding, daysLate, displayStatus, type DisplayStatus } from "@/lib/credit";

type FilterTab = "ALL" | DisplayStatus;

const TABS: FilterTab[] = ["ALL", "OVERDUE", "CREDIT", "PENDING", "PARTIALLY_PAID", "PAID", "DELIVERED"];

const TAB_LABELS: Record<FilterTab, string> = {
  ALL: "All",
  OVERDUE: "Overdue",
  CREDIT: "On credit",
  PENDING: "Pending",
  PARTIALLY_PAID: "Part paid",
  PAID: "Paid",
  DELIVERED: "Delivered",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Could not load your orders.");
      setOrders(await res.json());
    } catch (err: any) {
      setError(err?.message ?? "Could not load your orders.");
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders =
    filter === "ALL" ? orders : orders.filter((o) => displayStatus(o) === filter);

  return (
    <DashboardLayout
      title="Orders"
      subtitle={
        loading
          ? "Loading..."
          : `${filteredOrders.length} order${filteredOrders.length === 1 ? "" : "s"}`
      }
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]"
        >
          <Icon icon="ph:plus-bold" width="14" height="14" />
          New Order
        </button>
      }
    >
      <div className="w-full space-y-5 px-4 pt-5 sm:px-6">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                filter === tab
                  ? "bg-cyan text-white border-cyan"
                  : "border-line text-text-muted hover:border-line-strong"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <ErrorNotice message={error} onRetry={fetchOrders} />

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-line rounded-xl p-3 bg-white animate-pulse">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-surface-2 rounded" />
                    <div className="h-3 w-20 bg-surface-2 rounded" />
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-4 w-14 bg-surface-2 rounded ml-auto" />
                    <div className="h-5 w-16 bg-surface-2 rounded-full ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-text-soft">
            <Icon icon="ph:package" width="32" height="32" className="mx-auto mb-2 text-text-soft" />
            <p className="text-sm">
              {filter === "ALL"
                ? "No orders yet — tap New Order to add one."
                : `No ${TAB_LABELS[filter].toLowerCase()} orders.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => {
              const owing = amountOutstanding(order);
              const late = daysLate(order);
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block border border-line rounded-xl p-3.5 hover:shadow-sm hover:border-line bg-white transition-all"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold capitalize text-text truncate">
                        {order.customerName}
                      </p>
                      <p className="text-sm text-text-muted truncate">{order.item}</p>
                    </div>
                    <div className="text-right space-y-1 shrink-0">
                      <p className="text-sm font-semibold text-text">
                        ₦{order.price.toLocaleString()}
                      </p>
                      <StatusBadge status={displayStatus(order)} daysLate={late} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-1.5">
                    <p className="text-xs text-text-soft">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    {owing > 0 && (
                      <p className="text-xs font-medium text-text-muted">
                        ₦{owing.toLocaleString()} owing
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {showModal && (
          <OrderForm
            onClose={() => setShowModal(false)}
            onCreated={() => {
              setShowModal(false);
              fetchOrders();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}