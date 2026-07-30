"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredUser, getStoredUser } from "../../lib/auth";

export default function AccountPage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const handleLogout = () => {
    clearStoredUser();
    setUser(null);
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-lg shadow-slate-200/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Account</h1>
            <p className="mt-2 text-slate-500">Your account details and profile settings.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-2xl bg-[#2adadd] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
          >
            Log out
          </button>
        </div>

        {user ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Name</h2>
              <p className="mt-3 text-slate-900 text-lg font-semibold">{user.name}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Email</h2>
              <p className="mt-3 text-slate-900 text-lg font-semibold">{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <p className="font-medium">No user is signed in yet.</p>
            <p className="mt-2 text-sm text-amber-700">Please log in to view account details.</p>
          </div>
        )}
      </div>
    </main>
  );
}
