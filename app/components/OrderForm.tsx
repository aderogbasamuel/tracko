"use client";

import { useState } from "react";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({ customerName, customerPhone, item, price }),
    });

    if (!res.ok) {
      setError("Something went wrong. Try again.");
      setSaving(false);
      return;
    }

    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <h2 className="text-lg font-bold">New Order</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Customer name</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="w-full border rounded-md p-2 text-sm capitalize"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Customer phone</label>
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
              className="w-full border rounded-md p-2 text-sm capitalize"
              placeholder="+234..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Item</label>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              required
              className="w-full border rounded-md p-2 text-sm capitalize"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Price (₦)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full border rounded-md p-2 text-sm capitalize"
            />
          </div>

          {error && <p className="text-red-600 text-xs">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border py-2 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#2adadd] text-white py-2 rounded-md text-sm"
            >
              {saving ? "Saving..." : "Save Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}