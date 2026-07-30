"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { login, storeUser } from "../../lib/auth";
import AuthShell, { AuthField } from "../components/AuthShell";
import ErrorNotice from "../components/ErrorNotice";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      storeUser(result.user);
      // A trader without a BMONI wallet cannot be paid, so finish onboarding first.
      router.push(result.user.bmoniUserId ? "/" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see who owes you and what to chase today.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="auth-input"
          />
        </AuthField>

        <AuthField label="Password">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="auth-input"
          />
        </AuthField>

        <ErrorNotice message={error} />

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal/25 transition hover:bg-teal-mid active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Icon icon="ph:spinner-bold" width="16" height="16" className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <Icon icon="ph:arrow-right-bold" width="15" height="15" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-sm text-text-muted">
        New to Tracko?{" "}
        <Link href="/signup" className="font-semibold text-teal hover:underline dark:text-cyan">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
