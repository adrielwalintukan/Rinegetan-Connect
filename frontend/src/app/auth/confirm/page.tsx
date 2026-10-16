"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

// Supabase's default invite email (templates are locked without custom SMTP) verifies the link
// itself and returns the session in the URL fragment, which only the browser can read.
export default function ConfirmInvitePage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    // Drop the tokens from the address bar and history right away.
    window.history.replaceState(null, "", window.location.pathname);

    const verify = async () => {
      const { error } =
        accessToken && refreshToken
          ? await createBrowserSupabaseClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : { error: true };
      if (error) setFailed(true);
      else window.location.replace("/staff/update-password");
    };
    void verify();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
        {failed ? (
          <>
            <h1 className="text-xl font-bold text-navy">Tautan undangan tidak dapat dipakai</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Tautan ini sudah kedaluwarsa atau sudah pernah dibuka. Gunakan &quot;Lupa password?&quot; dengan email
              yang diundang, atau minta Admin mengirim undangan baru.
            </p>
            <Link
              href="/staff/forgot-password"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-700"
            >
              Lupa password
            </Link>
          </>
        ) : (
          <p role="status" className="text-sm text-slate-600">
            Memverifikasi undangan…
          </p>
        )}
      </section>
    </main>
  );
}
