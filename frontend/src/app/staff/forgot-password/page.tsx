import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          GMAHK Rinegetan
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Reset password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Masukkan email staf. Jika alamat terdaftar, instruksi pemulihan akan dikirim.
        </p>
        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
        <a
          className="mt-6 inline-flex text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline"
          href="/staff/login"
        >
          Kembali ke login
        </a>
      </section>
    </main>
  );
}
