"use client";

import { type FormEvent, useState } from "react";

import {
  AUTH_CALLBACK_PATH,
  PASSWORD_UPDATE_PATH,
} from "@/lib/auth/redirect";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const callbackUrl = new URL(AUTH_CALLBACK_PATH, window.location.origin);
    callbackUrl.searchParams.set("next", PASSWORD_UPDATE_PATH);
    await createBrowserSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callbackUrl.toString(),
    });

    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
        Jika email terdaftar, instruksi reset password akan segera terkirim.
      </p>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div>
        <label className="text-sm font-semibold text-slate-800" htmlFor="reset-email">
          Email
        </label>
        <input
          autoComplete="email"
          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          id="reset-email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <button
        className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Mengirim…" : "Kirim instruksi"}
      </button>
    </form>
  );
}
