"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { signup, storeUser } from "../../lib/auth";
import AuthShell, { AuthField } from "../components/AuthShell";
import ErrorNotice from "../components/ErrorNotice";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signup(name, email, password, phone);
      storeUser(result.user);
      // Straight into BMONI onboarding — an account without a wallet cannot
      // take money, so there is no useful state in between.
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign up.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your Tracko account"
      subtitle="Track every sale, know who owes you, and get paid into a real bank account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Full name">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Ada Okonkwo"
            className="auth-input"
          />
        </AuthField>

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

        <AuthField label="Business phone" hint="Used for your BMONI wallet and daily summary.">
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
            placeholder="08031234567"
            className="auth-input"
          />
        </AuthField>

        <AuthField label="Password" hint="At least 8 characters.">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
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
              Creating account...
            </>
          ) : (
            <>
              Create account
              <Icon icon="ph:arrow-right-bold" width="15" height="15" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-teal hover:underline dark:text-cyan">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
