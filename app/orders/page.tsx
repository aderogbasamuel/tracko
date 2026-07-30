"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Order, OrderStatus } from "../types/order";
import StatusBadge from "../components/StatusBadge";
import OrderForm from "../components/OrderForm";
import DashboardLayout from "../Wrapper";

type FilterTab = "ALL" | OrderStatus;

const TABS: FilterTab[] = ["ALL", "PENDING", "PAID", "DELIVERED"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  }

  const filteredOrders =
    filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900">
              Orders
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {loading ? "Loading..." : `${filteredOrders.length} order${filteredOrders.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 bg-[#2adadd] hover:brightness-105 active:scale-[0.98] transition text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm"
          >
            <Icon icon="ph:plus-bold" width="14" height="14" />
            New Order
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                filter === tab
                  ? "bg-[#2adadd] text-white border-[#2adadd]"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-3 bg-white animate-pulse">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-slate-100 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-4 w-14 bg-slate-100 rounded ml-auto" />
                    <div className="h-5 w-16 bg-slate-100 rounded-full ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Icon icon="ph:package" width="32" height="32" className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">
              {filter === "ALL" ? "No orders yet — tap New Order to add one." : `No ${filter.toLowerCase()} orders.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block border border-slate-100 rounded-xl p-3.5 hover:shadow-sm hover:border-slate-200 bg-white transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold capitalize text-slate-900">{order.customerName}</p>
                    <p className="text-sm text-slate-500">{order.item}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      ₦{order.price.toLocaleString()}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
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