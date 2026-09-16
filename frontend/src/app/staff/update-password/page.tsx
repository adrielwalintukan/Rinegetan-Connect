import UpdatePasswordForm from "./UpdatePasswordForm";

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          GMAHK Rinegetan
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Buat password baru
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Gunakan minimal 8 karakter. Setelah tersimpan, Anda akan diarahkan ke portal staf.
        </p>
        <div className="mt-8">
          <UpdatePasswordForm />
        </div>
      </section>
    </main>
  );
}
