"use client";

import { useState } from "react";

/** Default credit terms for a market trader: settle within two weeks. */
function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export default function OrderForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [isCredit, setIsCredit] = useState(false);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [amountPaid, setAmountPaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const priceValue = parseFloat(price) || 0;
  const depositValue = parseFloat(amountPaid) || 0;
  const outstanding = Math.max(0, priceValue - depositValue);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          item,
          price,
          isCredit,
          dueDate: isCredit ? dueDate : null,
          amountPaid: isCredit ? amountPaid : "",
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error ?? "Something went wrong. Try again.");
        setSaving(false);
        return;
      }

      onCreated();
    } catch {
      setError("No connection. Check your network and try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-text">New Order</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted">Customer name</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="w-full border border-line-strong rounded-md p-2 text-sm capitalize"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Customer phone</label>
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
              inputMode="tel"
              className="w-full border border-line-strong rounded-md p-2 text-sm"
              placeholder="+234..."
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Item</label>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              required
              className="w-full border border-line-strong rounded-md p-2 text-sm capitalize"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Price (₦)</label>
            <input
              type="number"
              min="1"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              inputMode="decimal"
              className="w-full border border-line-strong rounded-md p-2 text-sm"
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-line p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isCredit}
              onChange={(e) => setIsCredit(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#2adadd]"
            />
            <span>
              <span className="block text-sm font-medium text-text">Sold on credit</span>
              <span className="block text-xs text-text-muted">
                Customer takes the goods now and pays later.
              </span>
            </span>
          </label>

          {isCredit && (
            <div className="space-y-3 rounded-lg bg-surface-2 p-3">
              <div>
                <label className="text-xs text-text-muted">Payment due by</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full border border-line-strong rounded-md p-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted">Deposit paid now (₦) — optional</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full border border-line-strong rounded-md p-2 text-sm bg-white"
                />
              </div>
              {priceValue > 0 && (
                <p className="text-xs text-text-muted">
                  Balance owed:{" "}
                  <span className="font-semibold text-text">
                    ₦{outstanding.toLocaleString()}
                  </span>
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 text-xs dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-line-strong py-2 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-cyan text-white py-2 rounded-md text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
