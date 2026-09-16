"use client";

import { type FormEvent, useState } from "react";

import { safeNextPath } from "@/lib/auth/redirect";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email dan password perlu diisi.");
      return;
    }

    setIsSubmitting(true);
    const { error: signInError } = await createBrowserSupabaseClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("Email atau password tidak dapat diverifikasi. Periksa kembali data Anda.");
      setIsSubmitting(false);
      return;
    }

    window.location.assign(safeNextPath(nextPath));
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div>
        <label className="text-sm font-semibold text-slate-800" htmlFor="staff-email">
          Email
        </label>
        <input
          autoComplete="email"
          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          id="staff-email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-800" htmlFor="staff-password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          id="staff-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>
      {error ? (
        <p aria-live="polite" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <button
        className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
