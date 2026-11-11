import BackLink from "@/components/ui/BackLink";
import SabbathArticle from "@/components/pages/SabbathArticle";
import SabbathNotes from "@/components/pages/SabbathNotes";
import { formatSabbathDate } from "@/lib/sabbath/format.mjs";

const articleStyle = "mt-8 overflow-x-auto text-lg leading-8 text-slate-700 [overflow-wrap:anywhere] [&_p]:my-5 [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:my-5 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:my-4 [&_h4]:font-semibold [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-sabbath-400 [&_blockquote]:pl-5 [&_code]:whitespace-pre-wrap [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-base [&_th]:border [&_th]:border-navy/20 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-navy/20 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_a]:underline [&_a]:underline-offset-4 [&_a]:text-navy [&_a]:py-3 [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_button]:cursor-pointer [&_button]:font-medium [&_button]:text-navy [&_button]:underline [&_button]:decoration-sabbath-600 [&_button]:decoration-dotted [&_button]:underline-offset-4 [&_button]:py-3 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4";

const linkStyle = "inline-flex min-h-11 items-center rounded-md py-2 font-semibold text-navy underline decoration-sabbath-400 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy";

/** @param {{ snapshot: any, quarterId: string, lessonId?: string, quarterly?: any }} props */
export default function SabbathReader({ snapshot, quarterId, lessonId, quarterly = null }) {
  const base = `/sekolah-sabat/${quarterId}`;
  const available = snapshot.status === "available";
  const data = snapshot.data;
  const daily = available && typeof data?.html === "string";
  const days = daily ? snapshot.lesson.days : data?.days;
  const position = daily ? days.findIndex(day => day.id === data.id) : -1;
  const source = quarterly ? `https://sabbath-school.adventech.io/in/${quarterId}` :
    available ? snapshot.sourceUrl : "https://sabbath-school.adventech.io/in";
  return (
    <section className="px-5 py-12 sm:px-8 lg:py-20" aria-labelledby="reader-title">
      <div className="mx-auto min-w-0 max-w-3xl break-words">
        <BackLink href={lessonId ? `${base}${daily ? `/${lessonId}` : ""}` : "/sekolah-sabat"}>
          {daily ? "Kembali ke daftar hari" : lessonId ? "Kembali ke daftar pelajaran" : "Kembali ke Sekolah Sabat"}
        </BackLink>
        <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-sabbath-700">Sekolah Sabat · Dewasa · Bahasa Indonesia</p>
        <h1 id="reader-title" className="mt-3 font-serif text-3xl leading-tight text-navy sm:text-4xl">{available ? quarterly?.title || data.title : "Materi belum tersedia"}</h1>
        {!available ? <p className="mt-5 leading-relaxed text-slate-700">Materi belum dapat dimuat dari sumber. Coba lagi nanti atau buka sumber resmi. Tidak ada materi pengganti yang dibuat.</p> : <>
          {daily && <p className="mt-3 text-slate-600">{formatSabbathDate(data.date)} · {snapshot.lesson.title}</p>}
          {quarterly ? <ol className="mt-8 divide-y divide-navy/15">{quarterly.lessons.map((lesson, index) => <li key={lesson.id} className="py-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-sabbath-700">Pelajaran {lesson.position ?? index + 1}</p><a className={`${linkStyle} mt-1 text-lg`} href={`${base}/${lesson.id}`}>{lesson.title}</a></li>)}</ol> :
            daily ? <SabbathArticle html={data.html} verses={data.verses} className={articleStyle} /> :
              <ol className="mt-8 divide-y divide-navy/15">{days.map(day => <li key={day.id} className="py-4"><p className="text-sm text-slate-600">{formatSabbathDate(day.date)}</p><a className={linkStyle} href={`${base}/${lessonId}/${day.id}`}>{day.title}</a></li>)}</ol>}
          {daily && <SabbathNotes quarterId={quarterId} lessonId={lessonId} dayId={data.id} dayTitle={data.title} />}
          {daily && <nav aria-label="Navigasi bacaan harian" className="mt-10 flex flex-wrap justify-between gap-4 border-t border-navy/15 pt-5">
            {position > 0 && <a className={linkStyle} href={`${base}/${lessonId}/${days[position - 1].id}`}>Hari sebelumnya</a>}
            {position < days.length - 1 && <a className={linkStyle} href={`${base}/${lessonId}/${days[position + 1].id}`}>Hari berikutnya</a>}
          </nav>}
        </>}
        <footer className="mt-10 border-t border-navy/15 pt-5 text-sm text-slate-600">
          <p>Sumber: Adventech · Bahasa Indonesia</p>
          {quarterly?.credits.map((credit, index) => <p key={index}>{credit.name}: {credit.value}</p>)}
          {available && snapshot.fetchedAt && <p className="mt-2">Diperbarui <time dateTime={snapshot.fetchedAt}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(snapshot.fetchedAt))} WITA</time></p>}
          <a className={`${linkStyle} mt-2`} href={source} rel="noopener noreferrer">Buka materi di Adventech</a>
        </footer>
      </div>
    </section>
  );
}
