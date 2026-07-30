"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { getStoredUser, clearStoredUser, type AuthUser } from "../../lib/auth";
import { useTheme } from "@/lib/use-theme";
import OnboardingStatus from "../components/OnboardingStatus";
import DashboardLayout from "../Wrapper";

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Shared hook rather than a second copy of the DOM logic — the sidebar toggle
  // and this one used to keep separate state and drift out of sync.
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function handleLogout() {
    clearStoredUser();
    setUser(null);
    router.push("/login");
  }

  return (
    <DashboardLayout title="Settings" subtitle="Appearance, account and payment rail.">
      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-6 sm:px-6">
        <div className="rounded-3xl border border-line p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
            Appearance
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface-2 p-5">
            <div>
              <p className="font-semibold text-text">Theme</p>
              <p className="text-sm text-text-muted">
                Market stalls are bright; back rooms are not.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Theme"
              className="flex shrink-0 rounded-full border border-line bg-white p-1"
            >
              {(["light", "dark"] as const).map((option) => (
                <button
                  key={option}
                  role="radio"
                  aria-checked={theme === option}
                  onClick={() => setTheme(option)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                    theme === option
                      ? "bg-cyan text-white shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <Icon
                    icon={option === "dark" ? "ph:moon-fill" : "ph:sun-fill"}
                    width="14"
                    height="14"
                  />
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-line p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
                Account
              </h2>
              <p className="mt-3 font-medium text-text">
                {user ? user.name : "Not signed in"}
              </p>
              <p className="text-sm text-text-muted">
                {user ? user.email : "Log in to see your details."}
              </p>
            </div>
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 rounded-2xl border border-line px-4 py-2.5 text-sm font-semibold text-text-muted transition hover:bg-surface-2"
              >
                Log out
              </button>
            )}
          </div>
        </div>

        <OnboardingStatus />
      </div>
    </DashboardLayout>
  );
}
