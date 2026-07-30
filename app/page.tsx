"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { Order } from "./types/order";
import type { Insights } from "./types/insights";
import StatusBadge from "./components/StatusBadge";
import OrderForm from "./components/OrderForm";
import ErrorNotice from "./components/ErrorNotice";
import DailySummaryButton from "./components/DailySummaryButton";
import DashboardLayout from "./Wrapper";
import { amountOutstanding, buildCreditBook, daysLate, displayStatus } from "@/lib/credit";

export default function Home() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState("");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState("");
  const [alert, setAlert] = useState<{ message: string; orderId: string } | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchInsights();
    fetchBalance();
    fetchAnomaly();
  }, []);

  async function fetchAnomaly() {
    try {
      const res = await fetch("/api/ai/anomaly");
      const data = await res.json();
      if (data.hasAlert) setAlert({ message: data.message, orderId: data.orderId });
    } catch {
      // Deliberately silent: the anomaly banner is an extra warning, not a
      // feature the trader asked for. An error toast here would be noise on
      // every flaky connection.
    }
  }

  async function fetchBalance() {
    setBalanceLoading(true);
    setBalanceError("");
    try {
      const res = await fetch("/api/bmoni/balance");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not load your BMONI balance.");
      setBalance(typeof data.balance === "number" ? data.balance : null);
      if (data.balance === null) setBalanceError("BMONI could not read your balance.");
    } catch (err: any) {
      setBalanceError(err?.message ?? "Could not load your BMONI balance.");
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }

  async function fetchOrders() {
    setLoading(true);
    setOrdersError("");
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Could not load your orders.");
      setAllOrders(await res.json());
    } catch (err: any) {
      setOrdersError(err?.message ?? "Could not load your orders.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchInsights() {
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const res = await fetch("/api/ai/insights");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not load your insights.");
      setInsights(data.insights);
    } catch (err: any) {
      setInsightsError(err?.message ?? "Could not load your insights.");
      setInsights(null);
    } finally {
      setInsightsLoading(false);
    }
  }

  const recentOrders = allOrders.slice(0, 5);
  const creditBook = buildCreditBook(allOrders);

  const stats = [
    {
      title: "Owed to you",
      stat: `₦${creditBook.totalOutstanding.toLocaleString()}`,
      link: "/orders?filter=CREDIT",
      icon: "ph:hand-coins-bold",
    },
    {
      title: "Overdue debts",
      stat: String(creditBook.overdue.length),
      link: "/orders?filter=OVERDUE",
      icon: "ph:warning-circle-bold",
    },
    {
      title: "Total orders",
      stat: String(allOrders.length),
      link: "/orders",
      icon: "ph:receipt-bold",
    },
  ];

  return (
    <DashboardLayout title="Dashboard" subtitle="Here's what's happening with your sales">
      <div className="space-y-6 px-4 pt-6 sm:px-6">
        {/* Wallet + daily summary sit together: both are "state of the business
            right now" rather than per-order actions. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            {balanceLoading ? (
              <div className="h-8 w-32 animate-pulse rounded-md bg-surface-2" />
            ) : balance !== null ? (
              <p className="font-display text-2xl font-bold text-text">
                ₦{balance.toLocaleString()}
              </p>
            ) : (
              <button
                onClick={fetchBalance}
                title={balanceError}
                className="text-left text-sm text-red-600 underline underline-offset-2 dark:text-red-400"
              >
                Balance unavailable — retry
              </button>
            )}
            <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wide text-text-soft">
              BMONI wallet balance
            </span>
          </div>

          <DailySummaryButton />
        </div>

        {alert && (
          <Link
            href={`/orders/${alert.orderId}`}
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100/60 dark:border-amber-900/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
          >
            <Icon
              icon="ph:warning-fill"
              width="20"
              height="20"
              className="mt-0.5 shrink-0 text-amber-500"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Unusual activity
              </p>
              <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">{alert.message}</p>
            </div>
          </Link>
        )}

        {/* AI insight */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg shadow-teal-900/10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2ADADD] via-[#1B9AA3] to-[#176C77]" />
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -right-2 bottom-[-40px] h-28 w-28 rounded-full bg-white/10" />

          <div className="relative px-5 py-5 sm:px-6">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
              <Icon icon="ph:sparkle-fill" width="14" height="14" />
              AI insight
            </div>

            {insightsLoading ? (
              <div className="space-y-2 py-1">
                <div className="h-4 w-[90%] animate-pulse rounded-full bg-white/25" />
                <div className="h-4 w-[60%] animate-pulse rounded-full bg-white/25" />
              </div>
            ) : insightsError ? (
              <p className="max-w-[90%] text-[15px] font-medium leading-snug text-white/90">
                {insightsError}
              </p>
            ) : insights ? (
              <div className="space-y-3">
                <p className="max-w-[90%] text-[16px] font-semibold leading-snug text-white sm:text-[18px]">
                  {insights.headline}
                </p>

                {insights.cashFlow && (
                  <p className="max-w-[90%] text-sm leading-snug text-white/85">
                    {insights.cashFlow}
                  </p>
                )}

                {insights.risks.length > 0 && (
                  <div className="space-y-1.5 rounded-xl bg-black/15 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                      Credit risk
                    </p>
                    {insights.risks.map((risk, i) => (
                      <p key={i} className="text-sm leading-snug text-white/90">
                        <span className="font-semibold capitalize">{risk.customer}</span>
                        {" — "}
                        {risk.evidence}
                      </p>
                    ))}
                  </div>
                )}

                {insights.actions.length > 0 && (
                  <ol className="space-y-1.5">
                    {insights.actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/95">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{action}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ) : null}

            <button
              onClick={fetchInsights}
              disabled={insightsLoading}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-[12px] font-semibold text-text shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
            >
              <Icon
                icon="ph:arrows-clockwise-bold"
                width="14"
                height="14"
                className={insightsLoading ? "animate-spin" : ""}
              />
              {insightsLoading ? "Refreshing" : "Refresh insight"}
            </button>
          </div>
        </div>

        <ErrorNotice message={ordersError} onRetry={fetchOrders} />

        {/* Overview */}
        <div>
          <h2 className="font-display text-lg font-bold text-text">
            Overview
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {stats.map((item) => (
              <Link
                href={item.link}
                key={item.title}
                className="group relative flex w-full flex-col gap-2 rounded-2xl border border-line bg-white px-4 py-4 shadow-sm transition-all hover:border-cyan/40 hover:shadow-md dark:hover:border-cyan/40"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan/10">
                  <Icon icon={item.icon} width="18" height="18" className="text-teal" />
                </div>
                {loading ? (
                  <div className="mt-1 h-8 w-16 animate-pulse rounded-md bg-surface-2" />
                ) : (
                  <h3 className="font-display text-2xl font-bold leading-none text-text sm:text-3xl">
                    {item.stat}
                  </h3>
                )}
                <span className="text-sm font-medium text-text-muted">
                  {item.title}
                </span>
                <Icon
                  icon="iconamoon:arrow-right-2-bold"
                  width={18}
                  height={18}
                  className="absolute right-4 top-4 text-text-soft transition-all group-hover:translate-x-0.5 group-hover:text-cyan"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Credit book — the debts a trader carries in their head, made visible. */}
        {!loading && creditBook.totalOutstanding > 0 && (
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-text">
                Credit book
              </h2>
              <span className="text-sm text-text-muted">
                ₦{creditBook.totalOutstanding.toLocaleString()} outstanding
              </span>
            </div>

            {creditBook.overdue.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-red-100 bg-surface shadow-sm dark:border-red-900/40">
                <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2.5 dark:border-red-900/40 dark:bg-red-950/30">
                  <Icon
                    icon="ph:clock-countdown-bold"
                    width="16"
                    height="16"
                    className="text-red-600 dark:text-red-400"
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                    Overdue — chase these first
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {creditBook.overdue.slice(0, 5).map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/orders/${order.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium capitalize text-text">
                            {order.customerName}
                          </p>
                          <p className="truncate text-xs text-text-muted">
                            {order.item}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-text">
                            ₦{amountOutstanding(order).toLocaleString()}
                          </p>
                          <p className="text-xs font-medium text-red-600 dark:text-red-400">
                            {daysLate(order)} day{daysLate(order) === 1 ? "" : "s"} late
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                Nothing overdue. Every debt is still within its agreed date.
              </p>
            )}

            {creditBook.customers.some((c) => c.timesTookCredit > 0) && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                <div className="border-b border-line bg-surface-2 px-4 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
                    Who pays, who drags
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {creditBook.customers
                    .filter((c) => c.timesTookCredit > 0)
                    .slice(0, 6)
                    .map((c) => (
                      <li
                        key={c.customerName}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium capitalize text-text">
                            {c.customerName}
                            {c.isRisky && (
                              <span className="ml-2 inline-block rounded-full bg-red-100 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-400">
                                Risky
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-text-muted">
                            {c.timesTookCredit} credit sale{c.timesTookCredit === 1 ? "" : "s"}
                            {c.timesPaidLate > 0 && ` · paid late ${c.timesPaidLate}×`}
                            {c.timesCurrentlyOverdue > 0 && ` · ${c.timesCurrentlyOverdue} overdue now`}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-text">
                          {c.outstanding > 0 ? `₦${c.outstanding.toLocaleString()}` : "—"}
                        </p>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Recent orders */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-text">
              Recent orders
            </h2>
            <Link
              href="/orders"
              className="text-xs font-semibold text-teal hover:underline dark:text-cyan"
            >
              View all
            </Link>
          </div>

          <div className="mt-4 w-full overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
            <table className="w-full table-auto border-collapse text-left text-sm text-text-muted">
              <thead className="border-b border-line bg-surface-2 text-[11px] font-semibold uppercase tracking-wide text-text-soft">
                <tr>
                  <th className="px-4 py-3.5 sm:px-6">Customer</th>
                  <th className="hidden px-4 py-3.5 sm:table-cell sm:px-6">Item</th>
                  <th className="px-4 py-3.5 sm:px-6">Status</th>
                  <th className="px-4 py-3.5 sm:px-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
                      </td>
                      <td className="hidden px-4 py-4 sm:table-cell sm:px-6">
                        <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="h-5 w-16 animate-pulse rounded-full bg-surface-2" />
                      </td>
                      <td />
                    </tr>
                  ))
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-text-soft">
                      <Icon
                        icon="ph:package"
                        width="28"
                        height="28"
                        className="mx-auto mb-2 text-text-soft"
                      />
                      No orders yet — tap + to add your first one.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-surface-2"
                    >
                      <td className="px-4 py-4 font-medium capitalize text-text sm:px-6">
                        {order.customerName}
                      </td>
                      <td className="hidden px-4 py-4 text-text-muted sm:table-cell sm:px-6">
                        {order.item}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <StatusBadge status={displayStatus(order)} daysLate={daysLate(order)} />
                      </td>
                      <td className="px-4 py-4 text-right sm:px-6">
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:text-teal-deep dark:text-cyan"
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
        aria-label="New order"
        className="fixed bottom-6 right-6 z-30 rounded-full bg-cyan p-4 shadow-lg shadow-teal-900/20 transition-all hover:brightness-105 active:scale-95"
      >
        <Icon icon="ph:plus-bold" width={24} height={24} className="text-white" />
      </button>

      {showModal && (
        <OrderForm
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            fetchOrders();
          }}
        />
      )}
    </DashboardLayout>
  );
}
