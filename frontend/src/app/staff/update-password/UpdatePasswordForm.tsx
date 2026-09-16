"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password harus memiliki minimal 8 karakter.");
      return;
    }

    if (password !== confirmation) {
      setError("Konfirmasi password belum sama.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await createBrowserSupabaseClient().auth.updateUser({
      password,
    });

    if (updateError) {
      setError("Password belum dapat diperbarui. Silakan minta tautan baru.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/staff");
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div>
        <label className="text-sm font-semibold text-slate-800" htmlFor="new-password">
          Password baru
        </label>
        <input
          autoComplete="new-password"
          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          id="new-password"
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-800" htmlFor="confirm-password">
          Ulangi password
        </label>
        <input
          autoComplete="new-password"
          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          id="confirm-password"
          minLength={8}
          name="confirmation"
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
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
        {isSubmitting ? "Menyimpan…" : "Simpan password"}
      </button>
    </form>
  );
}
