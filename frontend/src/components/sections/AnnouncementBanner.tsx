import React from "react";
import { Bell, Calendar } from "lucide-react";
import type { Announcement } from "@/types/content";

export interface AnnouncementBannerProps {
  announcements: Announcement[];
}

/**
 * Joins the Sabbath marquee as one navy announcement zone: latest item first, then the ticker.
 */
export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcements,
}) => {
  if (!announcements || announcements.length === 0) {
    return null;
  }

  const latest = announcements[0];

  return (
    <aside
      data-testid="announcement-banner"
      aria-label="Pengumuman jemaat terbaru"
      className="bg-navy text-white"
    >
      <div className="container-site flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sabbath-400/40 text-sabbath-400">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-sabbath-400">
              Pengumuman Jemaat
            </p>
            <h2 className="mt-1 break-words font-serif text-lg italic leading-snug text-white sm:text-xl">
              {latest.title}
            </h2>
            {latest.body && (
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-300">
                {latest.body}
              </p>
            )}
          </div>
        </div>
        <p className="flex shrink-0 items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-slate-300">
          <Calendar className="h-3.5 w-3.5 text-sabbath-400" aria-hidden="true" />
          <time dateTime={latest.created_at}>
            {new Date(latest.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </time>
        </p>
      </div>
    </aside>
  );
};
