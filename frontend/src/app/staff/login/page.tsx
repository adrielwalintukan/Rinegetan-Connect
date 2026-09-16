import { safeNextPath } from "@/lib/auth/redirect";

import LoginForm from "./LoginForm";

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const nextPath = safeNextPath(firstValue(params.next));
  const error = firstValue(params.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          GMAHK Rinegetan
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Masuk staf
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Gunakan email dan password yang diberikan oleh Admin.
        </p>
        {error === "unauthorized" ? (
          <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Akun ini tidak memiliki akses staf aktif.
          </p>
        ) : error === "callback" ? (
          <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Tautan autentikasi tidak valid atau sudah kedaluwarsa.
          </p>
        ) : null}
        <div className="mt-8">
          <LoginForm nextPath={nextPath} />
        </div>
        <a
          className="mt-6 inline-flex text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline"
          href="/staff/forgot-password"
        >
          Lupa password?
        </a>
      </section>
    </main>
  );
}
