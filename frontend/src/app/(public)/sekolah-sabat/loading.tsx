// Shown at once on navigation: the page waits on the Adventech catalog, which can take seconds when its cache is cold.
export default function Loading() {
  return (
    <section data-testid="sekolah-sabat-loading" className="py-16 lg:py-24">
      <div className="container-site" role="status" aria-live="polite">
        <p className="label-eyebrow">Sekolah Sabat</p>
        <span className="sr-only">Memuat pelajaran Sekolah Sabat…</span>
        <div aria-hidden="true" className="mt-5 animate-pulse motion-reduce:animate-none">
          <div className="h-10 w-3/4 max-w-xl rounded-lg bg-navy/10 sm:h-12" />
          <div className="mt-5 h-4 w-full max-w-2xl rounded bg-navy/[0.07]" />
          <div className="mt-2.5 h-4 w-2/3 max-w-xl rounded bg-navy/[0.07]" />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-xl border border-navy/[0.08] bg-white" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
