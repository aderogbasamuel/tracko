"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { getStoredUser, type AuthUser } from "../../lib/auth";
import { Order } from "../types/order";
import DashboardLayout from "../Wrapper";
import ErrorNotice from "../components/ErrorNotice";
import { amountOutstanding, buildCreditBook, isSettled } from "@/lib/credit";

/**
 * The trader's business profile. Deliberately different from /settings, which
 * previously duplicated this page's name/email card and logout button —
 * settings changes configuration, this answers "how is my business doing".
 */
export default function AccountPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setUser(getStoredUser());
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [ordersRes, balanceRes] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/bmoni/balance").catch(() => null),
      ]);
      if (!ordersRes.ok) throw new Error("Could not load your business data.");
      setOrders(await ordersRes.json());

      if (balanceRes?.ok) {
        const data = await balanceRes.json();
        setBalance(typeof data.balance === "number" ? data.balance : null);
      }
    } catch (err: any) {
      setError(err?.message ?? "Could not load your business data.");
    } finally {
      setLoading(false);
    }
  }

  const book = buildCreditBook(orders);
  const collected = orders.filter(isSettled).reduce((sum, o) => sum + o.price, 0);
  const customers = new Set(orders.map((o) => o.customerName.trim().toLowerCase())).size;

  const stats = [
    { label: "Customers", value: String(customers), icon: "ph:users-three-bold" },
    { label: "Orders", value: String(orders.length), icon: "ph:receipt-bold" },
    { label: "Collected", value: `₦${collected.toLocaleString()}`, icon: "ph:check-circle-bold" },
    {
      label: "Still owed",
      value: `₦${book.totalOutstanding.toLocaleString()}`,
      icon: "ph:hand-coins-bold",
    },
  ];

  const initials = (user?.name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <DashboardLayout title="Account" subtitle="Who you are and how the business is doing.">
      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-6 sm:px-6">
        <ErrorNotice message={error} onRetry={load} />

        <div className="rounded-3xl border border-line p-6">
          {user ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan text-lg font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-text">
                  {user.name}
                </p>
                <p className="truncate text-sm text-text-muted">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-text">
                  You are not signed in.
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  Your orders are still here — signing in just personalises this page.
                </p>
              </div>
              <Link
                href="/login"
                className="shrink-0 rounded-2xl bg-cyan px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Log in
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan/10">
                <Icon icon={stat.icon} width="18" height="18" className="text-teal" />
              </div>
              {loading ? (
                <div className="mt-3 h-7 w-20 animate-pulse rounded bg-surface-2" />
              ) : (
                <p className="mt-3 font-display text-xl font-bold text-text sm:text-2xl">
                  {stat.value}
                </p>
              )}
              <p className="mt-0.5 text-sm text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-line p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
                BMONI wallet
              </h2>
              {loading ? (
                <div className="mt-3 h-8 w-32 animate-pulse rounded bg-surface-2" />
              ) : balance !== null ? (
                <p className="mt-3 font-display text-2xl font-bold text-text">
                  ₦{balance.toLocaleString()}
                </p>
              ) : (
                <p className="mt-3 text-sm text-text-muted">
                  Balance unavailable.
                </p>
              )}
              <p className="mt-1 text-sm text-text-muted">
                Money customers have paid you through Tracko.
              </p>
            </div>
            <Link
              href="/settings"
              className="shrink-0 rounded-2xl border border-line px-4 py-2.5 text-sm font-semibold text-text-muted transition hover:bg-surface-2"
            >
              Rail status
            </Link>
          </div>
        </div>

        {!loading && book.overdue.length > 0 && (
          <Link
            href="/orders?filter=OVERDUE"
            className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 transition-colors hover:bg-red-100/60 dark:border-red-900/40 dark:bg-red-950/30 dark:hover:bg-red-950/50"
          >
            <div className="flex items-center gap-2.5">
              <Icon icon="ph:warning-circle-fill" width="20" height="20" className="text-red-500" />
              <p className="text-sm text-red-800 dark:text-red-300">
                {book.overdue.length} overdue debt{book.overdue.length === 1 ? "" : "s"} worth ₦
                {book.overdue
                  .reduce((sum, o) => sum + amountOutstanding(o), 0)
                  .toLocaleString()}
              </p>
            </div>
            <Icon
              icon="ph:arrow-right"
              width="16"
              height="16"
              className="shrink-0 text-red-500"
            />
          </Link>
        )}
      </div>
    </DashboardLayout>
  );
}
