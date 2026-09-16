export default function StaffHomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Rinegetan Connect
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Portal staf
        </h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Anda telah masuk ke area staf. Fitur pengelolaan konten akan tersedia
          pada sprint CMS berikutnya.
        </p>
      </div>
      <form action="/auth/signout" method="post">
        <button
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          type="submit"
        >
          Keluar
        </button>
      </form>
    </main>
  );
}
