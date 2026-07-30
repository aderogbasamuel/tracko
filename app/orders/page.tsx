"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Order, OrderStatus } from "../types/order";
import StatusBadge from "../components/StatusBadge";
import OrderForm from "../components/OrderForm";
import DashboardLayout from "../Wrapper";

type FilterTab = "ALL" | OrderStatus;

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

  const tabs: FilterTab[] = ["ALL", "PENDING", "PAID", "DELIVERED"];

  return (
    <DashboardLayout>
    <div className="p-4 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Orders</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#2adadd] text-white text-sm px-3 py-2 rounded-md"
        >
          + New Order
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${
              filter === tab
                ? "bg-[#2adadd] text-white border-[#2adadd]"
                : "border-gray-300 text-gray-600"
            }`}
          >
            {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : filteredOrders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block border rounded-lg p-3 hover:bg-gray-50 bg-white transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold capitalize">{order.customerName}</p>
                  <p className="text-sm text-gray-500">{order.item}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-medium">
                    ₦{order.price.toLocaleString()}
                  </p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
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