"use client";

import { useEffect, useState } from "react";
import { getStoredUser, clearStoredUser } from "../../lib/auth";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [theme, setTheme] = useState("light");
  const router = useRouter();

  useEffect(() => {
    setUser(getStoredUser());
    const next = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(next);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    if (next === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    setTheme(next);
    localStorage.setItem("theme", next);
  };

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
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="mt-2 text-slate-500">Manage appearance and account preferences.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-2xl bg-[#2adadd] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
          >
            Log out
          </button>
        </div>

        <div className="mt-10 space-y-6">
          <div className="rounded-3xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Theme</h2>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl bg-slate-50 p-5">
              <div>
                <p className="text-slate-900 font-semibold">Appearance</p>
                <p className="text-sm text-slate-500">Switch between light and dark mode.</p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                {theme === "dark" ? "Dark" : "Light"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Account</h2>
            <div className="mt-4 text-slate-700">
              <p>{user ? user.name : "Guest"}</p>
              <p className="text-sm text-slate-500">{user ? user.email : "Not signed in"}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
