"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { Order } from "./types/order";
import Navbar from "./components/Navbar";
import StatusBadge from "./components/StatusBadge";
import OrderForm from "./components/OrderForm";

export default function Home() {
  const [navbar, setNavbar] = useState(false);
  const [insights, setInsights] = useState<string>("");
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string; orderId: string } | null>(null);

  async function fetchAnomaly() {
    try {
      const res = await fetch("/api/ai/anomaly");
      const data = await res.json();
      if (data.hasAlert) {
        setAlert({ message: data.message, orderId: data.orderId });
      }
    } catch (err) {
      console.error("Anomaly check error:", err);
    }
  }
  async function fetchBalance() {
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/bmoni/balance");
      if (!res.ok) throw new Error("Failed to fetch balance");
      const data = await res.json();
      // Adjust this line once you see the real response shape from BMONI —
      // placeholder assumes a `balances` array with a currency + amount field
      const ngnBalance = data.balances?.find((b: any) => b.currency === "CNGN" || b.currency === "NGN");
      setBalance(ngnBalance?.balance ?? 0);
    } catch (err) {
      console.error("Balance fetch error:", err);
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }
  useEffect(() => {
    fetchOrders();
    fetchInsights();
    fetchBalance();
    fetchAnomaly();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const res = await fetch("/api/orders");
    const data = await res.json();
    setAllOrders(data);
    setLoading(false);
  }

  async function fetchInsights() {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/ai/insights");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setInsights(data.summary);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
      setInsights("Unable to load insights. Please try again later.");
    } finally {
      setInsightsLoading(false);
    }
  }

  const recentOrders = allOrders.slice(0, 5);

  const stats = [
    {
      title: "Total Orders",
      stat: allOrders.length,
      link: "/orders",
      icon: "ph:receipt-bold",
    },
    {
      title: "Paid Orders",
      stat: allOrders.filter((o) => o.status === "PAID" || o.status === "DELIVERED").length,
      link: "/orders?filter=PAID",
      icon: "ph:check-circle-bold",
    },
    {
      title: "Pending Orders",
      stat: allOrders.filter((o) => o.status === "PENDING").length,
      link: "/orders?filter=PENDING",
      icon: "ph:clock-bold",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9F9] lg:flex font-body">
      <Navbar setNavbar={setNavbar} navbar={navbar} isDesktop />

      <div className="flex-1">
        <div className="mx-auto max-w-[1800px]">
          <div className="flex flex-col gap-8 py-6 pt-0">
            <header className="bg-white/80 backdrop-blur-sm flex justify-between items-center pt-12 px-4 sm:px-6 pb-6 border-b border-slate-100 -mt-6 gap-12 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <img src="/tracko.svg" alt="logo" className="w-[26px] h-[26px]" />
                <h2 className="text-2xl font-display font-bold tracking-tight text-slate-900">Tracko</h2>
              </div>
              <div className="pe-3 flex items-center gap-3 sm:gap-4">
                <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
                  <Icon icon="iconamoon:notification-thin" width="22" height="22" className="text-slate-500" />
                </button>
                <button onClick={() => setNavbar(true)} className="lg:hidden p-2 rounded-full hover:bg-slate-100 transition-colors">
                  <Icon icon="material-symbols-light:menu" width="24" height="24" className="text-slate-600" />
                </button>
              </div>
            </header>

            <div className="px-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-2xl text-slate-900 tracking-tight">Dashboard</h3>
                  <p className="text-sm text-slate-400 mt-1">Here's what's happening with your sales</p>

                </div>
                <div className="px-4 sm:px-6">
                  <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-3 flex items-start justify-between">
                    <div className="">

                      {balanceLoading ? (
                        <div className="h-7 w-32 bg-slate-100 rounded-md animate-pulse mt-1.5" />
                      ) : balance !== null ? (
                        <h3 className="font-display font-bold text-2xl text-slate-900 mt-0.5">
                          ₦{balance.toLocaleString()}
                        </h3>
                      ) : (
                        <p className="text-sm text-red-500 mt-1">Unable to load balance</p>
                      )}
                      <span className="text-xs text-nowrap font-semibold uppercase tracking-wide text-slate-400">
                        BMONI Wallet Balance
                      </span>
                    </div>
                    {/* <div className="w-11 -mt-2 h-11 rounded-xl bg-[#2adadd1a] flex items-center justify-center">
                      <Icon icon="ph:wallet-bold" width="20" height="20" className="text-[#176C77]" />
                    </div> */}
                  </div>
                </div>
              </div>
              {alert && (
                <div className="px-4 sm:px-6">
                  <Link
                    href={`/orders/${alert.orderId}`}
                    className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100/60 transition-colors"
                  >
                    <Icon icon="ph:warning-fill" width="20" height="20" className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Unusual Activity
                      </p>
                      <p className="text-sm text-amber-800 mt-0.5">{alert.message}</p>
                    </div>
                  </Link>
                </div>
              )}
              <div className="relative overflow-hidden rounded-2xl mt-6 shadow-lg shadow-teal-900/10">
                <div className="absolute inset-0 bg-gradient-to-br from-[#2ADADD] via-[#1B9AA3] to-[#176C77]" />
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute -right-2 bottom-[-40px] w-28 h-28 rounded-full bg-white/10" />

                <div className="relative py-5 px-5 sm:px-6">
                  <div className="flex items-center gap-1.5 text-white/70 text-xs font-semibold uppercase tracking-wide mb-2">
                    <Icon icon="ph:sparkle-fill" width="14" height="14" />
                    AI Insight
                  </div>

                  {insightsLoading ? (
                    <div className="space-y-2 py-1">
                      <div className="h-4 bg-white/25 rounded-full animate-pulse w-[90%]" />
                      <div className="h-4 bg-white/25 rounded-full animate-pulse w-[60%]" />
                    </div>
                  ) : (
                    <p className="text-white font-medium text-[16px] sm:text-[18px] leading-snug max-w-[85%]">
                      {insights}
                    </p>
                  )}

                  <button
                    onClick={fetchInsights}
                    disabled={insightsLoading}
                    className="inline-flex items-center gap-1.5 bg-[#FFBB01] mt-4 text-[12px] rounded-lg font-semibold px-3 py-2 shadow-sm hover:brightness-105 active:scale-[0.98] transition disabled:opacity-60 text-slate-900"
                  >
                    <Icon
                      icon="ph:arrows-clockwise-bold"
                      width="14"
                      height="14"
                      className={insightsLoading ? "animate-spin" : ""}
                    />
                    {insightsLoading ? "Refreshing" : "Refresh Insight"}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6">
              <h2 className="font-display font-bold text-lg text-slate-900">Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
                {stats.map((item, index) => (
                  <Link
                    href={item.link}
                    className="group bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-[#2ADADD]/40 transition-all py-4 px-4 flex flex-col gap-2 rounded-2xl w-full relative"
                    key={index}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#2adadd1a] flex items-center justify-center">
                      <Icon icon={item.icon} width="18" height="18" className="text-[#176C77]" />
                    </div>
                    {loading ? (
                      <div className="h-8 w-12 bg-slate-100 rounded-md animate-pulse mt-1" />
                    ) : (
                      <h3 className="font-display font-bold text-3xl leading-none text-slate-900">{item.stat}</h3>
                    )}
                    <span className="text-sm font-medium text-slate-500">{item.title}</span>
                    <Icon
                      icon="iconamoon:arrow-right-2-bold"
                      width={18}
                      height={18}
                      className="absolute right-4 top-4 text-slate-300 group-hover:text-[#2ADADD] group-hover:translate-x-0.5 transition-all"
                    />
                  </Link>
                ))}
              </div>

            </div>

            <div className="px-4 sm:px-6 pb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-slate-900">Recent Orders</h3>
                <Link href="/orders" className="text-xs font-semibold text-[#176C77] hover:underline">
                  View all
                </Link>
              </div>

              <div className="mt-4 w-full overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
                <table className="w-full table-auto border-collapse text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Customer</th>
                      <th className="px-6 py-3.5">Item</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-100 rounded animate-pulse" /></td>
                          <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                          <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" /></td>
                          <td className="px-6 py-4"></td>
                        </tr>
                      ))
                    ) : recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                          <Icon icon="ph:package" width="28" height="28" className="mx-auto mb-2 text-slate-300" />
                          No orders yet — tap + to add your first one.
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{order.customerName}</td>
                          <td className="px-6 py-4 text-slate-500">{order.item}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/orders/${order.id}`}
                              className="inline-flex items-center gap-1 font-medium text-[#176C77] hover:text-[#0f4f57] text-xs"
                            >
                              Details
                              <Icon icon="ph:arrow-right" width="12" height="12" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="fixed bottom-6 right-6 bg-[#2adadd] p-4 rounded-full shadow-lg shadow-teal-900/20 hover:brightness-105 active:scale-95 transition-all"
          >
            <Icon icon="ph:plus-bold" width={24} height={24} className="text-white" />
          </button>
        </div>
      </div>

      <Navbar setNavbar={setNavbar} navbar={navbar} />

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
  );
}