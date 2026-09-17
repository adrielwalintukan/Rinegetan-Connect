import React from "react";
import { Bell, Calendar } from "lucide-react";
import type { Announcement } from "@/types/content";

export interface AnnouncementBannerProps {
  announcements: Announcement[];
}

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
      aria-label="Warta Jemaat & Pengumuman Terbaru"
      className="bg-sabbath-50 border-y border-sabbath-200/70 py-3.5 px-4"
    >
      <div className="container-site flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy text-sabbath-400 shadow-sm">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.6875rem] font-bold uppercase tracking-wider text-sabbath-700 bg-sabbath-100 px-2 py-0.5 rounded">
                Warta Jemaat
              </span>
              <h3 className="font-semibold text-sm text-navy truncate">
                {latest.title}
              </h3>
            </div>
            {latest.body && (
              <p className="text-xs text-slate-600 truncate max-w-xl mt-0.5">
                {latest.body}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono shrink-0">
          <Calendar className="h-3.5 w-3.5 text-sabbath-600" aria-hidden="true" />
          <span>
            {new Date(latest.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </aside>
  );
};
